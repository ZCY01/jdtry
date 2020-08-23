import { suspend, mutationsPromise, simulateClick, parseActivityId, storage } from './utils'
import { USER_STATUS, ACTIVITY_STATUS } from './config'
import { Toast } from 'vant';

const task_opts = {
	async auto_login() {

		simulateClick(document.querySelector('.login-tab.login-tab-r a'), true)

		let res = await storage.get({ autoLogin: false })
		if (!res.autoLogin) {
			return
		}

		await suspend(2000)

		res = await storage.get({ account: { username: '', password: '' } })
		if (!res.account.username || !res.account.password) {
			return
		}
		document.querySelector("#loginname").value = res.account.username
		document.querySelector("#nloginpwd").value = res.account.password

		simulateClick(document.querySelector(".login-btn a"), true)

		setTimeout(() => {
			console.warn('自动登录失败')
		}, 3000)

		return true
	},

	async check_login_status(open_link_login=true) {
		if (document.querySelector("#ttbar-login") === null) { // 检查不到用户登录状态
			return undefined
		}
		let loginStatus = {
			status: USER_STATUS.LOGOUT,
			description: '未检查到用户名，点击打开网页登录',
			shortDescription: `未登录`,
			timestamp: Date.now()
		}
		if (document.querySelector(".nickname")
			&& document.querySelector(".nickname").innerText) {

			loginStatus.status = USER_STATUS.LOGIN
			loginStatus.description = `${document.querySelector('.nickname').innerText}`
			loginStatus.shortDescription = '已登录'
		}
		else if( open_link_login
			&& document.querySelector('.link-login')
			&& document.querySelector('.link-login') === "你好，请登录"){

			let res = await storage.get({ autoLogin: false })
			if(res.autoLogin){
				simulateClick(document.querySelector('.link-login'))
			}

		}

		const login = loginStatus.status === USER_STATUS.LOGIN
		chrome.runtime.sendMessage({
			action: "bg_login_status_retrieval",
			href: window.location.href,
			loginStatus: loginStatus,
			status: login
		})
		console.log(`登录状态 ${login}`)
		return login
	},

	follow_vender_num_retrieval() {
		let num = 0
		document.querySelectorAll('#categoryFilter li').forEach(li => {
			const reg = /（(\d*)）/.exec(li.innerText)
			if (reg) {
				num += parseInt(reg[1])
			}
		})
		console.log(`当前用户一共关注了 ${num} 个店铺`)
		chrome.runtime.sendMessage({
			action: "bg_follow_vender_num_retrieval",
			followVenderNum: num
		})
		return true
	},
	async empty_follow_vender_list() {
		let res = await emptyFollowVenderList()
		if (!res) {//要么成功自动reload, 要么失败手动reload
			window.location.reload()
		}
		return res
	},
	activity_retrieval() {
		let activityList = []
		document.querySelectorAll('.try-item').forEach(activity => {
			let link = activity.querySelector('.link')
			if (activity.innerHTML.indexOf('已申请') < 0) {
				activityList.push({
					url: link.href,
					id: parseInt(activity.parentElement.getAttribute('activity_id')),
					pic_url: activity.querySelector('img').src,
					name: activity.querySelector('.p-name').innerText,
					detail: activity.querySelector('.p-detail').innerText,
					price: parseFloat(activity.querySelector('.p-price span').innerText.substr(1)),
					timestamp: parseInt(activity.parentElement.getAttribute('end_time')),
					status: ACTIVITY_STATUS.APPLY
				})
			}
		})
		console.log(`页面一共有 ${activityList.length} 个未进行的任务`)
		const pages = document.querySelector('.page.clearfix .p-wrap .p-skip b')
		chrome.runtime.sendMessage({
			action: "bg_new_activity_retrieval",
			activityList: activityList,
			href: window.location.href,
			pageNum:pages ? pages.innerText : 1,
		})
		return true
	},
	success_activity_retrieval() {
		let activityList = document.querySelectorAll('.list-detail-item')
		if (!activityList) {
			console.warn('无法获得/没有申请成功的商品')
			return false
		}
		let successActivityList = []
		for (let activity of activityList) {
			const countDown = activity.querySelector('.re-time')
			if (!countDown) {//过期了
				continue
			}
			const timestamp = parseInt(countDown.getAttribute('end_time')) + countDown.getAttribute('after_hours') * 60 * 60 * 1000
			successActivityList.push({
				url: activity.querySelector('.p-name a').href,
				id: parseInt(activity.getAttribute('activity_id')),
				pic_url: activity.querySelector('img').src,
				name: activity.querySelector('.p-name').innerText,
				detail: activity.querySelector('.p-detail').innerText,
				price: parseFloat(activity.querySelector('.p-price span').innerText.substr(1)),
				timestamp: timestamp,
				apply: true
			})
		}
		const pages = document.querySelector('.page.clearfix .p-wrap .p-skip b')
		chrome.runtime.sendMessage({
			action: "success_activity_retrieval",
			successActivityList: successActivityList,
			href: window.location.href,
			pageNum: pages ? pages.innerText : 1,
		})

		return true
	},
	async activity_apply() {
		const activityId = parseActivityId(window.location.href)

		let destoryIframeMsg = (status = false, success = false) => {
			chrome.runtime.sendMessage({
				action: "bg_activity_applied",
				href: window.location.href,
				activityId: activityId,
				status: status,
				success: success
			})
		}

		let state = document.querySelector('.state')
		if (!state) {                                 // 获取不了状态，关闭
			console.log(`${window.location.href} 无法获取状态`)
			return destoryIframeMsg(false) // window.location.reload()
		}
		if (state.innerText.startsWith('您已提交申请')) { // 已申请，关闭并更新状态
			console.log(`${window.location.href} ${state.innerText}`)
			return destoryIframeMsg(true)
		}
		if (!state.innerText.startsWith('活动已开始')) { // 当前页面不是可以申请的页面，关闭
			console.log(`${window.location.href} ${state.innerText}`)
			return destoryIframeMsg(false)
		}

		let res = await clickApplyBtn(activityId)
		destoryIframeMsg(res, res)
		return res
	}
}

