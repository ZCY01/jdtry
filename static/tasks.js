import { storage } from './utils'
export const tasks = [
	{
		id: 0,
		title: "获取关注数量",
		description: "获取关注店铺的数量，及时清理",
		action: 'follow_vender_num_retrieval',
		last_run_at: 0,

	}, {
		id: 1,
		title: "清空关注列表",
		description: "取关所有已关注的店铺",
		action: 'empty_follow_vender_list',
		last_run_at: 0,
	}, {

		id: 2,
		title: "搜索商品",
		description: "搜索并入库指定条件下的京东试用商品列表",
		action: 'activity_retrieval',
		last_run_at: 0,
	}, {
		id: 3,
		title: "检索成功",
		description: "检查是否有新的成功的项目",
		action: 'success_activity_retrieval',
		last_run_at: 0,
	}, {
		id: 4,
		title: "一键申请",
		description: "立即执行申请试用商品任务",
		action: 'activity_apply',
		last_run_at: 0,
	}
]

for (let task of tasks) {
	const taskKey = `task_${task.id}`
	storage.get({
		[taskKey]: {
			last_run_at: 0
		}
	}).then(res => {
		task.last_run_at = res[taskKey].last_run_at
	})
}

export function updateTaskInfo(task){
	let taskid = task
	if(typeof task === 'object'){
		taskid = task.id
	}
	const taskKey = `task_${taskid}`
	storage.set({
		[taskKey]: {
			last_run_at: new Date().getTime()
		}
	})
}