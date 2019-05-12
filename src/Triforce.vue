<template>
  <div class="w-full h-full bg-black flex flex-col">
    <div class="border-b border-grey-darkest h-16 p-2 flex items-center flex-no-shrink">
      <img
        class="h-full"
        src="@/images/triforce.png"
      >
    </div>
    <div class="flex flex-grow">
      <div class="w-1/2 video-bg">
        <ppu
          ref="ppu"
          :console="this"
        ></ppu>
      </div>
      <div class="w-1/2 h-full max-h-full border-l border-black overflow-auto p-4 flex-no-grow">

        <div class="bg-grey-dark rounded border border-grey p-4 mb-4">
          <h2 class="mb-1">Emulator Controls</h2>
          <div class="btn-group">
            <button
              class="btn btn-primary"
              v-if="!displayStepEnabled"
              @click="toggleStep"
            >Enable Step Debugging</button>
            <div v-else>
              Interval:
              <input v-model="stepInterval">
              <button
                class="btn btn-primary"
                @click="tick"
              >Step Forward</button>
              <button
                class="btn btn-primary"
                @click="toggleStep"
              >Stop Step Debugging</button>
            </div>
          </div>
        </div>

        <div class="bg-grey-dark rounded border border-grey p-4 mb-4">

          <h2 class="mb-1">ROM Loader</h2>
          <rom-loader @loaded="power" ref="loader"></rom-loader>
        </div>

        <div class="bg-grey-dark rounded border border-grey p-4 mb-4">
          <h2 class="mb-1">Joypads</h2>
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
                  }"></joypads>
                  </div>


        <div class="bg-grey-dark rounded border border-grey p-4 mb-4">

          <h2 class="mb-1">2A03 CPU Emulator</h2>
          <cpu ref="cpu"></cpu>
        </div>

        <!-- 2KB internal RAM -->
        <memory ref="internal" title="Internal RAM" size="2048"></memory>

        <memory ref="disabled" title="Unused" size="8"></memory>

        <!-- Our palettes -->
        <palette ref="palette" title="Palette Memory" size="32"></palette>


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
                 ]"></databus>


        <!-- Our nametables but they'll be mirrored in the nametable memory bus -->
        <div class="my-4">
        <memory ref="nametable0" title="Nametable 0" size="1024"></memory>
        <memory ref="nametable1" title="Nametable 1" size="1024"></memory>
        <memory ref="nametable2" title="Nametable 2" size="1024"></memory>
        <memory ref="nametable3" title="Nametable 3" size="1024"></memory>
        </div>


        <div class="bg-grey-dark rounded border border-grey p-4 mb-4">

          <h2 class="mb-1">Nametable Databus</h2>
          <nametable-databus
            name="Nametable Databus"
            ref="nametablebus"
            size="4096"
          ></nametable-databus>
        </div>

        <div class="bg-grey-dark rounded border border-grey p-4 mb-4">

          <h2 class="mb-1">PPU Main Databus</h2>
          <databus
            name="PPU Main Databus"
            size="65536"
            ref="ppumainbus"
            :sections="[
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
                ]"
          ></databus>
        </div>

      </div>

    </div>
  </div>
</template>

<script>
export default {
  name: "triforce",

  data: function() {
    return {
      error: null,
      displayStepEnabled: false,
      stepEnabled: false,
      stepInterval: 1,
      stepsRemaining: 1
    };
  },
  created() {
    //this.stepEnabled = false;

    this.frameNotCompleted = true;

    this.debugTick = () => {
      this.frameNotCompleted = true;
      do {
        // Our PPU runs 3x the cpu
        this.cpu.tick();
        this.ppu.tick();
        this.ppu.tick();
        this.ppu.tick();
        this.stepsRemaining = this.stepsRemaining - 1;
      } while (this.frameNotCompleted && this.stepsRemaining); // && !this.stepEnabled);
      // Force the PPU to rerender it's contents, to show updated debug data
      this.ppu.$forceUpdate();
      this.stepsRemaining = this.stepInterval;
      this.joypads.tick();
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
      this.joypads.tick();
      this.ppu.render();
      requestAnimationFrame(this.tick);
    };
    // Set our initial tick method
    this.tick = this.prodTick;
  },
  mounted() {
    this.cpu = this.$refs.cpu;
    this.ppu = this.$refs.ppu;
    this.joypads = this.$refs.joypads;
  },
  methods: {
    toggleStep() {
      this.stepEnabled = !this.stepEnabled;
      this.displayStepEnabled = this.stepEnabled;

      if (this.stepEnabled) {
        this.tick = this.debugTick;
        // Turn on debug
        this.ppu.inDebug = true;
      } else {
        this.tick = this.prodTick;
        this.ppu.inDebug = false;
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

<style>
</style>


