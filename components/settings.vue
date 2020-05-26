<template>
<van-list>

    <van-cell v-for="item in settings" :key="item.name" :title="item.text">
        <template #label>
            <span v-for="btn of item.btns" :key="btn.value">
                <van-button :type="btn.selected?'info':'default'" @click="selected(btn)" class="settings-btn" size="small">
                    {{btn.text}}
                </van-button>
            </span>
        </template>
    </van-cell>
    <van-cell title="屏蔽关键字" center>
        <template #label>
            <van-tag v-for="tag in keywordMasks" :key="tag" closeable size="medium" type="primary" @close="close(tag)" class="tag">{{tag}} </van-tag>
        </template>
        <div>
            <van-search v-model="inputTag" placeholder="回车确认" style="padding:0px" left-icon="" @clear="clear" @search="addMask"></van-search>
        </div>
    </van-cell>
    <van-cell title="最低价格(含)" center>
        <van-search v-model="minPrice" placeholder="回车确认" style="padding:0px" left-icon="" @search="updateMinPrice"></van-search>
    </van-cell>
    <van-cell title="高级设置" center>
        <van-button plain hairline size="small" type="info" @click="clearSqlActivitys"> 清空商品列表 </van-button>
        <van-button plain hairline size="small" type="info" @click="reset"> 复位 </van-button>
    </van-cell>
    <van-cell title="自动登录" center>
        <van-switch v-model="autoLogin" @change="switchStatusChange('login')"></van-switch>
    </van-cell>

</van-list>
</template>

<script>
import {
    storage
} from "../static/utils"
import {
    Toast,
    Dialog
} from 'vant'

export default {
    name: "settings",
    data() {
        return {
            settings: [],
            autoLogin: false,
            keywordMasks: [],
            inputTag: "",
            minPrice: "0"
        };
    },
    mounted: function () {
        storage.get({
            minPrice: 0
        }).then(res => this.minPrice = res.minPrice.toString())
        storage.get({
            keywordMasks: []
        }).then(res => this.keywordMasks = res.keywordMasks)
        storage.get({
            settings: []
        }).then(res => this.settings = res.settings)

        storage.get({
            autoLogin: false
        }).then(res => {
            this.autoLogin = res.autoLogin
            if (this.autoLogin)
                storage.get({
                    account: {
                        username: '',
                        password: ''
                    }
                })
                .then(res => {
                    if (!res.account.username || !res.account.password)
                        Toast('自动登录：未保存账号')
                })
        })
    },
    methods: {
        selected(btn) {
            btn.selected = btn.selected ? false : true
            storage.set({
                settings: this.settings
            });
        },
        switchStatusChange(key) {
            storage.set({
                autoLogin: this.autoLogin
            })
            if (key === 'login' && this.autoLogin) {
                Toast('即将跳转登录界面，请点击保存')
                setTimeout(() => {
                    chrome.tabs.create({
                        url: 'https://passport.jd.com/new/login.aspx',
                        active: true
                    })
                }, 2000)
            }
        },
        clearSqlActivitys() {
            Dialog.confirm({
                title: '是否要清空商品列表？'
            }).then(() => {
                sendMessage({
                    action: "bg_clear_sql_activitys",
                })
            }).catch(() => {})
        },
        close(tag) {
            this.keywordMasks = this.keywordMasks.filter(t => {
                return t !== tag
            })
            storage.set({
                keywordMasks: this.keywordMasks
            }).then(() => {
                sendMessage({
                    action: "popup_update_activity",
                })
            })
        },
        addMask(tag) {
            tag = tag.trim()
            if (this.keywordMasks.indexOf(tag) < 0) {
                this.keywordMasks.push(tag)
                storage.set({
                    keywordMasks: this.keywordMasks
                }).then(() => {
                    sendMessage({
                        action: "popup_update_activity",
                    })
                })
            }
            this.inputTag = ""
        },
        clear() {
            this.inputTag = ""
        },
        updateMinPrice() {
            this.minPrice.trim()
            if (this.minPrice === '') {
                this.minPrice = '0'
            }
            let price = parseFloat(this.minPrice)
            if (isNaN(price)) {
                Toast(`最小价格格式错误：${this.minPrice}`)
                storage.get({
                    minPrice: 0
                }).then(res => this.minPrice = res.minPrice.toString())
                return
            }
            storage.set({
                minPrice: price
            }).then(() => {
                sendMessage({
                    action: "popup_update_activity",
                })
            })
        },
        reset() {
            Dialog.confirm({
				title: '是否要复位？',
				message: '复原所有的配置'
            }).then(() => {
                sendMessage({
                    action: 'reset'
                })
            }).catch(() => {})
        }
    }
};
</script>

<style scoped>
.settings-btn {
    margin: 3px;
    width: 74px;
    height: 34px;
    font-size: 13px;
}
</style>
