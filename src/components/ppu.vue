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
import databus from './databus.vue'
import memory from './memory.vue'
import colors from '../mixins/colors'

function isBitSet(value, index) {
  let mask = 1 << index;
  return (value & mask) != 0;
}



export default {
    components: {
        databus,
        memory
    },
    data: function() {
        return {
            // Tick count. When tick hits 0, and instruction is not null, instruction will be called
            ticks: 0,
            // Instruction
            instruction: null,
            // There are 341 cycles in each scanline
            cycle: 0,
            // There are 262 scanlines, starting with -1
            // See: https://wiki.nesdev.com/w/index.php/PPU_rendering
            scanline: -1,
            // Toggle even/odd frame
            odd: true,
            // The nametable "latch"
            nametableByte: null,
            // The attribute "latch"
            attributeTableByte: null,
           // The current VRAM address
            v: null,
            // The address latch for PPUADDR
            dataAddress: 0x0000,
        }
    },

    computed: {
      ppumainbus() {
            return this.$parent.$refs.ppumainbus;
        },

   },
    methods: {
        renderingEnabled() {
            // Need to check to see if background and sprites is meant to be rendered
            // Any of the bits for 3 and 4 should be set for rendering to be enabled
            return !((this.ppumask() & 0b11100111) == 0b11100111);
        },
        ppuctrl() {
            return this.get(0x0000);
        },
        ppumask() {
            return this.get(0x0001);
        },
        ppustatus() {
            return this.get(0x0002);
        },
        oamaddr() {
            return this.get(0x0003);
        },
        oamdata() {
            return this.get(0x0004);
        },
        ppuscroll() {
            return this.get(0x0005);
        },
        ppuaddr() {
            return this.get(0x0006);
        },
        ppudata() {
            return this.get(0x0007);
        },
        baseNameTableAddress() {
            // Base will be 0 - 3
            // See: http://wiki.nesdev.com/w/index.php/PPU_registers#PPUCTRL
            let base = this.ppuctrl() & 0b00000011;
            return 0x2000 + (base * 0x400);
        },
        baseAttributeTableAddress() {
            // Attribute table starts after the nametable
            let base = this.baseNameTableAddress() + 0x3C0;
            return base;
        },
        basePatternTableAddress() {
            let base = this.ppuctrl() & 0b00010000;
            return (base == 0b00010000 ? 0x0000 : 0x1000);
        },
       // The following fill/set/get is for our registers, accessed by memory
        // Fill a memory range with a specific value
        fill(value = 0x00, start = 0, end = this.memory.length) {
            this.$refs.registers.fill(value, start, end);
        },
        set(address, value) {
            this.$refs.registers.set(address, value);
            // Now, check if we wrote to PPUADDR, if so, let's shift it into our dataAddress
            if(address == 0x0006) {
                this.dataAddress << 8;
                // Now, bring in the value to the left and mask it to a 16-bit address
                this.dataAddress = (this.dataAddress | value) & 0xFFFF;
            } else if(address == 0x0007) {
                // If this is the case, then we write to the address requested by this.dataAddress as well
                // and then increment the address
                this.ppumainbus.set(this.dataAddress, value);
                let increase = (this.ppuctrl() & 0b00000100) == 0b00000100 ? 32 : 1;
                this.dataAddress = (this.DataAddress + increase) & 0xFFFF;
            }
      },
        get(address) {
            if(address == 0x0007) {
                // Then we actually want to return from the VRAM address requested
                let result = this.ppumainbus.get(this.dataAddress);
                let increase = (this.ppuctrl() & 0b00000100) == 0b00000100 ? 32 : 1;
                this.dataAddress = (this.DataAddress + increase) & 0xFFFF;
                return result;
            }
            return this.$refs.registers.get(address);
        },
        setPPUCtrl(val) {
            this.set(0x0000, val & 0xFF);
        },
        setPPUMask(val) {
            this.set(0x0001, val & 0xFF);
        },
       setPPUStatus(val) {
           this.set(0x0002, val & 0xFF);
       },
       setOAMAddr(val) {
           this.set(0x0003, val & 0xFF);
       },
       setOAMData(val) {
           this.set(0x0004, val & 0xFF);
       },
       setPPUScroll(val) {
           this.set(0x0005, val & 0xFF);
       },
       setPPUAddress(val) {
           this.set(0x0006, val & 0xFF);
       },
       setPPUData(val) {
           this.set(0x0007, val & 0xFF);
       },
       setVBlank(val) {
           if(val) {
               this.setPPUStatus(this.ppustatus | 0b10000000);
           } else {
               this.setPPUStatus(this.ppustatus & 0b01111111);
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
           this.instruction = () => {
                this.setPPUStatus(0x80);
                this.setOAMAddr(0x2F);
                this.setPPUAddress(0x00);
           }
      },
      fetchNametableByte() {
          // Get the base nametable address
          // @todo Not sure about this one
          // We need to find out which pixel we're at.  Each byte is a 8x8 pixel tile representation
          let address = this.baseNameTableAddress() + (Math.floor(this.scanline / 8) * Math.floor(this.cycle / 8));
          this.nametableByte = this.ppumainbus.get(address);
      },
      fetchAttributeTableByte() {
          let address = this.baseAttributeTableAddress();
          this.attributeTableByte = this.ppumainbus.get(address);
      },
      // See: https://wiki.nesdev.com/w/index.php/PPU_sprite_evaluation
      spriteEvaluate() {
          // First secondary OAM
          this.$refs.secondaryoam.fill(0xFF, 0, 31);

      },
      // Index represents the tile number to fetch
      // X is x coordinate of the tile
      // Y is y coordinate
      fetchTilePixelColor(index, x, y) {
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
      renderPixel(x,y) {
          if(y <0 || y > 239) {
              // Not a visible coordinate
              return;
          }
          let c = document.getElementById('screen');
          let ctx = c.getContext("2d");
 
          // Okay, visible coordinate, get the universal background color
          //let universalBackgroundColor = this.ppumainbus.get(0x3F00);

          let color = 0;

          // Okay, fetch the tile pixel color for background
          let tileX = x % 8;
          let tileY = y % 8;
          let pixelColor = this.fetchTilePixelColor(this.nametableByte, tileX, tileY);

          if(pixelColor == 1) {
              color = 1;
          } else if(pixelColor == 2) {
              color = 2;
          } else if(pixelColor == 3) {
              color = 3;
          }

          // Let's just write the color to the canvas
         ctx.fillStyle = '#' + colors[color];
          ctx.fillRect(x,y,1,1);
      },
       tick() {
           // This handles performing an actual operation 
            if(this.ticks > 0) {
                // consume a tick
                this.ticks = this.ticks - 1;
            }
            // Now check to see if we really need to run the instruction because all the cycles have been met
            if(this.ticks == 0 && this.instruction != null) {
                // Run the instruction
                this.instruction();
                this.instruction = null;
            }
           if(this.scanline == 241) {
               // Perform a VBlank on the second tick, and also fire VBlank NMI
               if(this.cycle == 0 && this.instruction == null) {
                   this.ticks == 2;
                   this.instruction = () => {
                       // Set VBLank
                       this.setVBlank(true);
                       // And fire VBlank NMI
                       this.$parent.$refs.cpu.fireNMI();
                   }
               }
           }
           else if(this.cycle == 0 || this.scanline == 240) {
               // Idle cycle...
           }
           else if(this.cycle <= 256) {
               if(this.renderingEnabled()) {
                // Every 8 cycles, feed the following into "shift registers"
                if(this.ticks == 0) {
                    this.ticks = 8;
                    this.instruction = () => {
                        this.fetchNametableByte();
                        this.fetchAttributeTableByte();
                        // We won't do these documented steps as they'll simply be looked up
                        // in fetchTilePixelColor during rendering
                        //this.fetchTileBitmapLow();
                        //this.fetchTileBitmapHigh();
                    }
                }
                // Go ahead and render our pixel, marking our x (cycle) and y(scanline)
                this.renderPixel(this.cycle - 1, this.scanline);

                if(this.cycle == 256) {
                    // Do the sprite evaluation for the next line
                    this.spriteEvaluate();
                }
               }
           }
           else if(this.cycle <= 320) {
               // Tile data for sprites on next scanline are fetched
                if(this.ticks == 0) {
                    this.ticks = 8;
                    this.instruction = () => {
                        this.fetchNametableByte();
                        this.fetchAttributeTableByte();
                    }
                }
           }
           else if(this.cycle <= 336) {
                if(this.ticks == 0) {
                    this.ticks = 8;
                    this.instruction = () => {
                        this.fetchNametableByte();
                        this.fetchAttributeTableByte();
                    }
                }
           }
           else if(this.cycle <= 340) {
               // Two bytes are fetched, but the purpose for this is unknown. Fetches are 2 ppu cycles each
               this.ticks = 2;
               this.instruction = () => {
                   // Do nothing. Normally nametable bytes would be fetched but it does nothing.
               }
           }

           this.cycle = this.cycle + 1;
           if(this.cycle == 340 && this.odd) {
               // Skip the last cycle for odd frames
               this.cycle = this.cycle + 1;
           }
           if(this.cycle == 341) {
               // Reset to cycle 0 and increase scanline
               this.cycle = 0;
               this.scanline = (this.scanline == 260) ? -1 : this.scanline + 1;
               this.odd = !this.odd;
           }
      }
    }
}
</script>

<style lang="scss" scoped>
.screen {
  border: 1px solid gray;
}
</style>


