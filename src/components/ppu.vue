<template>
  <div>
    PPU Cycles: {{cycle}}<br>
    <canvas id="screen" class="screen" width="256" height="240"></canvas>

    <!-- Our OAM memory -->
    <memory ref="oamdata" title="OAM" size="256" />
        <databus ref="oam" name="OAM" :sections="[
              {
                  ref: 'oamdata',
                  min: 0x00,
                  max: 0xFF,
                  size: 256 
              }
          ]" />

    <!-- Secondary OAM Buffer -->
    <memory ref="secondaryoam" size="32" />

  </div>
</template>

<script>
import databus from "./databus.vue";
import memory from "./memory.vue";
import colors from "../mixins/colors";

function isBitSet(value, index) {
  let mask = 1 << index;
  return (value & mask) != 0;
}

const PRIORITY_FOREGROUND = 0;
const PRIORITY_BACKGROUND = 1;

window.colors = colors;

export default {
  components: {
    databus,
    memory
  },
  data: function() {
    return {
      cycle: 0
    };
  },
  created() {
    this.registers = new Uint8Array(8);
    // There are 341 cycles in each scanline
    // @todo Put this back in
    //this.cycle = 0;
    // There are 262 scanlines, starting with -1
    // See: https://wiki.nesdev.com/w/index.php/PPU_rendering
    this.scanline = -1;
    // Toggle even/odd frame
    this.odd = true;
    // The nametable "latch"
    this.nametableByte = null;
    // The attribute "latch"
    this.attributeTableByte = null;
    // The current VRAM address
    this.v = null;
    // The address latch for PPUADDR
    this.dataAddress = 0x0000;
    this.canvas = null;
    this.canvasCtx = null;

    // This feels so dirty, it's our frame cache, caching data for the existing frame
    this.frameCache = {};
    this.scanlineSpriteCache = [];

    // Rendering optimizations aka hacks
    this.frameBuffer = null;
    this.copyOfOAM = null;
    this.copyOfPatternTables = null;

    // @todo This is debug helpers
    this.oldCycleCount = 0;

    this.previousCycleCount = () => {
      let value = this.oldCycleCount;
      this.oldCycleCount = this.cycle;
      return value;

    };

    this.render = () => {
      this.canvasCtx.putImageData(this.frameBuffer, 0, 0);
    };

    this.tick = () => {
      // Setting up local vars to avoid property lookup costs
      let scanline = this.scanline;
      let cycle = this.cycle;

      if (scanline == -1 && cycle == 0) {
        // Fetch a local copy of data needed for performing caching of data for rendering
        this.copyOfOAM = this.$refs.oam.getRange(0x0000, 256);

        // Create a local copy of of the pattern table relevant to this scanline
        this.copyOfPatternTables = this.ppumainbus.getRange(0x0000, 8192);
      }
      if ((scanline == -1 || scanline == 261) && cycle % 8 == 1)  {
        // fetch the nametable and attribute byte for background
        this.fetchNametableAndAttributeByte();
      } else if (scanline <= 239) {
        // Visible scanlines
        if (cycle == 0) {
          // Build the scanline sprite cache for this scanline by reading OAM data and compiling
          // cache
          this.buildScanlineSpriteCache(scanline);
        } else if (cycle <= 257) {
          if (cycle % 8 == 1) {
            // fetch the nametable and attribute byte for background
            this.fetchNametableAndAttributeByte();
          }
        }
        if (this.renderingEnabled()) {
          this.renderPixel(cycle, scanline);
        }
      } else if (scanline == 241 && cycle == 1) {
        // Fire off Vblank
        this.setVBlank(true);
        // And fire VBlank NMI

        this.$parent.$refs.cpu.fireNMI();
      }

      if (++this.cycle == 341) {
        // Reset to cycle 0 and increase scanline
        this.cycle = 0;
        this.scanline = scanline == 261 ? -1 : scanline + 1;
        this.odd = !this.odd;
        // Return true to caller to indicate our frame is complete
        if (this.scanline == -1) {
          // Dirty dirty dirty
          this.frameCache = {};
          this.$parent.frameComplete = true;
        }
      }
      // We still have work to do on our frame
      return false;
    };
    this.fetchNametableAndAttributeByte = function() {
      // Get the base nametable address
      // @todo Not sure about this one
      // We need to find out which pixel we're at.  Each byte is a 8x8 pixel tile representation
      let address =
        this.baseNameTableAddress() +
        Math.floor(this.scanline / 8) * Math.floor(this.cycle / 8);
      this.nametableByte = this.ppumainbus.get(address);
      address = this.baseAttributeTableAddress();
      this.attributeTableByte = this.ppumainbus.get(address);
    };
  },
  mounted() {
    this.canvas = document.getElementById("screen");
    this.canvasCtx = this.canvas.getContext("2d");
    this.canvasCtx.imageSmoothingEnabled = false;

    this.frameBuffer = new ImageData(256, 240);

    // Ideally, this does not change.
    this.ppumainbus = this.$parent.$refs.ppumainbus;
  },
  methods: {
    ppumainbus() {
      return this.ppumainbus;
    },
    renderingEnabled() {
      // Need to check to see if background and sprites is meant to be rendered
      // Any of the bits for 3 and 4 should be set for rendering to be enabled
      return !((this.ppumask() & 0b11100111) == 0b11100111);
    },
    ppuctrl() {
      return this.registers[0x0000];
    },
    ppumask() {
      return this.registers[0x0001];
    },
    ppustatus() {
      return this.registers[0x0002];
    },
    oamaddr() {
      return this.registers[0x0003];
    },
    oamdata() {
      return this.registers[0x0004];
    },
    ppuscroll() {
      return this.registers[0x0005];
    },
    ppuaddr() {
      return this.registers[0x0006];
    },
    ppudata() {
      return this.registers[0x0007];
    },
    baseNameTableAddress() {
      // Base will be 0 - 3
      // See: http://wiki.nesdev.com/w/index.php/PPU_registers#PPUCTRL
      let base = this.ppuctrl() & 0b00000011;
      return 0x2000 + base * 0x400;
    },
    baseAttributeTableAddress() {
      // Attribute table starts after the nametable
      let base = this.baseNameTableAddress() + 0x3c0;
      return base;
    },
    basePatternTableAddress() {
      let base = this.ppuctrl() & 0b00010000;
      return base == 0b00010000 ? 0x0000 : 0x1000;
    },
    // The following fill/set/get is for our registers, accessed by memory
    // Fill a memory range with a specific value
    fill(value = 0x00, start = 0, end = this.memory.length) {
      this.registers.fill(value, start, end);
    },
    set(address, value) {
      this.registers[address] = value;
      // Now, check if we wrote to PPUADDR, if so, let's shift it into our dataAddress
      if (address == 0x0006) {
        this.dataAddress = this.dataAddress << 8;
        // Now, bring in the value to the left and mask it to a 16-bit address
        this.dataAddress = (this.dataAddress | value) & 0xffff;
      } else if (address == 0x0007) {
       // If this is the case, then we write to the address requested by this.dataAddress as well
        // and then increment the address
        this.ppumainbus.set(this.dataAddress, value);
        let increase = (this.ppuctrl() & 0b00000100) == 0b00000100 ? 32 : 1;
        this.dataAddress = (this.dataAddress + increase) & 0xffff;
      }
    },
    get(address) {
      if (address == 0x0007) {
        // Then we actually want to return from the VRAM address requested
        let result = this.ppumainbus.get(this.dataAddress);
        if (!this.$parent.$refs.cpu.inDebug) {
          let increase = (this.ppuctrl() & 0b00000100) == 0b00000100 ? 32 : 1;
          // @todo Increase VRAM address
          this.dataAddress = (this.dataAddress + increase) & 0xffff;
        }
        return result;
      } else if (address == 0x0002) {
        let result = this.registers[address];
        if (!this.$parent.$refs.cpu.inDebug) {
          // This is reading the PPU status register so be sure to clear vblank.
          // @todo This really should be done to emulate correct, but we're going to reset
          // the vblank at the pre-rendering scanline
          //this.setVBlank(false);
          this.statusRegisterReadFlag = !this.statusRegisterReadFlag;
          // Reset address latch used by PPUADDR and PPUSCROLL
          // See: https://wiki.nesdev.com/w/index.php/PPU_registers#Notes
          this.dataAddress = 0x00;
        }
        return result;
      }
      return this.registers[address];
    },
    setPPUCtrl(val) {
      this.registers[0x0000] = val & 0xff;
    },
    setPPUMask(val) {
      this.registers[0x0001] = val & 0xff;
    },
    setPPUStatus(val) {
      this.registers[0x0002] = val & 0xff;
    },
    setOAMAddr(val) {
      this.registers[0x0003] = val & 0xff;
    },
    setOAMData(val) {
      this.registers[0x0004] = val & 0xff;
    },
    setPPUScroll(val) {
      this.registers[0x0005] = val & 0xff;
    },
    setPPUAddress(val) {
      this.registers[0x0006] = val & 0xff;
    },
    setPPUData(val) {
      this.registers[0x0007] = val & 0xff;
    },
    setVBlank(val) {
      if (val) {
        this.setPPUStatus(this.ppustatus() | 0b10000000);
      } else {
        this.setPPUStatus(this.ppustatus() & 0b01111111);
      }
    },
    copyToOAM(address, value) {
      // Copy the info to the requested OAM address
      this.$refs.oam.set(address, value);
    },
    // See: http://wiki.nesdev.com/w/index.php/PPU_power_up_state
    reset() {
      // We set our registers after ~29658 cpu clicks (which we run 3x faster)
      // Set VBlank flag
      this.frameComplete = false;
      // @todo Make sure writes to these registers aren't valid until after the needed 
      // cpu clicks
      this.setPPUStatus(0x80);
      this.setOAMAddr(0x2f);
      this.setPPUAddress(0x00);
  },
    // Fetch first sprite pixel information that falls within an x,y coordinate, given the current
    // sprite size configuration

    buildScanlineSpriteCache(y) {
      // Reset
      this.scanlineSpriteCache = [];
      let matches = 0;

      for (let spriteNumber = 0; spriteNumber < 64; spriteNumber++) {
        // Base is the base address of the currently evaluated sprite
        let base = spriteNumber * 4;
        let spriteY = this.copyOfOAM[base];

        // Assume 8x8 sprites for the time being
        // @todo Handle 8x16 sprite configuration
        if (spriteY == 0xef || spriteY == 0xff) {
          // Skip this sprite
          continue;
        }
        if (y >= spriteY && y < spriteY + 8) {
          let spriteX = this.copyOfOAM[base + 3];

          let attributeByte = this.copyOfOAM[base + 2];
          // Desired pixel falls within the sprite bounds
          // Get desired palette
          let desiredPalette = (attributeByte & 0b00000011) + 4;
          // @ Note, handle attributes for flipping tile vert/horiz
          let tileIndex = this.copyOfOAM[base + 1];

          let tileBase = tileIndex << 4;
          // Find the relative y position of the sprite
          let tileY = y - spriteY;
          tileBase = tileBase | this.basePatternTableAddress();
          // Get first plane
          let first = this.copyOfPatternTables[tileBase + tileY];
          // Get second plane
          let second = this.copyOfPatternTables[tileBase + tileY + 8];

          // Sprite belongs on this scanline
          this.scanlineSpriteCache[matches] = {
            spriteX: spriteX,
            tileIndex: tileIndex,
            first: first,
            second: second,
            palette: desiredPalette,
            priority:
              (attributeByte & 0b00100000) == 0b00100000
                ? PRIORITY_BACKGROUND
                : PRIORITY_FOREGROUND
          };
          matches = matches + 1;
          // We only cache the first 8 matching sprites on the scanline
          if (matches == 8) {
            return;
          }
        }
      }
    },

    fetchVisibleSpritePixelInformation(x) {
      let tileCacheCount = this.scanlineSpriteCache.length;
      for (
        let spriteNumber = 0;
        spriteNumber < tileCacheCount;
        spriteNumber++
      ) {
        let item = this.scanlineSpriteCache[spriteNumber];
        if (x >= item.spriteX && x < item.spriteX + 8) {
          // This sprite falls within our X requested coordinate
          // Now pull the first/second byte for the tile for this scanline
          let tileX = 7 - (x - item.spriteX);
          let colorIndex = 2;
          if (!isBitSet(item.first, tileX) && !isBitSet(item.second, tileX)) {
            // Color value is 0
            colorIndex = 0;
          } else if (
            isBitSet(item.first, tileX) &&
            isBitSet(item.second, tileX)
          ) {
            // color value is 3
            colorIndex = 3;
          } else if (isBitSet(item.first, tileX)) {
            // Color value is 1
            colorIndex = 1;
          }

          return {
            colorIndex: colorIndex,
            palette: item.palette
          };
        }
      }
      return null;
    },
    // Index represents the tile number to fetch
    // X is x coordinate of the tile
    // Y is y coordinate
    fetchTilePixelColor(index, x, y) {
      // Remember to flip x in order to get the tile in the right order
      x = 8 - x;
      let base = index << 4;
      base = base | this.basePatternTableAddress();
      // Get first plane
      let first = this.copyOfOAM[base + y];
      // Get second plane
      let second = this.copyOfOAM[base + y + 8];

      if (!isBitSet(first, x) && !isBitSet(second, x)) {
        // Color value is 0
        return 0;
      } else if (isBitSet(first, x) && isBitSet(second, x)) {
        // color value is 3
        return 3;
      } else if (isBitSet(first, x)) {
        // Color value is 1
        return 1;
      } else {
        // Color value is 2
        return 2;
      }
    },
    // Fetch the color hex code for the requested palette and colorIndex combo
    // See: mixins/colors.js
    fetchColor(palette, colorIndex) {
      if (colorIndex == 0) {
        throw "Invalid colorIndex for fetchColor";
      }
      // Base will point to our palette starting address
      // There are three bytes to a palette
      let base = 0x3f01 + palette * 4;

      return colors[this.ppumainbus.get(base + (colorIndex - 1))];
    },

    // Renders a requested pixel, utilizing the scanline tile cache for sprites
    renderPixel(x, y) {
      if (y < 0 || y > 239) {
        // Not a visible coordinate
        return;
      }
      // Okay, visible coordinate, get the universal background color
      if (this.frameCache.universalBackgroundColor == null) {
        this.frameCache.universalBackgroundColor =
          colors[this.ppumainbus.get(0x3f00)];
      }

      let backgroundColorIndex = 0;

      // Sprite fetching
      let activeSpritePixelInformation = this.fetchVisibleSpritePixelInformation(
        x
      );

      // Background fetching
      // Okay, fetch the tile pixel color for background
      let tileX = x % 8;
      let tileY = y % 8;

      let pixelColor = this.fetchTilePixelColor(
        this.nametableByte,
        tileX,
        tileY
      );

      if (pixelColor == 1) {
        backgroundColorIndex = 1;
      } else if (pixelColor == 2) {
        backgroundColorIndex = 2;
      } else if (pixelColor == 3) {
        backgroundColorIndex = 3;
      }

      // Now do pixel evaluation
      let palette = null;
      let colorIndex = null;
      let color = null;

      if (
        backgroundColorIndex == 0 &&
        (activeSpritePixelInformation == null ||
          activeSpritePixelInformation.colorIndex == 0)
      ) {
        color = this.frameCache.universalBackgroundColor;
      } else {
        if (
          activeSpritePixelInformation &&
          activeSpritePixelInformation.colorIndex
        ) {
          colorIndex = activeSpritePixelInformation.colorIndex;
          palette = activeSpritePixelInformation.palette;
        } else {
          //colorIndex = backgroundColorIndex;
          // @todo Find proper palette number for background attribute byte and x/y offset
          //palette = 0;
        }
        // @note How about here?
        color = this.fetchColor(palette, colorIndex);
      }

      // Write to our framebuffer
      let base = (y * 256 + x) * 4;
      //R
      this.frameBuffer.data[base] = color[0];
      //G
      this.frameBuffer.data[base + 1] = color[1];
      // B
      this.frameBuffer.data[base + 2] = color[2];
      // A
      this.frameBuffer.data[base + 3] = 255;
    }
  }
};
</script>

<style lang="scss" scoped>
.screen {
  border: 1px solid gray;
}
</style>