function insert_auto_login_btn() {
	simulateClick(document.querySelector('.login-tab.login-tab-r a'), true)
	const autoLoginBtn = document.createElement('p')
	autoLoginBtn.innerHTML = "<span class='jdtry-login'>让京试记住密码并自动登录</span>"
	document.querySelector('.item.item-fore5').append(autoLoginBtn)
	autoLoginBtn.onclick = () => {
		const username = document.querySelector("#loginname").value
		const password = document.querySelector("#nloginpwd").value
		if (!username || !password) {
			Toast('请填写账号和密码后重试')
			return
		}
		storage.set({ account: { username: username, password: password } }).then(() => {
			Toast('保存账号和密码成功')

			chrome.runtime.sendMessage({
				action: "bg_get_login_status",
			}, loginStatus => {
				console.log(loginStatus)
				if (loginStatus.status !== USER_STATUS.LOGIN) {
					simulateClick(document.querySelector(".login-btn a"), true)
				}
			})
		})

	}
}
async function waitForDialog(timeout = 2500) {
	try{
		await mutationsPromise(
			document.body,
			{ childList: true },
			mutation => {
				for (let node of mutation.addedNodes) {
					if (node.className.startsWith('ui-dialog')) {
						return true
					}
				}
			},
			timeout,
			"获得 ui-dialog 弹窗失败")
	}
	catch (e) {
		return false
	}
	return true
}

async function dealWithDialogAlert(innerText) {
	if (innerText.indexOf('成功') >= 0) {
		return true
	}
	else if (innerText.indexOf('已超过上限') >= 0) {
		chrome.runtime.sendMessage({
			action: "bg_update_saveinfo",
			data: { fulfilled: true }
		})
		console.log('达到每日上限')
		return false
	}
	else if (innerText.indexOf('关注数超过上限了哦') >= 0) {
		chrome.runtime.sendMessage({           //先将就用这个！
			action: "bg_update_saveinfo",
			data: { noMoreVender: true }
		})
		console.log('关注数超过上限了哦～先清理下关注列表吧')
		return false
	}
	console.warn(`未知DialogAlert弹窗 ${innerText}`)
	return false
}

