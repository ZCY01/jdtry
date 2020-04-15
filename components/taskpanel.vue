<template>
<div class="task-panel" style="background-color:#fff">
    <van-cell-group>
        <van-cell v-for="task of tasks" :key="task.id" center>
            <template #title>
                <div :title="task.description" v-tippy>
                    {{task.title}}
                </div>
            </template>
            <div>
                <van-button v-if="taskId !== task.id" plain hairline size="small" type="info" @click="emit(task)" :title='readableTime(task.last_run_at)' v-tippy> 执行 </van-button>
                <van-button v-else loading plain hairline size="small" type="info" loading-text="正在执行"></van-button>
            </div>
        </van-cell>

    </van-cell-group>

    <van-cell center>
        <template #title>
            <div title="每日最多可申请300个试用商品" v-tippy>
                每日份额
            </div>
        </template>
        <van-circle v-model="rate" :text="text" size="80" layer-color="#ebedf0"></van-circle>
    </van-cell>
    <div v-if="taskId !== -1">
        <van-divider>任务进度</van-divider>
        <van-progress :percentage="taskPercentage" stroke-width="8" style="width:100%"></van-progress>
    </div>
</div>
</template>

<script>
import {
    tasks
} from '../static/tasks'
import {
    Dialog
} from 'vant'
import {
    readableTime
} from '../static/utils'

export default {
    name: "taskpanel",
    props: ["taskId", "taskPercentage", "applidActivityNum"],
    data() {
        return {
            tasks: tasks,
        }
    },
    computed: {
        rate: {
            set() {},
            get() {
                return 100 * this.applidActivityNum / 300
            }
        },
        text() {
            return this.applidActivityNum + '/300'
        }
    },
    methods: {
        emit(task) {
            Dialog.confirm({
                title: task.title,
                message: task.description
            }).then(() => {
                this.$emit('execute', task)
            }).catch(() => {})
        },
        readableTime(time) {
            if (time <= 0) {
                return ''
            }
            return `上次运行：${readableTime(time)}`
        }
    }
};
</script>
