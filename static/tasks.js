import { storage } from './utils'
export const defaultTasks = [
	{
		id: 0,
		title: "获取关注数量",
		description: "获取关注店铺的数量，请及时清理",
		action: 'follow_vender_num_retrieval',
		last_run_at: 0,
		auto: {
			run: false,
			when: 11
		},
		frequency: 'nolimit',
	}, {
		id: 1,
		title: "清空关注列表",
		description: "取关所有已关注的店铺",
		action: 'empty_follow_vender_list',
		last_run_at: 0,
		auto: {
			run: false,
			when: 11
		},
		frequency: 'daily',
	}, {
		id: 2,
		title: "搜索商品",
		description: "搜索并入库指定条件下的京东试用商品列表",
		action: 'activity_retrieval',
		last_run_at: 0,
		auto: {
			run: false,
			when: 11
		},
		frequency: 'daily',
	}, {
		id: 3,
		title: "检索成功",
		description: "检查是否有新申请成功的项目",
		action: 'success_activity_retrieval',
		last_run_at: 0,
		auto: {
			run: false,
			when: 11
		},
		frequency: 'nolimit',
	}, {
		id: 4,
		title: "一键申请",
		description: "立即执行申请试用商品任务",
		action: 'activity_apply',
		last_run_at: 0,
		auto: {
			run: false,
			when: 11
		},
		frequency: 'daily',
	}
]

export function updateTaskInfo(task) {
	const taskKey = `task_${task.id}`
	storage.set({ [taskKey]: task })
}

export async function getAllTasks() {
	const allTasks = []
	for (let task of defaultTasks) {
		const taskKey = `task_${task.id}`
		await storage.get(taskKey).then(res => {
			allTasks.push(res[taskKey])
		})
	}
	return allTasks
}