async function clickApplyBtn(activityId) {

	// 点击试用
	let applyBtn = document.querySelector('.app-btn.btn-application')
	if (!applyBtn
		|| applyBtn.innerText !== '申请试用'
		|| applyBtn.className.indexOf('app-btn-disabled') >= 0) {
		console.log(`当前页面不可操作`)
		return false
	}
	simulateClick(applyBtn, true)

	//检查是否需要关注以及关注状态
	let needFollow = document.body.innerHTML.indexOf('需关注') !== -1
	if (needFollow) {
		const followStatus = document.querySelector('.btn-def.follow-shop.J-follow-shop')
		if (followStatus && followStatus.innerText.indexOf('已关注店铺') >= 0) {
			needFollow = false
		}
	}

	if (needFollow) {

		console.log('需要关注店铺，即将进行关注店铺操作')
		if(await waitForDialog() === false){
			return false
		}

		const dialog = document.querySelector('.ui-dialog')
		if (dialog.className.indexOf('tipsAlert') >= 0) {  //此时不应该出现 tipsAlert 的！
			return dealWithDialogAlert(dialog.innerText)
		}

		const btn = dialog.querySelector('.y')
		if (!btn || btn.innerText !== '关注并申请' || btn.className.indexOf('app-btn-disabled') >= 0) {
			console.log(`未知dialog弹窗：${dialog.innerText}`)
			return false
		}
		await suspend(1000)
		simulateClick(btn, true)
	}
	else {
		console.log('不需要关注店铺，即将获取结果')
	}

	if(await waitForDialog() === false){
		return false
	}

	let result = document.querySelector('.ui-dialog') // 获取整个弹窗的值
	return dealWithDialogAlert(result.innerText)
}

async function emptyFollowVenderList() {
	console.log(`即将执行 emptyFollowVenderList`)

	if (document.querySelectorAll('.mf-shop-item').length === 0) {
		console.log('已经没有关注的店铺')
		return true
	}

	const allOptBtn = document.querySelector('.batch-box.J-batchBox a') // 批量操作按钮
	if (!allOptBtn || allOptBtn.innerText !== '批量操作') {
		console.warn('找不到批量操作按钮')
		return false
	}
	simulateClick(allOptBtn, true)
	await suspend(1000)

	const allCheckBtn = document.querySelector('.batch-box.J-batchBox .op-btn.u-check') // 全选按钮
	if (!allCheckBtn || allCheckBtn.innerText !== '全选') {
		console.warn('找不到全选按钮')
		return false
	}
	simulateClick(allCheckBtn, true)
	await suspend(1000)

	const unFollowBtn = document.querySelector('.batch-box.J-batchBox .op-btn.u-unfollow')  //取消关注
	if (!unFollowBtn || unFollowBtn.innerText !== '取消关注') {
		console.warn('找不到取消关注按钮')
		return false
	}
	simulateClick(unFollowBtn, true)

	if(await waitForDialog() === false){
		return false;
	}

	const dialog = document.querySelector('.ui-dialog')
	const submitBtn = dialog.querySelector('.ui-dialog-btn-submit')
	if (!submitBtn || submitBtn.innerText !== '确定') {
		console.warn(`找不到确定关注按钮 ${dialog.innerText}`)
		return false
	}
	simulateClick(submitBtn, true)

	await waitForDialog(10 * 1000)
	return false
}

async function do_actions(actions){
	if(actions === undefined){
		return
	}
	for(let act of actions){
		if(act in task_opts){
			console.log(`do ${act} action`)
			if(await task_opts[act]() === false){
				console.log(`do ${act} action fail`)
			}
		}
		else{
			console.warn(`unknown ${act} action`)
			break
		}
	}
}
window.onload = () => {
	console.log(`${window.location.href} loading`)

	const openByBrowser = self === top // 用于标示 是浏览器打开还是脚本使用iframe打开
	if (openByBrowser) {
		if (document.querySelector('.login-tab.login-tab-r')) {
			insert_auto_login_btn()
		}
		task_opts.check_login_status(false)
		return
	}

	setTimeout(() => {
		chrome.runtime.sendMessage({
			action: "bg_task_opt",
			data: { href: window.location.href }
		},actions=>{
			do_actions(actions)
		})

	}, 4000)

}
window.onbeforeunload = () => {
	console.log(`${window.location.href} unloading`)
}