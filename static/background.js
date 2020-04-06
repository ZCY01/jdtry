import { storage, emitter, openByIframeAndWaitForClose, TIMEOUT_ERROR, notifications, openByIframe, IFRAME_LIFETIME } from './utils'
import { addActivityItems, updateActivityItemsStatus, addSuccessActivityList } from './db'
import { settingConfig, USER_STATUS } from './config'


window.runtime = {
	taskId: -1,
	doneTask: 0,
	totalTask: 0,
	applyingActivityIds: [],
}
window.loginStatus = {
	status: USER_STATUS.WARMING,
	description: '正在获取登录状态/点击重新获取登录状态',
	shortDescription: '正在检查',
	timestamp: 0,
}
window.saveinfo = {
	followVenderNum: -1,
	applidActivityNum: 0, //per day
	fulfilled: false,
	date: 0,
}
function savePersistentData() {
	// storage.set({ loginStatus: loginStatus })  //当浏览器关闭时，cookies 可能会失效，不再保存loginStatus
	storage.set({ saveinfo: saveinfo })
}
chrome.runtime.onInstalled.addListener(function (object) {
	storage.set({ settings: settingConfig })
})
chrome.alarms.onAlarm.addListener(function (alarm) {
	switch (alarm.name) {
		case 'cycle':
			checkAndResetSaveInfo()
			savePersistentData()
			break
		default:
			console.warn(`unknown alarm:${alarm.name}`)
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
			console.warn(`unknown notificationId:${notificationId}`)
	}
})

// 消息处理

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
	switch (msg.action) {

		//from content-script
		case 'bg_update_saveinfo':
			Object.assign(saveinfo, msg.data)  //should check key?
			if (saveinfo.fulfilled) {
				saveinfo.applidActivityNum = 300
			}
			return
		case 'bg_activity_applied':
			if (msg.status) {
				updateActivityItemsStatus(msg.activityId)
			}
			if (msg.success) {
				saveinfo.applidActivityNum++
			}
			emitter.emit(`${msg.activityId}_activity_applied_event`)
			chrome.runtime.sendMessage({
				action: "popup_update_activity_status",
				activityId: msg.activityId,
				status: msg.status
			})
			break
		case 'bg_login_status_retrieval':
			Object.assign(loginStatus, msg.loginStatus)
			emitter.emit('login_status_retrieval_event', { login: msg.status })
			break

		case 'bg_new_activity_retrieval':
			if (msg.activityList.length) {
				addActivityItems(msg.activityList)
			}
			emitter.emit(msg.href + '_new_activity_retrieval_event')
			break
		case 'bg_page_num_retrieval':
			emitter.emit(msg.href + '_pages_retrieval_event', { pageNum: msg.pageNum })
			break

		case 'success_activity_retrieval':
			if (msg.successActivityList.length !== 0) {
				addSuccessActivityList(msg.successActivityList)
			}
			emitter.emit(msg.href + '_success_activity_retrieval_event')
			break
		case 'bg_follow_vender_num_retrieval':
			saveinfo.followVenderNum = msg.followVenderNum
			emitter.emit('bg_follow_vender_num_retrieval_event')
			break
		case 'empty_follow_vender_list':
			emitter.emit('empty_follow_vender_list_event', { followVenderNum: msg.followVenderNum })
			break

		//from popup.html
		//
		default:
			console.log(`recevie unkonwn action:${msg.action}`)
			break
	}
})

window.successActivityRetrieval = async function () {
	runtime.doneTask = 1
	runtime.totalTask = 100

	const login = await checkLoginStatusValid()
	if (!login) {
		runtime.taskId = -1
		return
	}

	console.log(`正在获取试用成功列表`)
	let url = `https://try.jd.com/user/myTrial?page=1&selected=2`
	let pageNum = await pageNumberRetrieval(url)
	console.log(`试用成功列表 一共 ${pageNum} 页`)
	runtime.totalTask = pageNum ? pageNum : 1

	for (let i = 2; i <= pageNum; i++) {
		runtime.doneTask++
		url = `https://try.jd.com/user/myTrial?page=${i}&selected=2`
		const eventName = `${url}_success_activity_retrieval_event`
		await openByIframeAndWaitForClose(url, eventName)
	}

	runtime.taskId = -1

	notifications('成功项目的检索完毕')
}


window.activityRetrieval = async function () {
	runtime.doneTask = 0
	runtime.totalTask = 100

	//实际上，商品检索并不需要登录
	//所以这里不检查登录状态

	let settings = {}

	await storage.get({ 'settings': [] }).then(res => { settings = res.settings })
	let cidsList = []
	let activityTypeList = []

	if (settings) {
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
	}

	if (!cidsList.length) {
		cidsList.push(null)
	}
	if (!activityTypeList.length) {
		activityTypeList.push(null)
	}
	runtime.totalTask = cidsList.length * activityTypeList.length

	for (let cids of cidsList) {
		for (let activityType of activityTypeList) {
			runtime.doneTask++
			await activityRetrievalByCondition(cids, activityType)
		}
	}
	runtime.taskId = -1
	console.log('本次搜索完毕')
	notifications('搜索并导入数据库完毕')
}


