import { storage, emitter, openByIframeAndWaitForClose, TIMEOUT_ERROR, notifications, openByIframe, waitEventWithPromise, IFRAME_LIFETIME, setNotificationLevel, NOTIFICATION_LEVEL } from './utils'
import { addActivityItems, updateActivityItemsStatus, addSuccessActivityList, getActivityItems, getSuccessActivityItems, clearActivityItems } from './db'
import { settingConfig, USER_STATUS, ACTIVITY_STATUS, INIT_KEYWORD_MASKS } from './config'
import { updateTaskInfo, defaultTasks, getAllTasks, commonTasks, TASK_ID} from './tasks'
import { DateTime } from 'luxon'


window.runtime = {
	taskId: -1,
	doneTask: 0,
	totalTask: 0,
	applyingActivityIds: [],
	taskQueue:[],
	taskIdStack :[]
}
window.loginStatus = {
	status: USER_STATUS.UNKNOWN,
	description: '正在获取登录状态',
	shortDescription: '正在检查',
	timestamp: 0,
}
window.saveinfo = { //reset every day
	followVenderNum: -1,
	applidActivityNum: 0,
	fulfilled: false,
	noMoreVender: false,
	day: -1
}
function savePersistentData() {
	storage.set({ loginStatus: loginStatus })
	storage.set({ saveinfo: saveinfo })
}
function reset() {
	// console.log('reset now')
	// chrome.storage.local.clear()
	storage.set({ keywordMasks: INIT_KEYWORD_MASKS })
	storage.set({ settings: settingConfig })
	for (let task of defaultTasks) {
		updateTaskInfo(task)
	}
}
chrome.runtime.onInstalled.addListener(function (object) {
	reset()
})
chrome.alarms.onAlarm.addListener(function (alarm) {
	switch (true) {
		case alarm.name === 'daily':
			checkAndResetDailyInfo()
			savePersistentData()
			break
		case alarm.name.startsWith('scheduled_'):
			console.log(alarm.name)
			const when = alarm.name.split('_')[1]
			getAutoTasks(when).then(runTask)
			break
		case alarm.name === 'leak_filling':
			joinTaskInQueue(TASK_ID.ACTIVITY_APPLY, true)
			break
		default:
			// console.warn(`unknown alarm:${alarm.name}`)
			break
	}
})

chrome.notifications.onClicked.addListener(function (notificationId) {
	if (!notificationId || notificationId.split('_').length < 0) {
		return
	}
	const action = notificationId.split('_')[1]
	switch (action) {
		case 'login-fail':
			chrome.tabs.create({
				url: "https://passport.jd.com/new/login.aspx",
				active: true
			})
			break
		default:
			// console.warn(`unknown notificationId:${notificationId}`)
			break
	}
})

