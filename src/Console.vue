<template>
  <div id="app" class="container">

    <h1>NES Emulator in Vue.js</h1>

    <!-- Bring in our rom loader -->
    <rom-loader  ref="loader" />
    <hr>

    <cpu-2a03 ref="cpu" />

    <ppu ref="ppu" />


    <!-- 2KB internal RAM -->
    <memory ref="internal" size="2048" />

    <!-- Our nametables -->
    <memory ref="nametable0" size="1024" />
    <memory ref="nametable1" size="1024" />
    <memory ref="nametable2" size="1024" />
    <memory ref="nametable3" size="1024" />
    <!-- Our palettes -->
    <memory ref="palette" size="32" />

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
        ref: 'loader',
        min: 0x4020,
        max: 0xFFFF,
        size: 49120,
        bus: 'prg'
      }
   ]" />




    <databus name="Nametable Databus" ref="nametablebus" size="4096" :sections="[
      {
          ref: 'nametable0',
          min: 0x0000,
          max: 0x03FF,
          size: 1024
      },
      {
          ref: 'nametable1',
          min: 0x0400,
          max: 0x07FF,
          size: 1024
      },
      {
          ref: 'nametable2',
          min: 0x0800,
          max: 0x0BFF,
          size: 1024,
      },
      {
          ref: 'nametable3',
          min: 0x0C00,
          max: 0x0FFF,
          size: 1024
      }
    ]" />

  <databus name="PPU Sub Databus" size="16384" ref="ppusubbus" :sections="[
      // This represents our pattern tables
      {
          ref: 'loader',
          min: 0x0000,
          max: 0x1FFF,
          bus: 'chr',
          size: 8192
      },
      // The following repeats the nametables twice
      {
          ref: 'nametablebus',
          min: 0x2000,
          max: 0x3EFF,
          size: 4096
      },
      {
          ref: 'palette',
          min: 0x3F00,
          max: 0x3FFF,
          size: 32
      }
  ]" />

  <!-- Now, our main data bus for the ppu, providing for the full 64K address space -->
  <databus name="PPU Main Databus" size="65536" ref="ppumainbus" :sections="[
      {
          ref: 'ppusubbus',
          min: 0x0000,
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

//require('bootstrap');

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
