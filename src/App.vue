<template>
  <div id="app" class="container">

    <h1>NES Emulator in Vue.js</h1>
    <ppu ref="ppu" />
    <cpu-2a03 ref="cpu" />
    <!-- Bring in our memory components -->
    <memorybus title="Main RAM" size="65536" addressible="65536" ref="memory" />
    <!-- Our 256 bytes of OAM memory -->
    <memorybus title="OAM Memory" ref="oam" addressible="256" size="256" />
    <!-- Our VRAM 16KB -->
    <memorybus title="VRAM" ref="vram" size="16384" addressible="65536" />

    <!-- Bring in our rom loader -->
    <rom-loader  ref="loader" />

  </div>
</template>

<script>


import ppu from './components/ppu.vue';
import cpu2a03 from './components/cpu-2a03.vue';
import memorybus from './components/memorybus.vue';
import romLoader from './components/rom-loader.vue';

window._ = require('lodash');
window.Popper = require('popper.js').default;
window.$ = window.jQuery = require('jquery');
require('bootstrap');

export default {
  name: 'app',
  components: {
    'cpu-2a03': cpu2a03,
    'memorybus': memorybus,
    'rom-loader': romLoader,
    'ppu': ppu
  }
}
</script>

<style lang="scss">
@import '~bootstrap/scss/bootstrap.scss';

body {
  padding-bottom: 32px;
}

</style>
