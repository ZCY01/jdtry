export function parseActivityId(href){
	let activityIdReg = /http[s]:\/\/try.jd.com\/(\d*)\.html/
	let activityId = activityIdReg.exec(href)
	if(!activityId){
		return null
	}
	return parseInt(activityId[1])
}

export function mutationsPromise(element, observerConfig, callback, rejectTime = 0, rejectMsg="") {
	return new Promise((resolve, reject) => {
		let disconnect = false
		const observer = new MutationObserver((mutations) => {
			for (let mutation of mutations) {
				if (callback(mutation)) {
					disconnect = true
					observer.disconnect()
					resolve(mutation)
					break
				}
			}
		})
		observer.observe(element, observerConfig)
		if (rejectTime > 0) {
			setTimeout(() => {
				if (!disconnect) {
					observer.disconnect()
					reject(rejectMsg)
				}
			}, rejectTime)
		}
	})
}

export function suspend(time) {
	return new Promise((resolve, reject) => {
		setTimeout(() => resolve(), time)
	})
}

export function rand(start, end) {
	return (Math.floor(Math.random() * (end - start) + start))
}

// 如果只是单纯的 element.click() 只会触发 click 事件
// 按理来说，还需要 mousemove 事件。但是太复杂了
async function mockClick(element) {
	let dispatchMouseEvent = function (type, bubbles, cancelable) {
		let e = document.createEvent("MouseEvents")
		e.initEvent(type, bubbles, cancelable)
		element.dispatchEvent(e)
	}
	if (element) {
		dispatchMouseEvent('mouseover', true, true)
		await suspend(rand(100,200))
		dispatchMouseEvent('mousedown', true, true)
		await suspend(rand(100,200))
		dispatchMouseEvent('mouseup', true, true)
		await suspend(rand(100,200))
		dispatchMouseEvent('click', true, true)
		await suspend(rand(100,200))
		dispatchMouseEvent('mouseout', true, true)
	}
}

export function simulateClick(domNode, mouseEvent) {
	if(!domNode){
		console.warn(`domNode 节点不存在！！！`)
		return
	}
	return mockClick(domNode)
	// if (mouseEvent && domNode) {
	// 	return mockClick(domNode)
	// }
	// try {
	// 	domNode.trigger("tap")
	// 	domNode.trigger("click")
	// } catch (error) {
	// 	try {
	// 		mockClick(domNode)
	// 	} catch (err) {
	// 		console.log('fullback to mockClick', err)
	// 	}
	// }
}


export const storage={
	get: function(object){
		return new Promise((resolve, reject)=>{
			chrome.storage.local.get(object, function(items) {
				resolve(items)
			})
		})
	},
	set: function(object){
		return new Promise((resolve, reject)=>{
			chrome.storage.local.set(object, function() {
				resolve()
			})
		})
	}
}

import Events from 'events'
export const emitter = new Events.EventEmitter()
export const IFRAME_LIFETIME = 15 * 1000
export const TIMEOUT_ERROR = 'timeout'

function waitEventWithPromise(eventName, timeout = IFRAME_LIFETIME) {
	return new Promise((resolve, reject) => {
		let removed = false
		const listener = (arg) => {
			removed = true
			resolve(arg)
		}
		emitter.once(eventName, listener)
		setTimeout(() => {
			if (!removed) {
				console.warn(`${eventName} 超时`)
				emitter.removeListener(eventName, listener)
				reject(timeout)
			}
		}, timeout)
	})
}

export async function openByIframeAndWaitForClose(url, eventName, timeout=IFRAME_LIFETIME) {
	try {
		let iframe = openByIframe(url, null, timeout)
		const result = await waitEventWithPromise(eventName, timeout)
		setTimeout(()=>{iframe.remove()},2000)
		// iframe.remove()
		return result
	} catch (e) {
		return e
	}
}
export function openByIframe(src, iframeid, lifetime = -1) {
	let iframe = document.createElement('iframe')
	if (iframeid) {
		iframe.setAttribute('id', iframeid)
	}
	iframe.setAttribute('src', src)
	document.body.appendChild(iframe)
	if (lifetime > 0) {
		setTimeout(() => {
			iframe.remove()
		}, lifetime)
	}
	console.log(`create Iframe for ${src}`)
	return iframe
}

export function notifications(msg, id=null){
	if(id){
		id = `${Date.now()}_${id}`
	}
	chrome.notifications.create(id, {
		type: 'basic',
		iconUrl: '../img/icon.png',
		title: '京东试用',
		message: msg
	})
}