import { storage } from './utils'
const NO_LIMIT = 0
const ONE_HOUR = 60 * 60 * 1000
const HALF_HOUR = 30 * 60 * 1000
const TEN_MINUTE = 10 * 60 * 1000
export const TASK_ID = {
	FOLLOW_VENDER_NUM_RETRIEVAL:0,
	EMPTY_FOLLOW_VENDER_LIST:1,
	ACTIVITY_RETRIEVAL:2,
	SUCCESS_ACTIVITY_RETRIEVAL:3,
	ACTIVITY_APPLY:4,
	CHECK_OR_DO_LOGIN_OPT:5,

	RUNNING:6978
}

export const commonTasks = [
	{
		actions: ["auto_login"],
		href_patterns: [/https:\/\/passport.jd.com/]
	},
	{
		actions: ["check_login_status"],
		href_patterns: [/https:\/\/try.jd.com/]
	},
	{
		actions: ["check_login_status", "follow_vender_num_retrieval"],
		href_patterns: ["https://t.jd.com/vender/followVenderList.action*", "https://t.jd.com/follow/vender/list.do*"]
	},
	{
		actions: ["check_login_status", "success_activity_retrieval"],
		href_patterns: [/https:\/\/try.jd.com\/user\/myTrial\?page=\d*&selected=2/]
	}
]
export const defaultTasks = [
	{
		id: TASK_ID.FOLLOW_VENDER_NUM_RETRIEVAL,
		title: "获取关注数量",
		description: "获取关注店铺的数量，请及时清理",
		last_run_at: 0,
		auto: {
			run: false,
			when: 11,
			frequency: NO_LIMIT,
		},
		actions: ["check_login_status", "follow_vender_num_retrieval"],
		href_patterns: ["https://t.jd.com/vender/followVenderList.action*", "https://t.jd.com/follow/vender/list.do*"]
	},
	{
		id: TASK_ID.EMPTY_FOLLOW_VENDER_LIST,
		title: "清空关注列表",
		description: "取关所有已关注的店铺",
		last_run_at: 0,
		auto: {
			run: false,
			when: 11,
			frequency: NO_LIMIT,
		},
		actions: ["check_login_status", "follow_vender_num_retrieval", "empty_follow_vender_list"],
		href_patterns: ["https://t.jd.com/vender/followVenderList.action*", "https://t.jd.com/follow/vender/list.do*"]
	},
	{
		id: TASK_ID.ACTIVITY_RETRIEVAL,
		title: "搜索商品",
		description: "搜索并入库指定条件下的京东试用商品列表",
		last_run_at: 0,
		auto: {
			run: false,
			when: 11,
			frequency: NO_LIMIT
		},
		actions: ["activity_retrieval"],
		href_patterns: ["https://try.jd.com/activity/getActivityList*"]
	},
	{
		id: TASK_ID.SUCCESS_ACTIVITY_RETRIEVAL,
		title: "检索成功",
		description: "检查是否有新申请成功的项目",
		last_run_at: 0,
		auto: {
			run: false,
			when: 11,
			frequency: NO_LIMIT,
		},
		actions: ["check_login_status", "success_activity_retrieval"],
		href_patterns: [/https:\/\/try.jd.com\/user\/myTrial\?page=\d*&selected=2/]
	},
	{
		id: TASK_ID.ACTIVITY_APPLY,
		title: "一键申请",
		description: "立即执行申请试用商品任务",
		last_run_at: 0,
		auto: {
			run: false,
			when: 11,
			frequency: NO_LIMIT
		},
		actions: ["check_login_status", "activity_apply"],
		href_patterns: [/https:\/\/try.jd.com\/\d*\.html/]
	},
]

export function updateTaskInfo(task) {
	if(typeof (activityId) === 'number'){
		return
	}
	const taskKey = `task_${task.id}`
	storage.set({ [taskKey]: task })
}

export async function getAllTasks() {
	const allTasks = []
	const allPromiseList = []
	for (let task of defaultTasks) {
		const taskKey = `task_${task.id}`
		allPromiseList.push(storage.get(taskKey))
	}
	await Promise.all(allPromiseList).then(values => {
		for (let value of values) {
			for (let key in value) {
				if (key.startsWith('task_')) {
					allTasks.push(value[key])
				}
			}
		}
	})
	return allTasks
}