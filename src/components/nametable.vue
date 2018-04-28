<template>
    <div>
        <h2>Nametable {{title}}</h2>
        <select v-model="base">
            <option :value="0x0000">0x0000</option>
            <option :value="0x1000">0x1000</option>
        </select> <button @click="redraw">Render</button><br>
        <canvas :id="'nametable-' + title" width="256" height="240" />
    </div>
</template>

<script>
function isBitSet(value, index) {
  let mask = 1 << index;
  return (value & mask) != 0;
}

export default {
  props: ["size", "title"],
  data: function() {
    return {
      // Empty. Memory is now a non-reactive data element
      base: '0x0000'
    };
  },
  created() {
    this.realSize = this.size;
    this.$_memory = new Uint8Array(this.size);
    this.set = (address, value) => {
      // Disabled check for performance reasons
      /*
            if(address >= this.realSize) {
                // Should never happen
                throw "Address exceeds memory size";
            }
            */
      this.$_memory[address] = value;
    };
    this.get = address => {
      // Disabled check for performance reasons
      /*
            if(address >= this.realSize) {
                // Should never happen
                throw "Address exceeds memory size";
            }
            */
      return this.$_memory[address];
    };
    this.getRange = (address, length) => {
      // Disable check for performance reasons
      /*
            if((address + (length - 1)) >= this.realSize) {
                throw "Address range exceeds memory size";
            }
            */
      return this.$_memory.slice(address, address + length);
    };
  },
  methods: {
    redraw() {
      let c = document.getElementById("nametable-" + this.title);
      let ctx = c.getContext("2d");
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 255;

      // Draw the patterns in this nametable
      // We are doing a 32x30 grid
      let xBase = 0;
      let yBase = 0;
      for (let count = 0; count < 960; count++) {
        let tileNumber = this.get(count);
        let base = tileNumber << 4;
        // Point our base address to the requested pattern table
        base = base | this.base;
        for (let y = 0; y < 8; y++) {
          // Get first plane
          let first = this.$parent.$refs.ppumainbus.get(base + y);
          // Get second plane
          let second = this.$parent.$refs.ppumainbus.get(base + y + 8);

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
        if (xBase >= 256) {
          xBase = 0;
          yBase = yBase + 8;
        }
      }
    },

    resolveRead(address) {
      return () => {
        return this.$_memory[address];
      };
    },
    resolveWrite(address) {
      return value => {
        this.$_memory[address] = value;
      };
    },
    reset: function() {
      this.$_memory.fill(0);
    },
    // Fill a memory range with a specific value
    fill(value = 0x00, start = 0, end = this.$_memory.length) {
      this.$_memory.fill(value, start, end + 1);
    }
  }
};
</script>

<style lang="scss" scoped>
canvas {
  border: 1px solid red;
}
</style>

