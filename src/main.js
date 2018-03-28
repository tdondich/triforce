import Vue from 'vue'
import Console from './Console.vue'

import Bootstrap from 'bootstrap'

window.Bootstrap = Bootstrap;

Vue.config.productionTip = false

new Vue({
  render: h => h(Console)
}).$mount('#nes')
