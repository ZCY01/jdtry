<template>
<van-list>

    <van-cell v-for="item in settings" :key="item.name" :title="item.text">
        <template #label>
            <span v-for="btn of item.btns" :key="btn.value">
                <van-button :type="btn.selected?'info':'default'" @click="selected(btn)" class="settings-btn">
                    {{btn.text}}
                </van-button>
            </span>
        </template>
    </van-cell>
    <van-cell title="高级设置" center>
        <div>
            <van-button plain hairline size="small" type="info" @click="clearSqlActivitys"> 清空商品列表 </van-button>
        </div>
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
            autoLogin: false
        };
    },
    mounted: function () {

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
        }

    }
};
</script>

<style scoped>
.settings-btn {
    margin: 3px;
}
</style>
