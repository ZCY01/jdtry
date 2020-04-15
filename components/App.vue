<template>
<div class='contents'>
    <van-tabs v-model="activeTabName" sticky>
        <van-tab title="任务列表" name="taskpanel">
            <taskpanel :taskId="runtime.taskId" :taskPercentage="taskPercentage" :applidActivityNum="saveinfo.applidActivityNum" @execute="execute"></taskpanel>
        </van-tab>
        <van-tab title="任务设置" name="settings">
            <settings></settings>
        </van-tab>
        <van-tab title="商品列表" name="activityItems" :badge="activeSqlActivityItems.length">

            <itemList :list="activeSqlActivityItems" @filter="filterSqlActivityItems">
                <template #actions="props">
                    <van-button v-if="props.item.status== ACTIVITY_STATUS.APPLIED" disabled plain hairline size="small" type="info">已申请</van-button>
                    <van-button v-else-if="runtime.applyingActivityIds.indexOf(props.item.id) >=0" loading plain hairline size="small" type="info" loading-text="申请" class=""></van-button>
                    <van-button v-else @click="activityApply(props.item)" plain hairline size="small" type="info" class="">申请</van-button>
                    <van-button @click="deleteActivityItem(props.item)" plain hairline size="small" type="info" class=""> 删除 </van-button>
                </template>
            </itemList>

        </van-tab>
        <van-tab title="成功列表" name="successActivityItems" :badge="activeSuccessActivityItems.length">

            <itemList :list="activeSuccessActivityItems" @filter="filterSuccessActivityItems" :default_day=14>
                <template #actions="props">
                    <van-button @click="deleteSuccessActivityItem(props.item)" plain hairline size="small" type="info" class=""> 删除 </van-button>
                </template>
            </itemList>

        </van-tab>
    </van-tabs>
    <van-tabbar>
        <van-tabbar-item :title="loginStatus.description" v-tippy @click="checkLoginStatus">
            <!-- TODO 这里应该是三个状态 -->
            <span :class="loginStatus.status===USER_STATUS.LOGIN?'login':'not-login'">{{loginStatus.shortDescription}}</span>
            <template #icon>
                <img :src="loginStatus.status===USER_STATUS.LOGIN?'../img/user-active.png':'../img/user-inactive.png'" />
            </template>
        </van-tabbar-item>
        <van-tabbar-item :title="`当前关注了${saveinfo.followVenderNum}个店铺。用户关注店铺上限为500个。每日最多增加300个关注店铺，请按时清理。`" v-tippy icon="like-o" :badge="saveinfo.followVenderNum">
            关注
        </van-tabbar-item>
        <van-tabbar-item title="点击查看本插件的全部代码" v-tippy icon="../img/github.png" @click="openGithub">
            源代码
        </van-tabbar-item>
    </van-tabbar>
</div>
</template>

<script>
import {
    getActivityItems,
    getSuccessActivityItems
} from '../static/db'
import {
    storage
} from '../static/utils'
import {
    Toast,
    Dialog
} from 'vant';

import itemList from './itemList'
import settings from './settings'
import taskpanel from './taskpanel'
import {
    ACTIVITY_STATUS,
    USER_STATUS
} from '../static/config'
import {
	updateTaskInfo
} from '../static/tasks'

const bg = chrome.extension.getBackgroundPage()

