var nesemu = new Vue({
  name: "app",
  el: '#app',
  data: function () {
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
})