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
    <van-cell title="定时启动" center>
        <van-stepper disabled v-model="auto.runtime" style="width:100px;float:left" min="0" max="23" title="每天" v-tippy @change="switchStatusChange('runtime')"></van-stepper>
        <van-switch disabled v-model="auto.run" style="float:right" @change="switchStatusChange('run')"></van-switch>
    </van-cell>
    <van-cell title="自动登录" center>
        <van-switch v-model="auto.login" @change="switchStatusChange('login')"></van-switch>
    </van-cell>

</van-list>
</template>

<script>
import {
    storage
} from "../static/utils"
import {
    Toast,
} from 'vant'


export default {
    name: "settings",
    data() {
        return {
            settings: [],
            auto: {
                run: false,
                runtime: 0,
                login: false
            }
        };
    },
    mounted: function () {
        storage
            .get({
                settings: []
            })
            .then(res => (this.settings = res.settings));
        storage
            .get({
                auto: this.auto
            })
            .then(res => (this.auto = res.auto));
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
                auto: this.auto
            })
            if (key === 'login' && this.auto.login) {
				Toast('即将跳转登录界面，请点击保存')
				setTimeout(()=>{
					chrome.tabs.create({
						url: 'https://passport.jd.com/new/login.aspx',
						active: true
					})
				},2000)
            }
        }
    }
};
</script>

<style scoped>
.settings-btn {
    margin: 3px;
}
</style>