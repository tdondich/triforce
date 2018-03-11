import Vue from 'vue'
import Console from './Console.vue'

Vue.config.productionTip = false

new Vue({
  render: h => h(Console)
}).$mount('#nes')
