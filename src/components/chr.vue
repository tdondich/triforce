<template>
  <div>
    <h2>CHR Data</h2>
    <canvas id="chr-left" width="128" height="128" />
    <canvas id="chr-right" width="128" height="128" />
    <br>
    <p>
      <button class="btn btn-primary" @click="redraw('left'); redraw('right');">Redraw</button>
    </p>

  </div>

</template>

<script>
/*
Checks to see if a certain bit is set in a passed in value
 */
function isBitSet(value, index) {
  let mask = 1 << index;
  return (value & mask) != 0;
}

export default {
  props: ["size", "title"],
  data: function() {
    return {};
  },
  created() {
    // To avoid proxyGetter
    this.realSize = this.size
    this.$_memory = new Uint8Array(this.size);
    this.get = (address) => {
     return this.$_memory[address];
    };
  },
  methods: {
    reset: function() {
      this.$_memory.fill(0);
    },
    // Fill a memory range with a specific value
    fill(value = 0x00, start = 0, end = this.$_memory.length) {
      this.$_memory.fill(value, start, end + 1);
    },
    resolveRead(address) {
      return () => {
        return this.$_memory[address];
      }

    },
    resolveWrite(address) {
      return (value) => {
        this.$_memory[address] = value;
      };
    },
    resolveRead(address) {
      return () => {
        return this.get(address);
      };
    },
    set(address, value) {
     this.$_memory[address] = value;
    },
    getRange(address, length) {
     return this.$_memory.slice(address, address + length);
    },

    redraw(pane = "left") {
      let c = document.getElementById("chr-" + pane);
      let ctx = c.getContext("2d");
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 255;

      // Draw the patterns
      // We are doing a 16x16 grid
      let xBase = 0;
      let yBase = 0;
      for (let tileNumber = 0; tileNumber < 256; tileNumber++) {
        let base = tileNumber << 4;
        if (pane != "left") {
          base = base | 0x1000;
        }
        for (let y = 0; y < 8; y++) {
          // Get first plane
          let first = this.get(base + y);
          // Get second plane
          let second = this.get(base + y + 8);

          for (let x = 0; x < 8; x++) {
            if (!isBitSet(first, x) && !isBitSet(second, x)) {
              // Color value is 0
              r = g = b = 255;
            } else if (isBitSet(first, x) && isBitSet(second, x)) {
              // color value is 3
              r = g = b = 0;
            } else if (isBitSet(first, x)) {
              // Color value is 1
              r = g = b = 125;
            } else {
              // Color value is 2
              r = g = b = 65;
            }
            ctx.fillStyle =
              "rgba(" + r + "," + g + "," + b + "," + a / 255 + ")";
            ctx.fillRect(xBase + (7 - x), yBase + y, 1, 1);
          }
        }
        xBase = xBase + 8;
        // 128 = 8 bits * 16
        if (xBase >= 128) {
          xBase = 0;
          yBase = yBase + 8;
        }
      }
    }
  }
};
</script>

<style lang="scss" scoped>
canvas {
  border: 1px solid red;
}
</style>
