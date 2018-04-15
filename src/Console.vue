<template>
  <div id="app" class="container">

    <h1>NES Emulator in Vue.js</h1>

    <!-- Bring in our rom loader -->
    <rom-loader ref="loader" />
    <hr>

    <div class="btn-group">
      <button class="btn btn-primary" v-if="!displayStepEnabled" @click="toggleStep">Enable Step Debugging</button>
      <div v-else>
        <button class="btn btn-primary" @click="tick">Step Forward</button>
        <button class="btn btn-primary" @click="toggleStep">Stop Step Debugging</button>
      </div>
    </div>
    <br>
    <br>

    <cpu-2a03 ref="cpu" />

    <ppu ref="ppu" :console="this" />

    <joypads ref="joypads" :config="{
      one: {
        38: 'up',
        40: 'down',
        37: 'left',
        39: 'right',
        188: 'select',
        190: 'start',
        90: 'b',
        88: 'a'
      },
      two: {
        // Disabled
      }
    }" />

    <!-- 2KB internal RAM -->
    <memory ref="internal" size="2048" />

    <memory ref="disabled" size="8" />

    <!-- Our nametables -->
    <memory ref="nametable0" size="1024" />
    <memory ref="nametable1" size="1024" />
    <memory ref="nametable2" size="1024" />
    <memory ref="nametable3" size="1024" />
    <!-- Our palettes -->
    <palette ref="palette" size="32" />

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
        max: 0x4015,
        size: 22
      },
      {
        ref: 'joypads',
        min: 0x4016,
        max: 0x4017,
        size: 2
      },
      {
        ref: 'disabled',
        min: 0x4018,
        max: 0x401F,
        size: 8
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

    <!-- Now, our main data bus for the ppu, providing for the full 64K address space -->
    <!-- Note, we are duplicating the items 4 times due to the fact that nested databus's stink in performance -->
    <databus name="PPU Main Databus" size="65536" ref="ppumainbus" :sections="[
     // This represents our pattern tables
      {
          ref: 'loader',
          min: 0x0000,
          max: 0x1FFF,
          bus: 'chr',
          size: 8192
      },
      {
        ref: 'nametablebus',
        min: 0x2000,
        max: 0x2FFF,
        size: 4096
      },
      {
        ref: 'nametablebus',
        min: 0x3000,
        max: 0x3EFF,
        size: 3840
      },
      {
          ref: 'palette',
          min: 0x3F00,
          max: 0x3FFF,
          size: 32
      },
      // This represents our pattern tables
      {
          ref: 'loader',
          min: 0x4000,
          max: 0x5FFF,
          bus: 'chr',
          size: 8192
      },
      // The following repeats the nametables twice
      {
          ref: 'nametablebus',
          min: 0x6000,
          max: 0x7EFF,
          size: 4096
      },
      {
          ref: 'palette',
          min: 0x7F00,
          max: 0x7FFF,
          size: 32
      },
      // This represents our pattern tables
      {
          ref: 'loader',
          min: 0x8000,
          max: 0x9FFF,
          bus: 'chr',
          size: 8192
      },
      // The following repeats the nametables twice
      {
          ref: 'nametablebus',
          min: 0xA000,
          max: 0xBEFF,
          size: 4096
      },
      {
          ref: 'palette',
          min: 0xBF00,
          max: 0xBFFF,
          size: 32
      },
      // This represents our pattern tables
      {
          ref: 'loader',
          min: 0xC000,
          max: 0xDFFF,
          bus: 'chr',
          size: 8192
      },
      // The following repeats the nametables twice
      {
          ref: 'nametablebus',
          min: 0xE000,
          max: 0xFEFF,
          size: 4096
      },
      {
          ref: 'palette',
          min: 0xFF00,
          max: 0xFFFF,
          size: 32
      }
  ]" />

  </div>

</template>

<script>
import ppu from "./components/ppu.vue";
import cpu2a03 from "./components/cpu-2a03.vue";
import memory from "./components/memory.vue";
import romLoader from "./components/rom-loader.vue";
import databus from "./components/databus.vue";
import debugmemory from "./components/debugmemory.vue";
import joypads from "./components/joypads.vue";
import palette from "./components/palette.vue";

export default {
  name: "app",
  data: function() {
    return {
      error: null,
      displayStepEnabled: false
    };
  },
  components: {
    "cpu-2a03": cpu2a03,
    memory: memory,
    "rom-loader": romLoader,
    ppu: ppu,
    databus: databus,
    debugmemory,
    joypads,
    palette
  },
  created() {
    this.stepEnabled = false;
    
    this.frameNotCompleted = true;

    this.debugTick = () => {
     this.frameNotCompleted = true;
      do {
        // Our PPU runs 3x the cpu
        this.cpu.tick();
        this.ppu.tick();
        this.ppu.tick();
        this.ppu.tick();
      } while (this.frameNotCompleted && !this.stepEnabled);
      this.ppu.render();
      if (!this.stepEnabled) {
        requestAnimationFrame(this.tick);
      }
    };
    this.prodTick = () => {
     this.frameNotCompleted = true;
      do {
        // Our PPU runs 3x the cpu
        this.cpu.tick();
        this.ppu.tick();
        this.ppu.tick();
        this.ppu.tick();
      } while (this.frameNotCompleted);
      this.ppu.render();
      requestAnimationFrame(this.tick);
    };
    // Set our initial tick method
    this.tick = this.prodTick;
 
  },
  mounted() {
    this.cpu = this.$refs.cpu;
    this.ppu = this.$refs.ppu;
  },
  methods: {
    toggleStep() {
      this.stepEnabled = !this.stepEnabled;
      this.displayStepEnabled = this.stepEnabled;

      if(this.stepEnabled) {
        this.tick = this.debugTick;
      } else {
        this.tick = this.prodTick;
      }

      // Restart game loop
      setTimeout(this.tick, 10);
    },
    power() {
      this.$refs.ppu.reset();
      this.$refs.cpu.power();
      requestAnimationFrame(this.tick);
    },
    reset() {
      this.$refs.ppu.reset();
      this.$refs.cpu.reset();
      requestAnimationFrame(this.tick);
    }
  }
};
</script>

<style lang="scss">
@import "~bootstrap/scss/bootstrap.scss";

body {
  padding-top: 32px;
  padding-bottom: 32px;
}
</style>
