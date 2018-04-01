<template>
    <div>
        <canvas id="screen" class="screen" width="256" height="240"></canvas>

        <!-- Our registers -->
        <memory ref="registers" size="8" />

        <!-- Our OAM memory -->
        <memory ref="oamdata" size="256" />

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
    };
  },
  created() {
      // Tick count. When tick hits 0, and instruction is not null, instruction will be called
      this.ticks = 0;
      // Instruction
      this.instruction = null;
      // There are 341 cycles in each scanline
      this.cycle = 0;
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
      this.scanlineTileCache = [];
  },
  mounted() {
      this.canvas = document.getElementById("screen");
      this.canvasCtx = this.canvas.getContext("2d");
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
      return this.$refs.registers.get(0x0000);
    },
    ppumask() {
      return this.$refs.registers.get(0x0001);
    },
    ppustatus() {
      return this.$refs.registers.get(0x0002);
    },
    oamaddr() {
      return this.$refs.registers.get(0x0003);
    },
    oamdata() {
      return this.$refs.registers.get(0x0004);
    },
    ppuscroll() {
      return this.$refs.registers.get(0x0005);
    },
    ppuaddr() {
      return this.$refs.registers.get(0x0006);
    },
    ppudata() {
      return this.$refs.registers.get(0x0007);
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
      this.$refs.registers.fill(value, start, end);
    },
    set(address, value) {
      this.$refs.registers.set(address, value);
      // Now, check if we wrote to PPUADDR, if so, let's shift it into our dataAddress
      if (address == 0x0006) {
        this.dataAddress = this.dataAddress << 8;
        // Now, bring in the value to the left and mask it to a 16-bit address
        this.dataAddress = (this.dataAddress | value) & 0xffff;
     } else if (address == 0x0007) {
        // If this is the case, then we write to the address requested by this.dataAddress as well
        // and then increment the address
        if(this.dataAddress == 0x3f11 
            || this.dataAddress == 0x3f31
            || this.dataAddress == 0x3f51
            || this.dataAddress == 0x3f71
            || this.dataAddress == 0x3f91
            || this.dataAddress == 0x3fb1
            || this.dataAddress == 0x3fd1
            || this.dataAddress == 0x3ff1) {
            console.log(this.dataAddress.toString(16) + " : " + value.toString(16));
            console.log("PC: " + this.$parent.$refs.cpu.pc.toString(16) + " : " + this.$parent.$refs.cpu.a.toString(16));
        }
        this.ppumainbus.set(this.dataAddress, value);
        let increase = (this.ppuctrl() & 0b00000100) == 0b00000100 ? 32 : 1;
        this.dataAddress = (this.dataAddress + increase) & 0xffff;
        console.log("Increase in set");
      }
    },
    get(address) {
      if (address == 0x0007) {
        // Then we actually want to return from the VRAM address requested
        let result = this.ppumainbus.get(this.dataAddress);
        if(!this.$parent.$refs.cpu.inDebug) {
            let increase = (this.ppuctrl() & 0b00000100) == 0b00000100 ? 32 : 1;
            // @todo Increase VRAM address
            this.dataAddress = (this.dataAddress + increase) & 0xffff;
            console.log("Increase in get");
        }
        return result;
      } else if (address == 0x0002) {
        let result = this.$refs.registers.get(address);
        if(!this.$parent.$refs.cpu.inDebug) {
            // This is reading the PPU status register so be sure to clear vblank.
            // @todo This really should be done to emulate correct, but we're going to reset
            // the vblank at the pre-rendering scanline
            //this.setVBlank(false);
            this.statusRegisterReadFlag = !this.statusRegisterReadFlag;
        }
        return result;
      }
      return this.$refs.registers.get(address);
    },
    setPPUCtrl(val) {
      this.$refs.registers.set(0x0000, val & 0xff);
    },
    setPPUMask(val) {
      this.$refs.registers.set(0x0001, val & 0xff);
    },
    setPPUStatus(val) {
      this.$refs.registers.set(0x0002, val & 0xff);
    },
    setOAMAddr(val) {
      this.$refs.registers.set(0x0003, val & 0xff);
    },
    setOAMData(val) {
      this.$refs.registers.set(0x0004, val & 0xff);
    },
    setPPUScroll(val) {
      this.$refs.registers.set(0x0005, val & 0xff);
    },
    setPPUAddress(val) {
      this.$refs.registers.set(0x0006, val & 0xff);
    },
    setPPUData(val) {
      this.$refs.registers.set(0x0007, val & 0xff);
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
      this.ticks = 88974;
      this.frameComplete = false;
      this.instruction = () => {
        this.setPPUStatus(0x80);
        this.setOAMAddr(0x2f);
        this.setPPUAddress(0x00);
      };
    },
    fetchNametableByte() {
      // Get the base nametable address
      // @todo Not sure about this one
      // We need to find out which pixel we're at.  Each byte is a 8x8 pixel tile representation
      let address =
        this.baseNameTableAddress() +
        Math.floor(this.scanline / 8) * Math.floor(this.cycle / 8);
      this.nametableByte = this.ppumainbus.get(address);
    },
    fetchAttributeTableByte() {
      let address = this.baseAttributeTableAddress();
      this.attributeTableByte = this.ppumainbus.get(address);
    },
    // See: https://wiki.nesdev.com/w/index.php/PPU_sprite_evaluation
    spriteEvaluate() {
      // First secondary OAM
      this.$refs.secondaryoam.fill(0xff, 0, 31);
    },
    // Fetch first sprite pixel information that falls within an x,y coordinate, given the current
    // sprite size configuration

    buildScanlineTileCache(y) {
        // Reset
        this.scanlineTileCache = [];
        let matches = 0;
        for(let spriteNumber = 0; spriteNumber < 64; spriteNumber++) {
            // Base is the base address of the currently evaluated sprite
            let base = spriteNumber * 4;
            let spriteY = this.$refs.oam.get(base);
            // Assume 8x8 sprites for the time being
            // @todo Handle 8x16 sprite configuration
            if(spriteY == 0xEF || spriteY == 0xFF) {
                // Skip this sprite
                continue;
            }
            if(y >= spriteY && y < (spriteY + 8)) {
                let spriteX = this.$refs.oam.get(base + 3);

                let attributeByte = this.$refs.oam.get(base + 2);
                // Desired pixel falls within the sprite bounds
                // Get desired palette
                let desiredPalette = (attributeByte & 0b00000011) + 4;
                // @ Note, handle attributes for flipping tile vert/horiz
                let tileIndex = this.$refs.oam.get(base + 1);
 
                // Sprite belongs on this scanline
                this.scanlineTileCache[matches] = {
                    spriteX: spriteX,
                    tileIndex: tileIndex,
                    palette: desiredPalette,
                    priority: (attributeByte & 0b00100000) == 0b00100000 ? PRIORITY_BACKGROUND : PRIORITY_FOREGROUND,
                };
                matches = matches + 1;
                // We only cache the first 8 matching sprites on the scanline
                if(matches == 8) {
                    return;
                }
            }
        }
    },

    fetchVisibleSpritePixelInformation(x, y) {
        let tileCacheCount = this.scanlineTileCache.length;
        for(let spriteNumber = 0; spriteNumber < tileCacheCount; spriteNumber++) {
            let item = this.scanlineTileCache[spriteNumber];
            if(x >= item.spriteX && x < (item.spriteX + 8)) {
                // This sprite falls within our X requested coordinate
                // Base is the base address of the currently evaluated sprite
                let tileY = (y + 1) % 8; 
                let tileX = (x + 1) % 8;
                let colorIndex = this.fetchTilePixelColor(item.tileIndex, tileX, tileY);
                return {
                    colorIndex: colorIndex,
                    palette: item.palette
                }
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
      let first = this.ppumainbus.get(base + y);
      // Get second plane
      let second = this.ppumainbus.get(base + y + 8);

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
    fetchColorHex(palette, colorIndex) {
        if(colorIndex == 0) {
            throw "Invalid colorIndex for fetchColorHex";
        }
        // Base will point to our palette starting address
        // There are three bytes to a palette
        let base = 0x3F01 + (palette * 4);
        return colors[this.ppumainbus.get(base + (colorIndex - 1))];
    },
    renderPixel(x, y) {
      if (y < 0 || y > 239) {
        // Not a visible coordinate
        return;
      }
      // Okay, visible coordinate, get the universal background color
      if(this.frameCache.universalBackgroundColorHex == null) {
        this.frameCache.universalBackgroundColorHex = colors[this.ppumainbus.get(0x3F00)];
      }

      let backgroundColorIndex = 0;

      // Sprite fetching
      //let activeSpritePixelInformation = null;
      let activeSpritePixelInformation = this.fetchVisibleSpritePixelInformation(x, y);

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
      let colorHex = null;

      if(backgroundColorIndex == 0 && (activeSpritePixelInformation == null || activeSpritePixelInformation.colorIndex == 0)) {
          colorHex = this.frameCache.universalBackgroundColorHex;
      } else {
        if(activeSpritePixelInformation && activeSpritePixelInformation.colorIndex) {
            colorIndex = activeSpritePixelInformation.colorIndex;
            palette = activeSpritePixelInformation.palette;
        } else {
            //colorIndex = backgroundColorIndex;
            // @todo Find proper palette number for background attribute byte and x/y offset
            //palette = 0;
        }
        colorHex = this.fetchColorHex(palette, colorIndex);
      }

      // Let's just write the backgroundColorIndex to the canvas
      this.canvasCtx.fillStyle = colorHex;
      this.canvasCtx.fillRect(x, y, 1, 1);
    },
    tick() {
      // This handles performing an actual operation
      if (this.ticks > 0) {
        // consume a tick
        this.ticks = this.ticks - 1;
      }
      // Now check to see if we really need to run the instruction because all the cycles have been met
      if (this.ticks == 0 && this.instruction != null) {
        // Run the instruction
        this.instruction();
        this.instruction = null;
      }
      if (this.scanline == 241) {
        // Perform a VBlank on the second tick, and also fire VBlank NMI
        if (this.cycle == 0 && this.instruction == null) {
          this.ticks == 2;
          this.instruction = () => {
            // Set VBLank
            this.setVBlank(true);
            // And fire VBlank NMI
            this.$parent.$refs.cpu.fireNMI();
          };
        }
      } else if (this.cycle == 1 && this.scanline == -1) {
        // Clear VBlank
        // @note this is a hack, see our get method, which isn't properly clearing vblank on register read
        this.setVBlank(false);
      } else if (this.cycle == 0 || this.scanline == 240) {
        // Idle cycle...
      } else if (this.cycle <= 256) {
        if (this.renderingEnabled()) {
          // Every 8 cycles, feed the following into "shift registers"
          if (this.ticks == 0) {
            this.ticks = 8;
            this.instruction = () => {
              this.fetchNametableByte();
              this.fetchAttributeTableByte();
              // We won't do these documented steps as they'll simply be looked up
              // in fetchTilePixelColor during rendering
              //this.fetchTileBitmapLow();
              //this.fetchTileBitmapHigh();
            };
          }
          // Go ahead and render our pixel, marking our x (cycle) and y(scanline)
          this.renderPixel(this.cycle - 1, this.scanline);

          if (this.cycle == 256) {
            // Do the sprite evaluation for the next line
            this.spriteEvaluate();
          }
        }
      } else if (this.cycle <= 320) {
        // Tile data for sprites on next scanline are fetched
        if (this.ticks == 0) {
          this.ticks = 8;
          this.instruction = () => {
            this.fetchNametableByte();
            this.fetchAttributeTableByte();
            this.buildScanlineTileCache(this.scanline + 1);
          };
        }
      } else if (this.cycle <= 336) {
        if (this.ticks == 0) {
          this.ticks = 8;
          this.instruction = () => {
            this.fetchNametableByte();
            this.fetchAttributeTableByte();
          };
        }
      } else if (this.cycle <= 340) {
        // Two bytes are fetched, but the purpose for this is unknown. Fetches are 2 ppu cycles each
        this.ticks = 2;
        this.instruction = () => {
          // Do nothing. Normally nametable bytes would be fetched but it does nothing.
        };
      }

      this.cycle = this.cycle + 1;
      if (this.cycle == 340 && this.odd) {
        // Skip the last cycle for odd frames
        this.cycle = this.cycle + 1;
      }
      if (this.cycle == 341) {
        // Reset to cycle 0 and increase scanline
        this.cycle = 0;
        this.scanline = this.scanline == 260 ? -1 : this.scanline + 1;
        this.odd = !this.odd;

        // Dirty dirty dirty
        this.frameCache = {};
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.screen {
  border: 1px solid gray;
}
</style>


