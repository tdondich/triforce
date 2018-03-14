<template>
  <div id="app" class="container">

    <h1>NES Emulator in Vue.js</h1>

    <cpu-2a03 ref="cpu" />

    <ppu ref="ppu" />

    <!-- 2KB internal RAM -->
    <memory ref="internal" size="2048" />

    <!-- Expansion ROM -->
    <memory ref="expansion" size="8160" />

    <!-- SRAM -->
    <memory ref="sram" size="8192" />

    <!-- PRG-ROM Lower -->
    <memory ref="prglow" size="16384" />

    <!-- PRG-ROM Higher -->
    <memory ref="prghigh" size="16384" />

    <!-- Bring in our rom loader -->
    <rom-loader  ref="loader" />

    <!-- Now, tie it all together with an address bus for cpu -->
    <databus name="Main Databus" size="65536" ref="mainbus" :sections="[
      {
        ref: 'internal',
        min: 0x0000,
        max: 0x1FFF,
        size: 2048
      },
      // Note, the ppu registers will continue to mirror every 8 bytes in this space
      {
        ref: 'ppu',
        min: 0x2000,
        max: 0x3FFF,
        size: 8
      },
      {
        ref: 'cpu',
        min: 0x4000,
        max: 0x401F,
        size: 32
      },
      {
        ref: 'expansion',
        min: '0x4020',
        max: '0x5FFF',
        size: 8160
      },
      {
        ref: 'sram',
        min: 0x6000,
        max: 0x7FFF,
        size: 8192
      },
      {
        ref: 'prglow',
        min: 0x8000,
        max: 0xBFFF,
        size: 16384
      },
      {
        ref: 'prghigh',
        min: 0xC000,
        max: 0xFFFF,
        size: 16384
      }
    ]" />

    
  </div>
</template>

<script>


import ppu from './components/ppu.vue';
import cpu2a03 from './components/cpu-2a03.vue';
import memory from './components/memory.vue';
import romLoader from './components/rom-loader.vue';
import databus from './components/databus.vue';

window._ = require('lodash');
window.Popper = require('popper.js').default;
window.$ = window.jQuery = require('jquery');
require('bootstrap');

export default {
  name: 'app',
  data: function() {
    return {
      error: null,
      cpuTicks: 0
    }
  },
  components: {
    'cpu-2a03': cpu2a03,
    'memory': memory,
    'rom-loader': romLoader,
    'ppu': ppu,
    'databus': databus
  },
  methods: {
    power() {
      this.$refs.cpu.power();
      this.$refs.ppu.reset();
      this.tick();
   },
    reset() {
      this.$refs.cpu.reset();
      this.$refs.ppu.reset();
      this.tick();
   },
    tick() {
      // Calc each frame, at 60 frames per second
      // This means the cpu can do 30,000 cycles per frame,
      // And that means we need to set a timeout to 1000 / 60. ~16ms
      // @todo, we should make it more accurate, doing a diff of time
      do {
        // Our PPU runs 3x the cpu
        this.$refs.ppu.tick();
        this.$refs.ppu.tick();
        this.$refs.ppu.tick();
        this.$refs.cpu.tick();
        this.cpuTicks = this.cpuTicks + 1;
      } while(this.cpuTicks < 30000);
      this.cpuTicks = 0;
      setTimeout(this.tick, 16);
    }
  }
}
</script>

<style lang="scss">
@import '~bootstrap/scss/bootstrap.scss';

body {
  padding-bottom: 32px;
}

</style>
