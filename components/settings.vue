<template>
<van-list>

    <van-cell v-for="item in settings" :key="item.name" :title="item.text">
        <template #label>
            <span v-for="btn of item.btns" :key="btn.value">
                <van-button :type="btn.selected?'info':'default'" @click="selected(btn)" class="settings-btn" >
                    {{btn.text}}
                </van-button>
            </span>
        </template>
    </van-cell>
    <van-cell title="定时启动" center>
        <van-stepper disabled v-model="auto.runtime" style="width:100px;float:left" min="0" max="23" title="每天" v-tippy @change="switchStatusChange"></van-stepper>
        <van-switch disabled v-model="auto.run" style="float:right" @change="switchStatusChange"></van-switch>
    </van-cell>
    <van-cell title="自动登录" center>
        <van-switch disabled v-model="auto.login" @change="switchStatusChange"></van-switch>
    </van-cell>



</van-list>
</template>

<script>
import {
    storage
} from "../static/utils";

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
        switchStatusChange() {
			storage.set({
                auto: this.auto
            });

            chrome.runtime.sendMessage({
                action: "bg_update_auto_task",
				auto:this.auto
            })
        }
    }
};
</script>

<style scoped>
.settings-btn {
    margin: 3px;
}

</style>
