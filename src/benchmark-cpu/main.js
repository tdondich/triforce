import Vue from 'vue'
import cpu from '../components/cpu'
import memory from '../components/memory'
import mapper0 from '../components/mappers/mapper-0'
import romLoader from '../components/rom-loader'
import Benchmark from './Benchmark'
import chr from '../components/chr'
import databus from '../components/databus'
import palette from '../components/palette'
import nametableDatabus from '../components/nametable-databus'

import '@/css/triforce.css'


Vue.config.productionTip = false

Vue.component('cpu', cpu)
Vue.component('memory', memory)
Vue.component('rom-loader', romLoader)
Vue.component('mapper-0', mapper0)
Vue.component('chr', chr)
Vue.component('databus', databus)
Vue.component('palette', palette)
Vue.component('nametable-databus', nametableDatabus)

new Vue({
  render: h => h(Benchmark),
}).$mount('#benchmark')
