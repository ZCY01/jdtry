import Vue from 'vue'
import App from '../components/App.vue'
import { Tab, Tabs } from 'vant'
import { List } from 'vant'
import { Cell, CellGroup } from 'vant';
import { Button } from 'vant';
import { Field } from 'vant';
import { Tag } from 'vant';
import { Tabbar, TabbarItem } from 'vant';

import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import { Icon } from 'vant';
import { Sticky } from 'vant';
import { Stepper } from 'vant';
import { Col, Row } from 'vant';
import { Search } from 'vant';
import '@vant/touch-emulator';
import { Toast } from 'vant';
import { Dialog } from 'vant';
import { Loading } from 'vant';
import { Progress } from 'vant';

import { Switch } from 'vant';
import { Divider } from 'vant';
import { Circle } from 'vant';

Vue.use(Circle);

Vue.use(Divider);

Vue.use(Switch);
Vue.use(Progress);

Vue.use(Loading);

Vue.use(Dialog);

Vue.use(Toast);


Vue.use(Search);

Vue.use(Col);
Vue.use(Row);

Vue.use(Stepper);

Vue.use(Sticky);

Vue.use(Icon);

function tippyElement(el) {
	setTimeout(() => {
		let title = el.getAttribute("title");
		if (title) {
			if (el._tippy) {
				el._tippy.setContent(title)
			} else {
				tippy(el, {
					content: title,
					arrow: false
				});
			}
		}
	}, 50);
}

Vue.directive("tippy", {
	componentUpdated: tippyElement,
	inserted: tippyElement
});

Vue.use(Tabbar);
Vue.use(TabbarItem);

Vue.use(Tag);

Vue.use(Field);
Vue.use(Button);
Vue.use(Cell);
Vue.use(CellGroup);
Vue.use(Tab)
Vue.use(Tabs)
Vue.use(List);
let popup = new Vue({
	el: '#app',
	render: h => h(App),
	components: {
		App
	}
})

//手动注销，缺一不可
window.onunload = ()=>{
	popup.$destroy()
	popup = null
}