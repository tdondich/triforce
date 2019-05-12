<template>
  <div>
    <h1>Browser CPU Benchmark</h1>

    <button
      class="btn"
      @click="begin"
    >Begin Benchmark</button>
    <h2>Current Benchmark State</h2>
    <div>
      Iteration: {{iteration}}
    </div>
    <div>
      Start Time: {{startTime}}
    </div>
    <div>
      End Time: {{endTime}}
    </div>
    <div>
        Execution Total: {{executionTotal}}
    </div>
    <div>
      Execution Average: {{executionAverage}}
    </div>
    <div>
      Execution Runtimes:
    </div>
    <div>
      {{executionTotals}}
    </div>

    <div class="hidden">

      <h2 class="mt-8">Rom Loader</h2>
      <rom-loader
        class=""
        ref="loader"
        @loaded="start"
      ></rom-loader>
      <h2 class="mt-8">CPU</h2>
      <cpu ref="cpu"></cpu>

      <!-- 2KB internal RAM -->
      <div class="">
        <memory
          ref="internal"
          title="Internal RAM"
          size="2048"
        ></memory>

        <memory
          ref="disabled"
          title="Unused"
          size="8"
        ></memory>

        <!-- Our palettes -->
        <palette
          ref="palette"
          title="Palette Memory"
          size="32"
        ></palette>

        <memory
          ref="ppu"
          title="Mock PPU Memory"
          size="8"
        ></memory>
        <memory
          ref="joypads"
          title="Mock Joypads Memory"
          size="2"
        ></memory>

        <databus
          name="Main Databus"
          size="65536"
          ref="mainbus"
          :sections="[
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
                ]"
        ></databus>

        <!-- Our nametables but they'll be mirrored in the nametable memory bus -->
        <div class="my-4">
          <memory
            ref="nametable0"
            title="Nametable 0"
            size="1024"
          ></memory>
          <memory
            ref="nametable1"
            title="Nametable 1"
            size="1024"
          ></memory>
          <memory
            ref="nametable2"
            title="Nametable 2"
            size="1024"
          ></memory>
          <memory
            ref="nametable3"
            title="Nametable 3"
            size="1024"
          ></memory>
        </div>

        <div class="bg-grey-dark rounded border border-grey p-4 mb-4">

          <h2 class="mb-1">Nametable Databus</h2>
          <nametable-databus
            name="Nametable Databus"
            ref="nametablebus"
            size="4096"
          ></nametable-databus>
        </div>

      </div>
    </div>

  </div>
</template>

<script>
export default {
  created() {
    // Create running variable
    this.running = false;
  },
  data() {
    return {
      running: false,
      startTime: null,
      endTime: null,
      executionTotals: [],
      executionTotal: 0,
      executionAverage: null,
      iteration: 0,
      total: 500
    };
  },
  mounted() {
    // Set the test rom
    this.$refs.loader.setRom("nestest");
    // Set starting point for CPU
    this.$refs.cpu.setForceVector("0xC000");
    // Set breakpoint to the start of nestest ROM headless test mode
    this.$refs.cpu.setBreakpoint(0xe756, () => {
      this.finish();
    });
  },
  methods: {
    begin() {
      this.iteration = 0;
      this.running = false;
      this.executionTotals = [];
      this.executionTotal = 0;
      this.executionAverage = 0;
      this.$nextTick(() => {
        // Load the test rom
        this.$refs.loader.load();
      });
    },
    start() {
      // catch current time
      this.startTime = Date.now();
      this.running = true;
      this.$refs.cpu.reset();
      this.$refs.cpu.power();
      this.run();
      // execute cpu as fast as possible in loop
    },
    // Execute the CPU as fast as possible
    run() {
      while (this.running) {
        this.$refs.cpu.tick();
      }
    },
    finish() {
      // Breakpoint reached, so set our running to false
      this.running = false;
      // Breakpoint reached
      this.endTime = Date.now();
      this.executionTotals[this.iteration] = this.endTime - this.startTime;
      this.executionTotal += this.executionTotals[this.iteration];
      this.executionAverage = this.executionTotal / this.iteration;
      this.iteration++;
      this.$refs.cpu.reset();

      if (this.iteration < this.total) {
        // Go again
        this.$nextTick(() => {
          this.$refs.loader.load();
        });
      }
    }
  }
};
</script>