async function activityRetrievalByCondition(cids, activityType) {
	console.log(`正在获取 cids:${cids} activityType:${activityType} 类型商品`)
	let url = `https://try.jd.com/activity/getActivityList?page=1${cids ? '&cids=' + cids : ''}${activityType ? '&activityType=' + activityType : ''}`
	let pageNum = await pageNumberRetrieval(url)
	console.log(`cids:${cids} activityType:${activityType} 一共 ${pageNum} 页`)

	for (let i = 2; i <= pageNum; i++) {
		url = `https://try.jd.com/activity/getActivityList?page=${i}${cids ? '&cids=' + cids : ''}${activityType ? '&activityType=' + activityType : ''}`
		const eventName = `${url}_new_activity_retrieval_event`
		await openByIframeAndWaitForClose(url, eventName)
	}
	return true
}
window.activityApply = async function (activity) {

	runtime.doneTask = 0
	runtime.totalTask = activity.length ? activity.length : 1

	const login = await checkLoginStatusValid()
	if (!login) {
		runtime.taskId = -1
		return
	}

	runtime.applyingActivityIds.length = 0
	for (const item of activity) {
		runtime.applyingActivityIds.push(
			item.id
		)
	}

	for (const item of activity) {

		runtime.doneTask++
		if (saveinfo.fulfilled) {
			console.warn('今日申请试用份额已满，不再进行试用申请')
			notifications('今日申请试用份额已满，不再进行试用申请')
			break
		}

		const eventName = `${item.id}_activity_applied_event`

		await openByIframeAndWaitForClose(item.url, eventName)
		runtime.applyingActivityIds.shift()

	}

	runtime.taskId = -1
	runtime.applyingActivityIds.length = 0

	console.log('商品试用执行完毕')
	notifications('商品试用执行完毕')
	followVenderNumberRetrieval()
}

async function pageNumberRetrieval(url) {
	const eventName = `${url}_pages_retrieval_event`
	const result = await openByIframeAndWaitForClose(url, eventName)
	return result === TIMEOUT_ERROR ? 0 : result.pageNum
}

window.loginStatusRetrieval = async function (retry = 0) {
	if (retry >= 2) { // 最多重试两次
		notifications('检查登录状态失败，请检查网络状态后重试', 'login-fail')
		return false
	}
	const url = 'https://try.jd.com/'
	const eventName = `login_status_retrieval_event`
	const result = await openByIframeAndWaitForClose(url, eventName, IFRAME_LIFETIME)
	if (result === TIMEOUT_ERROR) {
		loginStatus.shortDescription = '检查超时'
		return loginStatusRetrieval(retry + 1)
	}
	else if (!result.login) {
		loginStatus.shortDescription = '未登录'
		loginStatus.description = '未检查到用户名，请手动登录'
		notifications('未检查到用户名，请手动登录', 'login-fail')
		return false
	}
	return true
}
window.followVenderNumberRetrieval = async function () {
	runtime.totalTask = 1
	runtime.doneTask = 1
	const url = 'https://t.jd.com/vender/followVenderList.action'
	const eventName = 'bg_follow_vender_num_retrieval_event'
	const result = await openByIframeAndWaitForClose(url, eventName, IFRAME_LIFETIME * 2)
	if (result === TIMEOUT_ERROR) {
		notifications('获取关注数量超时')
	}
	else {
		notifications(`获取关注数量完成，一共关注了${saveinfo.followVenderNum}个店铺`)
	}
	runtime.taskId = -1
}
window.emptyFollowVenderList = async function () {
	//https://t.jd.com/follow/vender/list.do  好像这个网址点击清空按钮之后会自动加载这个网址，待测试
	runtime.doneTask = 0
	runtime.totalTask = saveinfo.followVenderNum > 0 ? saveinfo.followVenderNum : 500
	for (let i = 0; i < 15; i++) {
		console.log(`当前进行第${i + 1}次 emptyFollowVenderList, followVenderNum:${saveinfo.followVenderNum}`)

		const url = 'https://t.jd.com/vender/followVenderList.action?index=1'
		const eventName = 'empty_follow_vender_list_event'
		const result = await openByIframeAndWaitForClose(url, eventName, IFRAME_LIFETIME * 2)
		if (result === TIMEOUT_ERROR) {
			continue
		}
		saveinfo.followVenderNum = result.followVenderNum
		runtime.doneTask = runtime.totalTask - saveinfo.followVenderNum
		if (saveinfo.followVenderNum === 0) {
			break
		}
	}
	notifications('已完成清理关注店铺列表')
	runtime.taskId = -1
}

window.checkLoginStatusValid = async function () {
	if (loginStatus.status !== USER_STATUS.LOGIN
		|| Date.now() > loginStatus.timestamp + 30 * 60 * 1000) {//半小时

		Object.assign(loginStatus, {
			status: USER_STATUS.WARMING,
			description: '正在获取登录状态/点击重新获取登录状态',
			shortDescription: '正在检查',
			timestamp: 0,
		})
		return loginStatusRetrieval()
	}
	return true
}

function checkAndResetSaveInfo() {
	const date = (new Date()).getDate()
	if (date !== saveinfo.date) {
		saveinfo.date = date
		saveinfo.fulfilled = false
		saveinfo.applidActivityNum = 0
	}
}

window.onload = () => {
	console.log(`${new Date()} background.js load`)
	storage.get({ saveinfo: saveinfo }).then(res => saveinfo = res.saveinfo).then(checkAndResetSaveInfo)
	// storage.get({ loginStatus: loginStatus }).then(res => loginStatus = res.loginStatus)
	chrome.alarms.clearAll()
	chrome.alarms.create('cycle', {
		periodInMinutes: 30
		// periodInMinutes: 4 * 60 
	})
}

window.onunload = () => {
	savePersistentData()
}