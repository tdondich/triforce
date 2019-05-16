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

  </div>
</template>

<script>
import Cpu from "../cpu";
import Memory from "../memory";
import Databus from '../databus';
import Loader from '../loader';

export default {
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
  created() {
    this.running = false;

    // Create our CPU instance
    this.cpu = new Cpu();


    // Create fake ppu memory
    let ppu = new Memory(8);

    this.cpu.connectPpu(ppu);

    // Create our rom loader
    this.loader = new Loader();
    this.loader.$on('loaded', this.start);

    // Create main memory bus
    this.mainbus = new Databus(65536, [
      {
        ref: this.cpu.getRegisterMemory(),
        min: 0x0000,
        max: 0x1fff,
        size: 2048
      },
      // Note, the ppu registers will continue to mirror every 8 bytes in this space
      {
        ref: ppu,
        min: 0x2000,
        max: 0x3fff,
        size: 8
      },
      {
        ref: this.cpu,
        min: 0x4000,
        max: 0x4015,
        size: 22
      },
      {
        ref: new Memory(2),
        min: 0x4016,
        max: 0x4017,
        size: 2
      },
      {
        ref: new Memory(8),
        min: 0x4018,
        max: 0x401f,
        size: 8
      },
      {
        ref: this.loader,
        min: 0x4020,
        max: 0xffff,
        size: 49120,
        bus: "prg"
      }
    ]);

    this.cpu.connectMemory(this.mainbus);


  },
  mounted() {
    // Set the test rom
    this.loader.setRom("nestest");
    // Set starting point for CPU
    this.cpu.setForceVector("0xC000");
    // Set breakpoint to the start of nestest ROM headless test mode
    this.cpu.setBreakpoint(0xe756, () => {
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
        this.loader.load();
      });
    },
    start() {
      // catch current time
      this.startTime = Date.now();
      this.running = true;
      this.cpu.reset();
      this.cpu.power();
      this.run();
      // execute cpu as fast as possible in loop
    },
    // Execute the CPU as fast as possible
    run() {
      while (this.running) {
        this.cpu.tick();
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
      this.cpu.reset();

      if (this.iteration < this.total) {
        // Go again
        this.$nextTick(() => {
          this.loader.load();
        });
      }
    }
  }
};
</script>