// 消息处理
function backgroundMessageListener(msg, sender, sendResponse) {
	switch (msg.action) {
		//from content-script
		case 'bg_update_saveinfo':
			saveinfo = Object.assign(saveinfo, msg.data)  //should check key?
			if (saveinfo.fulfilled) {
				saveinfo.applidActivityNum = 300
			}
			if (saveinfo.noMoreVender) {
				saveinfo.followVenderNum = 500
			}
			break
		case 'bg_activity_applied':
			if (msg.status) {
				updateActivityItemsStatus(msg.activityId, { status: ACTIVITY_STATUS.APPLIED })
			}
			if (msg.success) {
				saveinfo.applidActivityNum++
			}
			emitter.emit(`${msg.activityId}_activity_applied_event`)
			sendMessage({
				action: "popup_update_activity_status",
				activityId: msg.activityId,
				status: msg.status
			})
			break
		case 'bg_login_status_retrieval':
			loginStatus = Object.assign(loginStatus, msg.loginStatus)
			emitter.emit('login_status_retrieval_event', { login: msg.status })
			updateBrowserAction()
			break

		case 'bg_new_activity_retrieval':
			if (msg.activityList.length) {
				addActivityItems(msg.activityList)
			}
			emitter.emit(msg.href + '_new_activity_retrieval_event', {pageNum:msg.pageNum})
			break

		case 'success_activity_retrieval':
			if (msg.successActivityList.length !== 0) {
				addSuccessActivityList(msg.successActivityList)
			}
			emitter.emit(msg.href + '_success_activity_retrieval_event', {pageNum:msg.pageNum})
			break
		case 'bg_follow_vender_num_retrieval':
			if (saveinfo.noMoreVender && msg.followVenderNum < saveinfo.followVenderNum) {
				saveinfo.noMoreVender = false   //update info
			}
			saveinfo.followVenderNum = msg.followVenderNum
			emitter.emit('bg_follow_vender_num_retrieval_event')

			if (runtime.taskId === TASK_ID.EMPTY_FOLLOW_VENDER_LIST) { //清空关注列表
				runtime.doneTask = runtime.totalTask - saveinfo.followVenderNum
				if (saveinfo.followVenderNum === 0) {
					emitter.emit('empty_follow_vender_list_event')
				}
			}
			break
		case 'bg_get_login_status':
			sendResponse(loginStatus)
			break

		case 'bg_task_opt':
			const act = getTaskActionsByHref(msg.data)
			sendResponse(act)
			break

		//from popup.html
		//
		case 'bg_scheduled_task':
			initScheduledTasks()
			break
		case 'bg_clear_sql_activitys':
			clearActivityItems()
			break

		case 'bg_update_browser_action':
			updateBrowserAction(msg.force)
			break
		case 'reset':
			chrome.storage.local.clear()
			chrome.runtime.reload()
			break
		default:
			if (msg.action.startsWith('popup')) {
				chrome.runtime.sendMessage(msg)
			}
			break
	}
}
chrome.runtime.onMessage.addListener(backgroundMessageListener)

function getTaskActionsByHref(data) {

	const now = DateTime.local().valueOf()
	const href = data.href
	for (let task of defaultTasks) {
		if (task.id !== runtime.taskId) continue
		for (let ptn of task.href_patterns) {
			if (href.search(ptn) >= 0) { //&& now >= task.last_run_at + task.auto.frequency){
				return task.actions
			}
		}
	}
	for (let task of commonTasks) {
		for (let ptn of task.href_patterns) {
			if (href.search(ptn) >= 0) {
				return task.actions
			}
		}
	}
	return undefined
}


// ---------------- 获取关注店铺数量 ----------------//
async function followVenderNumberRetrieval() {
	console.log(`followVenderNumberRetrieval`)

	switchTaskId(TASK_ID.FOLLOW_VENDER_NUM_RETRIEVAL)
	runtime.totalTask = 1
	runtime.doneTask = 1
	const url = 'https://t.jd.com/follow/vender/list.do?index=1'
	const eventName = 'bg_follow_vender_num_retrieval_event'
	const result = await openByIframeAndWaitForClose(url, eventName, IFRAME_LIFETIME * 2)
	if (result === TIMEOUT_ERROR) {
		notifications('获取关注数量超时')
	}
	else{
		notifications(`获取关注数量完成，一共关注了${saveinfo.followVenderNum}个店铺`)
	}
	taskDone()
}

// ---------------- 清空关注店铺 ----------------//
async function emptyFollowVenderList() {
	switchTaskId(TASK_ID.EMPTY_FOLLOW_VENDER_LIST)
	runtime.doneTask = 0
	runtime.totalTask = saveinfo.followVenderNum > 0 ? saveinfo.followVenderNum : 500

	const url = 'https://t.jd.com/follow/vender/list.do'
	const eventName = 'empty_follow_vender_list_event'
	await openByIframeAndWaitForClose(url, eventName, 5 * 60 * 1000) // 保留 iframe 五分钟
	notifications(`已完成清理关注店铺列表，当前关注数量为${saveinfo.followVenderNum}`)
	taskDone()
}

// ---------------- 获取成功列表 ----------------//
async function successActivityRetrieval() {

	switchTaskId(TASK_ID.SUCCESS_ACTIVITY_RETRIEVAL)
	runtime.doneTask = 0
	runtime.totalTask = 1

	for (let i = 1; i <= runtime.totalTask; i++) {
		runtime.doneTask++
		const url = `https://try.jd.com/user/myTrial?page=${i}&selected=2`
		const eventName = `${url}_success_activity_retrieval_event`
		let res = await openByIframeAndWaitForClose(url, eventName)
		if(res == TIMEOUT_ERROR){
			continue
		}
		runtime.totalTask = res.pageNum
	}
	notifications('成功项目的检索完毕')
	taskDone()
}


