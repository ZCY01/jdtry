import { storage } from './utils'
const ONE_HOUR = 60 * 60 * 1000
const HALF_HOUR = 30 * 60 * 1000
const TEN_MINUTE = 10 * 60 * 1000
export const defaultTasks = [
	{
		id: 0,
		title: "获取关注数量",
		description: "获取关注店铺的数量，请及时清理",
		action: 'follow_vender_num_retrieval',
		last_run_at: 0,
		auto: {
			run: false,
			when: 11,
			frequency: 'nolimit',
			taskLifetime: TEN_MINUTE,
		},
		checkLogin:true,
	}, {
		id: 1,
		title: "清空关注列表",
		description: "取关所有已关注的店铺",
		action: 'empty_follow_vender_list',
		last_run_at: 0,
		auto: {
			run: false,
			when: 11,
			frequency: 'daily',
			taskLifetime: HALF_HOUR,
		},
		checkLogin:true,
	}, {
		id: 2,
		title: "搜索商品",
		description: "搜索并入库指定条件下的京东试用商品列表",
		action: 'activity_retrieval',
		last_run_at: 0,
		auto: {
			run: false,
			when: 11,
			frequency: 'daily',
			taskLifetime: HALF_HOUR,
		},
		checkLogin:false,
	}, {
		id: 3,
		title: "检索成功",
		description: "检查是否有新申请成功的项目",
		action: 'success_activity_retrieval',
		last_run_at: 0,
		auto: {
			run: false,
			when: 11,
			frequency: 'nolimit',
			taskLifetime: TEN_MINUTE
		},
		checkLogin:true,
	}, {
		id: 4,
		title: "一键申请",
		description: "立即执行申请试用商品任务",
		action: 'activity_apply',
		last_run_at: 0,
		auto: {
			run: false,
			when: 11,
			frequency: 'daily',
			taskLifetime: ONE_HOUR
		},
		checkLogin:true,
	}
]

export function updateTaskInfo(task) {
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