export default {
    name: 'App',
    components: {
        settings,
        itemList,
        taskpanel
    },
    data() {
        return {
            activeTabName: 'taskpanel',
            activity: {
                sql: {
                    items: [],
                    deleteIds: [],
                    day: 1,
                    filter: ''

                },
                success: {
                    items: [],
                    deleteIds: [],
                    day: 14,
                    filter: ''
                }
            },
            loginStatus: bg.loginStatus,
            runtime: bg.runtime,
            saveinfo: bg.saveinfo,
            USER_STATUS: USER_STATUS,
            ACTIVITY_STATUS: ACTIVITY_STATUS,
        }
    },
    destroyed() {
        //因为 loginStatus 这些参数是 window 生命周期的，如果不手动释放的话会导致内存泄露
        bg.loginStatus = Object.assign({}, bg.loginStatus)
        bg.runtime = Object.assign({}, bg.runtime)
        bg.saveinfo = Object.assign({}, bg.saveinfo)
    },
    mounted() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.action) {
                case "popup_update_activity":
                    Toast('刷新商品列表')
                    this.renderSqlActivityItems()
                    break;
                case "popup_update_success_activity":
                    Toast('有新的成功的项目')
                    this.renderSuccessActivityItems();
                    break;
                case "popup_update_activity_status":
                    this.updateACTIVITY_STATUS(message.activityId, message.status);
                    break;
                default:
                    break;
            }
        })

        this.renderSqlActivityItems()
        this.renderSuccessActivityItems()
        storage.get({
            activity_sql_delete_ids: []
        }).then(res => this.activity.sql.deleteIds = res.activity_sql_delete_ids)
        storage.get({
            activity_success_delete_ids: []
        }).then(res => this.activity.success.deleteIds = res.activity_success_delete_ids)
        bg.checkLoginStatusValid()
    },
    computed: {
        disable_event: function () {
            if (this.loginStatus.status !== this.USER_STATUS.LOGIN) {
                Toast('未登录')
                return true
            }
            if (this.runtime.taskId !== -1) {
                Toast('已有任务正在进行')
                return true
            }
            return false
        },
        activeSqlActivityItems: function () {
            return this.activity.sql.items.filter(item => {
                if (this.activity.sql.deleteIds.indexOf(item.id) >= 0) {
                    return false
                }
                const filter = this.activity.sql.filter
                if (filter) {
                    return item.name.indexOf(filter) >= 0
                }
                return true
            })
        },
        activeSuccessActivityItems: function () {
            return this.activity.success.items.filter(item => {
                if (this.activity.success.deleteIds.indexOf(item.id) >= 0) {
                    return false
                }
                const filter = this.activity.success.filter
                if (filter) {
                    return item.name.indexOf(filter) >= 0
                }
                return true
            })
        },
        taskPercentage() {
            return (100 * this.runtime.doneTask / this.runtime.totalTask).toFixed(0)
        }

    },
    methods: {
        activityApply(activity) {
            Toast(`即将执行 ${activity.id} 任务`)
            bg.activityApply([{
                url: activity.url,
                id: activity.id
            }], false)

        },
        deleteActivityItem(activityItem) {
            const id = activityItem.id
            if (this.activity.sql.deleteIds.indexOf(id) < 0) {
                this.activity.sql.deleteIds.push(id)
                storage.set({
                    activity_sql_delete_ids: this.activity.sql.deleteIds
                })
            }
        },
        deleteSuccessActivityItem(activityItem) {
            const id = activityItem.id
            if (this.activity.success.deleteIds.indexOf(id) < 0) {
                this.activity.success.deleteIds.push(id)
                storage.set({
                    activity_success_delete_ids: this.activity.success.deleteIds
                })
            }
        },
        updateACTIVITY_STATUS(activityId, status) {
            for (let item of this.activeSqlActivityItems) {
                if (item.id === activityId) {
                    item.status = status ? ACTIVITY_STATUS.APPLIED : ACTIVITY_STATUS.APPLY
                    break
                }
            }
        },
        renderSqlActivityItems() {
            getActivityItems(this.activity.sql.day).then(res => {
                this.activity.sql.items = res
            })
        },
        renderSuccessActivityItems() {
            getSuccessActivityItems(this.activity.success.day).then(res => {
                this.activity.success.items = res
            })
        },
        filterSqlActivityItems(msg) {
            console.log(`sql ${msg}`)
            if (this.activity.sql.filter !== msg.filter) {
                this.activity.sql.filter = msg.filter
            }
            if (msg.day !== this.activity.sql.day) {
                this.activity.sql.day = msg.day
                this.renderSqlActivityItems()
            }
        },
        filterSuccessActivityItems(msg) {
            console.log(`success ${msg.day} ${msg.filter}`)
            if (this.activity.success.filter !== msg.filter) {
                this.activity.success.filter = msg.filter
            }
            if (msg.day !== this.activity.success.day) {
                this.activity.success.day = msg.day
                this.renderSqlActivityItems()
            }
        },
        checkLoginStatus() {
            switch (this.loginStatus.status) {
                case this.USER_STATUS.WARMING:
                    bg.loginStatusRetrieval()
                    break
                case this.USER_STATUS.LOGOUT:
                    chrome.tabs.create({
                        url: 'https://passport.jd.com/new/login.aspx',
                        active: true
                    })
                    break
            }
        },
        openGithub() {
            chrome.tabs.create({
                url: 'https://github.com/ZCY01/jdtry',
                active: true
            })
        },
        execute(task) {
            // if (this.loginStatus.status === USER_STATUS.WARMING) {
            //     Toast('正在检查登录状态，请稍后')
            //     return
            // }
            if (this.loginStatus.status === USER_STATUS.LOGOUT) {
                Toast('未登录！请手动登录！')
                return
            }
            if (this.runtime.taskId !== -1) {
                Toast('有任务正在执行')
                return
            }
			this.runtime.taskId = task.id
			updateTaskInfo(task)
            switch (task.action) {
                case 'activity_apply':
                    const activity = []
                    for (let item of this.activeSqlActivityItems) {
                        if (item.status === ACTIVITY_STATUS.APPLY) { //非 已成功
                            activity.push({
                                url: item.url,
                                id: item.id
                            })
                        }
                    }
                    Toast(`即将申请 ${activity.length} 个试用商品`)
                    bg.activityApply(activity)
                    break
                default:
                    bg.runTask(task)
                    break
            }
        }
    }
}
</script>