// ---------------- 获取试用列表 ----------------//
async function activityRetrieval() {

	//实际上，商品检索并不需要登录
	//所以这里不检查登录状态

	let settings = {}

	await storage.get({ 'settings': [] }).then(res => { settings = res.settings })
	let cidsList = []
	let activityTypeList = []

	for (let activityBtn of settings[0].btns) { //  商品类型
		if (activityBtn.selected) {
			console.log(`即将搜索 ${activityBtn.text} 商品`)
			cidsList.push(activityBtn.value)
		}
	}
	for (let applyBtn of settings[1].btns) { // 试用类型
		if (applyBtn.selected) {
			console.log(`即将搜索 ${applyBtn.text} 试用类型`)
			activityTypeList.push(applyBtn.value)
		}
	}

	if (!cidsList.length) {
		cidsList.push(null)
	}
	if (!activityTypeList.length) {
		activityTypeList.push(null)
	}

	switchTaskId(TASK_ID.ACTIVITY_RETRIEVAL)
	runtime.doneTask = 0
	runtime.totalTask = cidsList.length * activityTypeList.length


	for (let cids of cidsList) {
		for (let activityType of activityTypeList) {
			runtime.doneTask++
			await activityRetrievalByCondition(cids, activityType)
		}
	}
	console.log('本次搜索完毕')
	notifications('搜索并导入数据库完毕')
	taskDone()
}


async function activityRetrievalByCondition(cids, activityType) {
	console.log(`正在获取 cids:${cids} activityType:${activityType} 类型商品`)
	let pageNum = 1

	for (let i = 1; i <= pageNum; i++) {
		const url = `https://try.jd.com/activity/getActivityList?page=${i}${cids ? '&cids=' + cids : ''}${activityType ? '&activityType=' + activityType : ''}`
		const eventName = `${url}_new_activity_retrieval_event`
		let res = await openByIframeAndWaitForClose(url, eventName)
		if(res === TIMEOUT_ERROR){
			continue
		}
		pageNum = res.pageNum
	}
}

// ---------------- 商品试用申请 ----------------//
async function activityApply(activity){

	if(activity === undefined){
		const items = await getActivityItems(1)
		activity = items.filter(item => {
			return item.status === ACTIVITY_STATUS.APPLY
		})
	}

	const unSatisfyCondition = ()=> {
		if (saveinfo.fulfilled) {
			notifications('今日申请试用份额已满，不再进行试用申请')
			return true
		}
		if (saveinfo.noMoreVender) {
			notifications('关注数超过上限了哦，请及时清理')
			return true
		}
		return false
	}

	if (unSatisfyCondition()) {
		return
	}

	switchTaskId(TASK_ID.ACTIVITY_APPLY)
	runtime.doneTask = 0
	runtime.totalTask = activity.length ? activity.length : 1
	console.log(`即将申请 ${activity.length} 个商品`)

	runtime.applyingActivityIds.length = 0
	for (const item of activity) {
		runtime.applyingActivityIds.push(
			item.id
		)
	}

	for (const item of activity) {
		const eventName = `${item.id}_activity_applied_event`

		let cnt = 1
		if(item.try) cnt = item.try + 1
		updateActivityItemsStatus(item.id, {try:cnt})

		await openByIframeAndWaitForClose(item.url, eventName)
		runtime.applyingActivityIds.shift()

		runtime.doneTask++
		if (unSatisfyCondition()) {
			break
		}
	}

	console.log('商品试用执行完毕')
	if (activity.length > 1) {
		notifications(`申请完毕，今日已申请${saveinfo.applidActivityNum}个商品`)
	}

	runtime.applyingActivityIds.length = 0
	taskDone()
}

