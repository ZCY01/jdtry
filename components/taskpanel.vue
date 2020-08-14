<template>
<div class="task-panel" style="background-color:#fff">
    <van-popup v-model="showAutoSetting">
        <van-form @submit="onSubmit">

            <van-field name="run" label="自动运行">
                <template #input>
                    <van-switch v-model="auto.run"></van-switch>
                </template>
            </van-field>
            <van-field name="when" label="时间/24H">
                <template #input>
                    <van-stepper v-model="auto.when" min="0" max="23" />
                </template>
            </van-field>

            <div style="margin: 16px;">
                <van-button round block type="info" native-type="submit"> 保存 </van-button>
            </div>
        </van-form>
    </van-popup>
    <van-cell-group>

        <van-cell v-for="(task,index) of tasks" :key="task.id" center :label="autoTaskInfo(task)">
            <template #title>
                <div :title="task.description" v-tippy>
                    {{task.title}}
                </div>
            </template>
            <div>
                <van-button v-if="taskId !== task.id" plain hairline size="small" type="info" @click="emit(task)" :title='readableTime(task.last_run_at)' v-tippy> 执行 </van-button>
                <van-button v-else loading plain hairline size="small" type="info" loading-text="正在执行"></van-button>
                <van-icon name="info-o" :color="`${task.auto.run?'#007DFF':''}`" @click='showAutoSettingPanel(index)' style='margin-left:15px;top:6px' size="20px" title="任务设置" v-tippy></van-icon>
            </div>
        </van-cell>

        <van-cell center>
            <template #title>
                <div title="每日最多可申请300个试用商品" v-tippy>
                    每日份额
                </div>
            </template>
            <van-circle v-model="rate" :text="text" size="80" layer-color="#ebedf0"></van-circle>
        </van-cell>

    </van-cell-group>

    <div v-if="taskId !== -1">
        <van-divider>任务进度</van-divider>
        <van-progress :percentage="taskPercentage" stroke-width="8" style="width:100%"></van-progress>
    </div>

</div>
</template>

<script>
import {
    defaultTasks,
    getAllTasks,
    updateTaskInfo
} from '../static/tasks'
import {
    Dialog,
    Toast
} from 'vant'
import {
    readableTime
} from '../static/utils'
import {
    DateTime
} from 'luxon'

export default {
    name: "taskpanel",
    props: ["taskId", "taskPercentage", "applidActivityNum"],
    data() {
        return {
            tasks: defaultTasks,
            showAutoSetting: false,
            auto: {
                run: false,
                when: 0
            }
        }
    },
    async mounted() {
        this.tasks = await getAllTasks()
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
		},
    },
    methods: {
        autoTaskInfo(task) {
            if (task.auto.run !== true) {
                return ''
            }
            let now = DateTime.local()
            if (now.hour >= task.auto.when) {
                now = now.plus({
                    day: 1
                })
            }
            now = now.set({
                hour: task.auto.when,
                minute: 0,
                second: 0,
            })
            return `将运行于：${readableTime(now)}`
        },
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
        },
        onSubmit(values) {
            sendMessage({
                action: "bg_scheduled_task",
            })
            Object.assign(this.tasks[this.taskIndex].auto, values)
            // this.tasks[this.taskIndex].last_run_at = DateTime.local().plus({
            //     day: -1
			// }).valueOf()
            updateTaskInfo(this.tasks[this.taskIndex])
            Toast({
                message: '保存成功',
                duration: 1000
            })
        },
        showAutoSettingPanel(index) {
            this.taskIndex = index
            this.auto = Object.assign(this.auto, this.tasks[this.taskIndex].auto)
            this.showAutoSetting = true
        }
    }
};
</script>
