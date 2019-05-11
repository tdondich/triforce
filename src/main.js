import Vue from 'vue'
import Triforce from './Triforce.vue'

// Bring in our components
import cpu from './components/cpu';
import memory from './components/memory';
import romLoader from './components/rom-loader';
import mapper0 from './components/mappers/mapper-0';
import chr from './components/chr';
import databus from './components/databus';
import nametableDatabus from './components/nametable-databus';
import ppu from './components/ppu';
import palette from './components/palette';
import joypads from './components/joypads';

import '@/css/triforce.css'

Vue.config.productionTip = false

Vue.component('cpu', cpu);
Vue.component('memory', memory);
Vue.component('rom-loader', romLoader);
Vue.component('mapper-0', mapper0);
Vue.component('chr', chr);
Vue.component('databus', databus);
Vue.component('nametable-databus', nametableDatabus);
Vue.component('ppu', ppu);
Vue.component('palette', palette);
Vue.component('joypads', joypads);

new Vue({
  render: h => h(Triforce),
}).$mount('#triforce')