// ---------------- 获取登陆状态 ----------------//
async function loginStatusRetrieval(retry = 0) {
	if (retry >= 2) { // 最多重试两次
		loginStatus.description = '请检查网络状态'
		loginStatus.shortDescription = '检查超时'
		loginStatus.status = USER_STATUS.UNKNOWN
		loginStatus.timestamp = DateTime.local().valueOf()
		notifications('检查登录状态失败，请检查网络状态后重试', 'login-fail', NOTIFICATION_LEVEL.INFO)
		return false
	}

	switchTaskId(TASK_ID.CHECK_OR_DO_LOGIN_OPT)
	const url = 'https://try.jd.com/'
	const eventName = `login_status_retrieval_event`
	const result = await openByIframeAndWaitForClose(url, eventName, IFRAME_LIFETIME)
	taskDone()

	if (result === TIMEOUT_ERROR) {
		return loginStatusRetrieval(retry + 1)
	}
	return result.login
}

async function checkLoginStatusValid() {
	console.log(`checkLoginStatusValid`)
	if (loginStatus.status !== USER_STATUS.LOGIN
		|| DateTime.local().valueOf() > loginStatus.timestamp + 30 * 60 * 1000) {//半小时

		loginStatus = Object.assign(loginStatus, {
			status: USER_STATUS.WARMING,
			description: '正在获取登录状态',
			shortDescription: '正在检查',
			timestamp: 0,
		})
		return loginStatusRetrieval()
	}
	return true
}

function checkAndResetDailyInfo() {
	const day = DateTime.local().day
	console.log(`reset daily info, today:${day}, saveinfo.day:${saveinfo.day}`)
	if (day !== saveinfo.day) {
		saveinfo.day = day
		saveinfo.fulfilled = false
		saveinfo.applidActivityNum = 0
		initScheduledTasks()
	}

	chrome.alarms.clear('leak_filling')
	chrome.alarms.create('daily', {
		when: DateTime.local().plus({ day: 1 }).set({
			hour: 0,
			minute: 1,
			second: 0,
		}).valueOf()
	})
}
window.joinTaskInQueue = function(task, run=false, data={}){
	let id = task
	if(typeof (task) === 'object'){
		task.last_run_at = DateTime.local().valueOf()
		updateTaskInfo(task)
		id = task.id
	}
	switch (id) {
		case TASK_ID.FOLLOW_VENDER_NUM_RETRIEVAL:
			runtime.taskQueue.push(checkLoginStatusValid)
			runtime.taskQueue.push(followVenderNumberRetrieval)
			break
		case TASK_ID.EMPTY_FOLLOW_VENDER_LIST:
			runtime.taskQueue.push(checkLoginStatusValid)
			runtime.taskQueue.push(emptyFollowVenderList)
			break
		case TASK_ID.ACTIVITY_RETRIEVAL:
			runtime.taskQueue.push(activityRetrieval)
			break
		case TASK_ID.SUCCESS_ACTIVITY_RETRIEVAL:
			runtime.taskQueue.push(checkLoginStatusValid)
			runtime.taskQueue.push(successActivityRetrieval)
			break
		case TASK_ID.ACTIVITY_APPLY:
			if(data.activity){
				runtime.taskQueue.push(async ()=>{await activityApply(data.activity)})
			}
			else{
				runtime.taskQueue.push(checkLoginStatusValid)
				runtime.taskQueue.push(activityApply)
				runtime.taskQueue.push(followVenderNumberRetrieval)
			}
			break
		case TASK_ID.CHECK_OR_DO_LOGIN_OPT:
			runtime.taskQueue.push(checkLoginStatusValid)
		default:
			break
	}
	if(run){
		runTask()
	}
}

