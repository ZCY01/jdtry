export const settingConfig = [{
	text: "商品分类",
	name: "cids",
	btns: [{
			text: "家用电器",
			value: "737",
			selected: true
		},
		{
			text: "手机数码",
			value: "652,9987",
			selected: true
		},
		{
			text: "电脑办公",
			value: "670",
			selected: true
		},
		{
			text: "家居家装",
			value: "1620,6728,9847,9855,6196,15248,14065",
			selected: true
		},
		{
			text: "美妆护肤",
			value: "1316",
			selected: false
		},
		{
			text: "服饰鞋包",
			value: "1315,1672,1318,11729",
			selected: false
		},
		{
			text: "母婴玩具",
			value: "1319,6233",
			selected: false
		},
		{
			text: "生鲜美食",
			value: "12218",
			selected: false
		},
		{
			text: "图书音像",
			value: "1713,4051,4052,4053,7191,7192,5272",
			selected: false
		},
		{
			text: "钟表奢品",
			value: "5025,6144",
			selected: false
		},
		{
			text: "个人护理",
			value: "16750",
			selected: false
		},
		{
			text: "家庭清洁",
			value: "15901",
			selected: false
		},
		{
			text: "食品饮料",
			value: "1320,12259",
			selected: false
		},
		// {
		// 	text: "更多惊喜",
		// 	value: "4938,13314,6994,9192,12473,6196,5272,12379,13678,15083,15126,15980",
		// 	selected: false
		// }
	]
},
{
	text: "试用类型",
	name: "activityType",
	btns: [{
			text: "免费试用",
			value: "1",
			selected: true
		},
		{
			text: "闪电试",
			value: "3",
			selected: true
		},
		{
			text: "30天试用",
			value: "5",
			selected: false
		}
	]
}
];

export const ACTIVITY_STATUS={
	APPLY:0,
	APPLYING:1,
	APPLIED:2
}

export const USER_STATUS={
	LOGIN:0,
	LOGOUT:1,
	WARMING:2,
	UNKNOWN:3,
	LOGINING:4
}