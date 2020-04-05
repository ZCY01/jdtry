<template>
<van-list v-model="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
    <van-sticky offset-top="44">
        <div class="search-tool-bar">
            <div title="搜索未来多少天内结束的商品" v-tippy class="time-title">
                时间：
            </div>
            <div>
                <van-stepper v-model="day" style="width:100px" min="1" max="24"></van-stepper>
            </div>
            <div>
                <van-search v-model="filter" placeholder="请输入搜索关键词" style="padding:5px" @clear="clear" @search="search"></van-search>
            </div>
            <div>
                <van-button plain hairline size="small" type="info" @click="search"> 搜索 </van-button>
            </div>
        </div>
    </van-sticky>

    <van-cell v-for="item of loadingList" :key="item.id" center>
        <img slot="icon" :src="item.pic_url" alt class="item-img" />
        <template #title>
            <div>
                <a class="item-name" :href="item.url" target="_blank">{{item.name}}</a>
                <div>
                    <div class="item-info">
                        <div class="van-cell__label item-info__bd">{{item.detail}}</div>
                        <div class="van-cell__label item-info__bd">京东价：{{item.price}}</div>
                        <div class="van-cell__label item-info__bd">结束时间：{{new Date(item.timestamp).toLocaleString('chinese',{hour12:false})}}</div>
                    </div>
                    <div class="item-actions">
                        <slot name="actions" :item="item"></slot>
                    </div>
                </div>
            </div>
        </template>
    </van-cell>
</van-list>
</template>

<script>
const PAGE_SIZE=20
export default {
    name: "itemsList",
    props: {
        list: Array,
        default_day: {
			type:Number,
			default:1
        }
	},
    data() {
        return {
            loading: false,
			finished: false,
			day:this.default_day,
			filter: "",
			page:1
        };
	},
	computed:{
		loadingList(){
			const listLength = this.list.length
			const pageLength = this.page * PAGE_SIZE
			const minLength = listLength > pageLength? pageLength:listLength
			if(pageLength >= listLength){
				this.finished = true
			}
			return this.list.slice(0,minLength)
		}
	},
    methods: {
        onLoad() {
			this.page ++
			this.loading=false
		},
		clear(){
			this.filter=''
			this.search()
		},
        search() {
            this.$emit('filter', {
                day: this.day,
                filter: this.filter.replace(/^\s*|\s*$/g, "")
            })
        }
    }

};
</script>

<style scoped>
.item-img {
    height: 60px;
	width: 60px;
	margin-right: 10px;
}

.item-info {
    font-size: 12px;
    float: left;
}

.item-info__bd {
    margin: 0px;
}

.item-actions {
    float: right;
    margin-top: 12px;
}

.search-tool-bar {
    width: 100%;
    height: 44px;
    background-color: #fff;
    /* display: flex;
    flex-direction: row;
    justify-content: center;
	align-items: center; */

    display: flex;
    justify-content: center;
    align-items: center;

}

.time-title {
    color: #323233;
    font-size: 14px;
    margin-right: 3px;
}
</style>