async function getAutoTasks(when) {
	
	runtime.taskQueue.push(loginStatusRetrieval)
	runtime.taskQueue.push(()=>{setNotificationLevel(NOTIFICATION_LEVEL.INFO)})
	
	const allTasks = await getAllTasks()

	const now = DateTime.local()

	for (let task of allTasks) {
		if (task.auto.run !== true || when != task.auto.when) { // must use !=
			continue
		}
		if (task.auto.frequency === 'daily' && now.day === DateTime.fromMillis(task.last_run_at).day) {
			console.log('当天已执行 ', task)
			continue  //已经执行过了
		}
		joinTaskInQueue(task)

		// 一个小时后，尝试再次执行 ACTIVITY_APPLY
		if(task.id === TASK_ID.ACTIVITY_APPLY){
			chrome.alarms.create('leak_filling', {
				when: DateTime.local().plus({ hour: 2 }) .valueOf()
			})
		}


	}
	runtime.taskQueue.push(()=>{setNotificationLevel(NOTIFICATION_LEVEL.NORMAL)})
	console.log(`join all task in taskQueue`)
}

window.runTask = async function(){
	if(runtime.taskQueue.length === 0 || runtime.taskId !== -1){
		console.log(`runtask err, taskQueue.length:${runtime.taskQueue.length}, taskId:${runtime.taskId}`)
		return
	}

	switchTaskId(TASK_ID.RUNNING)
	while(runtime.taskQueue.length !== 0){
		const task = runtime.taskQueue.shift()
		if(await task() === false){
			console.warn(task)
			console.warn(`任务执行失败`)
			runtime.taskQueue.length = 0
		}
	}
	taskDone()
}

function switchTaskId(taskId){
	runtime.taskIdStack.push(runtime.taskId)
	runtime.taskId = taskId
}
function taskDone() {
	console.log(`taskid: ${runtime.taskId} done`)
	if(runtime.taskIdStack.length){
		runtime.taskId = runtime.taskIdStack.pop()
	}
	else{
		console.warn(`runtime.taskIdStack empty`)
		runtime.taskId = -1
	}
	savePersistentData()
	emitter.emit('taskDone')
}

//------------------------------------------------------------------//

async function initScheduledTasks() {
	//每次加载插件会执行一次
	//每天执行一次
	//每次更新自动任务执行一次

	for (let i = 0; i < 24; i++) {
		chrome.alarms.clear(`scheduled_${i}`)
	}

	const nowHour = DateTime.local().hour
	const autorunat = []
	const allTasks = await getAllTasks()
	for (let task of allTasks) {
		if (task.auto.run !== true || nowHour >= task.auto.when) {
			continue
		}
		if (autorunat.indexOf(task.auto.when) === -1) {
			autorunat.push(task.auto.when)
		}
	}
	for (let when of autorunat) {
		let timestamp = DateTime.local().set({
			hour: when,
			minute: 1,
			second: 0,
		})
		chrome.alarms.create(`scheduled_${when}`, {
			when: timestamp.valueOf()
		})
		console.log(`scheduled_${when} auto run at ${timestamp}`)
	}

}

function updateBrowserAction(force = false) {
	const warmMsg = " ! "
	chrome.browserAction.setBadgeBackgroundColor({
		color: "#FF2800"
	})
	switch (loginStatus.status) {
		case USER_STATUS.LOGOUT:
			chrome.browserAction.setBadgeText({
				text: warmMsg
			})
			chrome.browserAction.setTitle({
				title: "账号登录失效"
			})
			break
		default:
			chrome.browserAction.getBadgeText({}, text => {
				if (!force && text !== warmMsg) {
					return
				}
				chrome.browserAction.setTitle({
					title: "京试"
				})
				getSuccessActivityItems().then(list => {
					chrome.browserAction.setBadgeText({
						text: list.length === 0 ? '' : list.length.toString()
					})
				})
			})
			break
	}
}

window.onload = () => {
	console.log(`${DateTime.local()} background.js loading`)
	chrome.alarms.clearAll()
	storage.get({ loginStatus: loginStatus }).then(res => { loginStatus = res.loginStatus })
	storage.get({ saveinfo: saveinfo }).then(res => {
		saveinfo = res.saveinfo
		checkAndResetDailyInfo()
	})
	initScheduledTasks()
	updateBrowserAction(true)
}

window.onunload = () => {
	savePersistentData()
}

// chrome.runtime.sendMessage 调用者无法接收到 调用者发的 sendMessage 
// 但是代码需要调用者收到调用者发送的 sendMessage...
// 需要消息机制来解耦...
window.sendMessage = function (msg) {
	backgroundMessageListener(msg)
}