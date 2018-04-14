<template>
  <div>
    <canvas id="screen" class="screen" width="256" height="240"></canvas>

  </div>
</template>

<script>
import databus from "./databus.vue";
import memory from "./memory.vue";
import colors from "../mixins/colors";

function isBitSet(value, index) {
  return (value & (1 << index)) != 0;
}

const PRIORITY_FOREGROUND = 0;
const PRIORITY_BACKGROUND = 1;

window.colors = colors;

export default {
  components: {
    databus,
    memory
  },
  props: ["console"],
  data: function() {
    return {
      //empty
    };
  },
  created() {
    this.registers = new Uint8Array(8);

    // Create our OAM array
    this.oam = new Uint8Array(256);


    // There are 341 cycles in each scanline
    this.cycle = 0;
    // There are 262 scanlines, starting with 0, they refrence 261 as -1 as well in the following link
    // See: https://wiki.nesdev.com/w/index.php/PPU_rendering
    this.scanline = 0;
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
    this.universalBackgroundColor = 0;
    this.scanlineSpriteCache = [];
    this.backgroundAndSpriteRendering = false;
    this.leftSideBackgroundAndSpriteFlag = false;
    this.NMIEnabled = false;
    this.renderingEnabled = false;

    // Rendering optimizations aka hacks
    this.frameBuffer = null;
    this.copyOfPatternTables = null;

    // @todo This is debug helpers
    this.oldCycleCount = 0;
    this.oldScanline = 0;

    this.previousCycleCount = () => {
      let value = this.oldCycleCount;
      this.oldCycleCount = this.cycle;
      return value;
    };

    this.previousScanline = () => {
      let value = this.oldScanline;
      this.oldScanline = this.scanline;
      return value;
    };

    this.render = () => {
      this.canvasCtx.putImageData(this.frameBuffer, 0, 0);
    };

    this.tick = () => {
      // Setting up local vars to avoid property lookup costs
      let scanline = this.scanline;
      let cycle = this.cycle;

      if (scanline <= 239 && cycle <= 257) {
          if(cycle == 0) {
            if(scanline == 0) {
              // Fetch a local copy of data needed for performing caching of data for rendering

              // Create a local copy of of the pattern table relevant to this scanline
              this.copyOfPatternTables = this.vram.getRange(0x0000, 8192);

              // Set the cache data for this frame
              this.universalBackgroundColor = colors[this.vram.get(0x3f00)];
            }
           // Build the scanline sprite cache for this scanline by reading OAM data and compiling
            // cache
            this.buildScanlineSpriteCache(scanline);
          } else if (cycle % 8 == 1) {
            // fetch the nametable and attribute byte for background

            // Get the base nametable address
            // We need to find out which pixel we're at.  Each byte is a 8x8 pixel tile representation

            // Base will be 0 - 3
            // See: http://wiki.nesdev.com/w/index.php/PPU_registers#PPUCTRL
      
            let baseAddress = (0x2000 + (this.registers[0x00] & 0b00000011) * 0x400);
            let address = baseAddress + 
              (Math.floor(scanline / 8) * 32 + Math.floor(cycle / 8));
            this.nametableByte = this.vram.get(address);

            // Now get attribute byte
            address = baseAddress + 0x3c0;

            let y = Math.floor(scanline / 32);
            let x = Math.floor(cycle / 32);
            address = address + ((y * 8) + x);
            this.attributeTableByte = this.vram.get(address);
          }
          this.renderPixel(cycle, scanline);

          // We don't need to evaluate further if statements since we know there are additional cycles
          // after this fact
          ++this.cycle;
          return;
      } else if (scanline == 241 && cycle == 1) {
        // Fire off Vblank
        this.registers[0x02] = this.registers[0x02] | 0b10000000;

        // And fire VBlank NMI if PPUCTRL bit 7 is set
        if (this.NMIEnabled) {
          this.cpu.nmi = 1;
        }
        ++this.cycle;
        return;
      } else if (scanline == 261 && cycle == 0) {
      // Clearing VBlank and sprite 0
        this.registers[0x02] = this.registers[0x02] & 0b00111111;
        ++this.cycle;
        return;
      }


      // Handle new scanline possibly
      if(++this.cycle >= 340) {
        // This first if will fire at cycle 340, if the frame is odd
        if(this.odd && this.renderingEnabled) {
          if(++this.scanline < 262) {
            this.cycle = 0;
            return;
          } else {
            this.scanline = this.cycle = 0;
            this.odd = false;
            this.console.frameNotCompleted = false;
            return;
          }
        } else {
          // This else fires if on even frame
          if(++this.scanline < 262) {
            this.cycle = 0;
          } else {
            this.scanline = this.cycle = 0;
            this.odd = true;
            this.console.frameNotCompleted = false;
            return;
          }
        }
      }
     // We still have work to do on our frame
      return;
    };
  },
  mounted() {
    this.vram = this.console.$refs.ppumainbus;
    this.cpu = this.console.$refs.cpu;

    this.canvas = this.$el.querySelector("#screen");
    this.canvasCtx = this.canvas.getContext("2d");
    this.canvasCtx.imageSmoothingEnabled = false;

    this.frameBuffer = this.canvasCtx.createImageData(256, 240);

    // Prefill frameBuffer.data with 255's to pre-populate alpha value
    this.frameBuffer.data.fill(255);

  },
  methods: {
    ppumainbus() {
      return this.vram;
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
   baseSpritePatternTableAddress() {
      // @todo check for sprite size, if 8x8 or 8x16
      let base = this.ppuctrl() & 0x08;
      return base == 0x08 ? 0x1000 : 0x0000;
    },
    // The following fill/set/get is for our registers, accessed by memory
    // Fill a memory range with a specific value
    fill(value = 0x00, start = 0, end = this.memory.length) {
      this.registers.fill(value, start, end);
    },
    set(address, value) {

      if (address == 0x0002) {
        // Do not do anything.  PPUSTATUS is read only
        return;
      }
      let oldValue = this.registers[address];
      this.registers[address] = value;
      // Now, check if we wrote to PPUADDR, if so, let's shift it into our dataAddress
      if(address == 0x0000) {
        // Check if nmi is set by checking bit 7
        this.NMIEnabled = (value & 0b10000000) == 0b10000000;
        // PPUCTRL write
        // Check to see if NMI is set while during vblank, if so, fire off an nmi immediately
        if ((this.NMIEnabled) 
        && ((oldValue & 0b10000000) == 0b00000000)
        && (this.ppustatus() & 0b10000000) == 0b10000000) {
          // NMI set, fire off nmi
          this.console.$refs.cpu.fireNMI();
        }
      } else if(address == 0x0001) {
        // Writing to MASK
        // So let's determine if backgroundAndSpriteRendering is enabled
        this.backgroundAndSpriteRendering = ((value & 0b00011000) == 0b00011000);
        // This determines if BOTH background and sprite rendering is allowed in the leftmost 8 pixels
        // Used for sprite 0 checks
        this.leftSideBackgroundAndSpriteFlag = ((value & 0b00000110) == 0b00000110);
        // Store if we should be rendering either sprite or background, so rendering should be enabled
        this.renderingEnabled = !((value & 0b00011000) == 0)
      } else if (address == 0x0006) {
        this.dataAddress = this.dataAddress << 8;
        // Now, bring in the value to the left and mask it to a 16-bit address
        this.dataAddress = (this.dataAddress | value) & 0xffff;
      } else if (address == 0x0007) {
        // If this is the case, then we write to the address requested by this.dataAddress as well
        // and then increment the address
        this.vram.set(this.dataAddress, value);
        let increase = (this.ppuctrl() & 0b00000100) == 0b00000100 ? 32 : 1;
        this.dataAddress = (this.dataAddress + increase) & 0xffff;
      }
    },
    get(address) {
      if (address == 0x0007) {
        // Then we actually want to return from the VRAM address requested
        let result = this.vram.get(this.dataAddress);
        if (!this.console.$refs.cpu.inDebug) {
          let increase = (this.ppuctrl() & 0b00000100) == 0b00000100 ? 32 : 1;
          // @todo Increase VRAM address
          this.dataAddress = (this.dataAddress + increase) & 0xffff;
        }
        return result;
      } else if (address == 0x0002) {
        let result = this.registers[address];
        if (!this.console.$refs.cpu.inDebug) {
          // This is reading the PPU status register so be sure to clear vblank.

          this.setVBlank(false);

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
    setSprite0Hit(val) {
      if (val) {
        this.setPPUStatus(this.ppustatus() | 0b01000000);
      } else {
        this.setPPUStatus(this.ppustatus() & 0b10111111);
      }
    },
    copyToOAM(address, value) {
      // Copy the info to the requested OAM address
      this.oam[address] = value;
    },
    // See: http://wiki.nesdev.com/w/index.php/PPU_power_up_state
    reset() {
      // We set our registers after ~29658 cpu clicks (which we run 3x faster)
      // Set VBlank flag
      this.frameComplete = false;
      // @todo Make sure writes to these registers aren't valid until after the needed
      // cpu clicks
      //this.setPPUStatus(0x80);

      this.setPPUStatus(0x00);

      this.setOAMAddr(0x00);
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
        let spriteY = this.oam[base];

        // Assume 8x8 sprites for the time being
        // @todo Handle 8x16 sprite configuration
        if (spriteY == 0xef || spriteY == 0xff) {
          // Skip this sprite
          continue;
        }
        if (y >= spriteY && y < spriteY + 8) {
          let spriteX = this.oam[base + 3];

          // Note, we decrement spriteX to handle 0 indexed x coordinates
          // @todo, is this accurate?  Is the background shifted, or is sprite x shifted incorrectly?

          let attributeByte = this.oam[base + 2];
          // Desired pixel falls within the sprite bounds
          // Get desired palette
          let desiredPalette = (attributeByte & 0b00000011) + 4;
          // @ Note, handle attributes for flipping tile vert/horiz
          let tileIndex = this.oam[base + 1];

          let tileBase = tileIndex << 4;
          // Find the relative y position of the sprite
          let tileY = ((attributeByte & 0b10000000) == 0b10000000) ? 7 - (y - spriteY) : y - spriteY;

          tileBase = tileBase | this.baseSpritePatternTableAddress();
          // Get first plane
          let first = this.copyOfPatternTables[tileBase + tileY];
          // Get second plane
          let second = this.copyOfPatternTables[tileBase + tileY + 8];

          // Sprite belongs on this scanline
          this.scanlineSpriteCache[matches] = {
            oamAddress: base,
            spriteX: spriteX,
            tileIndex: tileIndex,
            first: first,
            second: second,
            palette: desiredPalette,
            priority:
              (attributeByte & 0b00100000) == 0b00100000
                ? PRIORITY_BACKGROUND
                : PRIORITY_FOREGROUND,
            flipHorizontal: (attributeByte & 0b01000000) == 0b01000000,
            flipVertical: (attributeByte & 0b10000000) == 0b10000000
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
        // Destructuring the sprite info
        let {spriteX, oamAddress, palette, flipHorizontal, first, second} = this.scanlineSpriteCache[spriteNumber];
       if (x >= spriteX && x < spriteX + 8) {
          // This sprite falls within our X requested coordinate
          // Now pull the first/second byte for the tile for this scanline
          // Check for flipping horizontally
          let tileX = flipHorizontal ? (x - spriteX) : 7 - (x - spriteX);

          let colorIndex = 2;
          if (!isBitSet(first, tileX) && !isBitSet(second, tileX)) {
            // Color value is 0
            colorIndex = 0;
          } else if (
            isBitSet(first, tileX) &&
            isBitSet(second, tileX)
          ) {
            // color value is 3
            colorIndex = 3;
          } else if (isBitSet(first, tileX)) {
            // Color value is 1
            colorIndex = 1;
          }

          return {
            oamAddress: oamAddress,
            colorIndex: colorIndex,
            palette: palette
          };
        }
      }
      return null;
    },
    // Index represents the tile number to fetch
    // This is used purely in background tile rendering
    // X is x coordinate of the tile
    // Y is y coordinate
    fetchTilePixelColor(index, x, y) {
      // Remember to flip x in order to get the tile in the right order
      x = 7 - x;
      let base = index << 4;

      // This ors against the base pattern table address for background
      base = base | ((this.registers[0x00] & 0x10) == 0x10 ? 0x1000 : 0x0000);

      // Get first plane
      let first = this.copyOfPatternTables[base + y];
      // Get second plane
      let second = this.copyOfPatternTables[base + y + 8];

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
      // Base will point to our palette starting address
      // There are three bytes to a palette
      let base = 0x3f01 + palette * 4;

      return colors[this.vram.get(base + (colorIndex - 1))];
    },

    // Renders a requested pixel, utilizing the scanline tile cache for sprites
    renderPixel(x, y) {
      // The color for the specified pixel
      // By default, it will be the universal background color
      let color = this.universalBackgroundColor;

      // Sprite fetching
      let activeSpritePixelInformation = this.fetchVisibleSpritePixelInformation(x);

      //return;

      // Fetch background tile info only if background rendering is enabled
      let backgroundColorIndex = 0;
      // This if checks for background tile rendering enabled
      if((this.registers[0x01] & 0x08) == 0x08) {
        backgroundColorIndex = this.fetchTilePixelColor(
          this.nametableByte,
          x == 0 ? 0 : (x  - 1) % 8,
          y % 8
        );
      }

      // Now do pixel evaluation
      let palette = null;
      let colorIndex = null;

      if(backgroundColorIndex != 0 || (activeSpritePixelInformation && activeSpritePixelInformation.colorIndex != 0)) {
        // If we have an active sprite, do sprite detail
       if ( activeSpritePixelInformation && activeSpritePixelInformation.colorIndex) {
          // Check for sprite 0
          if(activeSpritePixelInformation.oamAddress == 0x00 &&
          this.backgroundAndSpriteRendering &&
          // Check for left clipping
          (this.leftSideBackgroundAndSpriteFlag || x > 7) &&
          // End left clip check
          backgroundColorIndex
          ) {
            this.setSprite0Hit(true);
          }
          colorIndex = activeSpritePixelInformation.colorIndex;
          palette = activeSpritePixelInformation.palette;
        } else {
          colorIndex = backgroundColorIndex;
          // @todo Find proper palette number for background attribute byte and x/y offset
          //palette = 0;
          if(x % 32 < 16) {
            if(y % 32 < 16) {
              // top left
              palette = (this.attributeTableByte & 0b00000011);
            } else {
              // bottom left
              palette = ((this.attributeTableByte & 0b00110000) >>> 4);
            }
          } else {
            if(y % 32 < 16) {
              // top right
              palette = ((this.attributeTableByte & 0b00001100) >>> 2);
            } else {
              // bottom right
              palette = ((this.attributeTableByte & 0b11000000) >>> 6);
            }
          }
        }
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
    }
  }
};
</script>

<style lang="scss" scoped>
.screen {
  border: 1px solid gray;
}
</style>


