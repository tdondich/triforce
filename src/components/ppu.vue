<template>
  <div>
    <canvas class="screen"></canvas>

    <!-- Our registers -->
    <memory ref="registers" size="8" />

    <!-- Our OAM memory -->
    <memory ref="oam" size="256" />

 </div>
</template>

<script>
import databus from './databus.vue'
import memory from './memory.vue'

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
        }
    },

    computed: {
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
       mem() {
            return this.$refs.ppumainbus;
        }
    },
    methods: {
        // The following fill/set/get is for our registers, accessed by memory
        // Fill a memory range with a specific value
        fill(value = 0x00, start = 0, end = this.memory.length) {
            this.$refs.registers.fill(value, start, end);
        },
        set(address, value) {
            this.$refs.registers.set(address, value);
      },
        get(address) {
            return this.$refs.registers.get(address);
        },
        setPPUCtrl(val) {
            this.$refs.registers.set(0x0000, val & 0xFF);
        },
        setPPUMask(val) {
            this.$refs.registers.set(0x0001, val & 0xFF);
        },
       setPPUStatus(val) {
           this.$refs.registers.set(0x0002, val & 0xFF);
       },
       setOAMAddr(val) {
           this.$refs.registers.set(0x0003, val & 0xFF);
       },
       setOAMData(val) {
           this.$refs.registers.set(0x0004, val & 0xFF);
       },
       setPPUScroll(val) {
           this.$refs.registers.set(0x0005, val & 0xFF);
       },
       setPPUAddress(val) {
           this.$refs.registers.set(0x0006, val & 0xFF);
       },
       setPPUData(val) {
           this.$refs.registers.set(0x0007, val & 0xFF);
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
                this.setPPUAddress(0x0001);
           }
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
               // Fetch the nametable byte (takes 2 cycles)
               // Fetch the attribute table byte (takes 2 cycles)
               // Fetch the tile bitmap low (takes 2 cycles)
               // Fetch the tile bitmap high (+8 bytes from tile bitmap low)

               // Place into internal latches, then feed into appropriate shift registers when it's time 
               // to do so (every 8 cycles)
           }
           else if(this.cycle <= 320) {
               // Tile data for sprites on next scanline are fetched
               // Garbage nametable byte
               // Garbage nametable byte
               // Tile bitmap low
               // Tile bitmap high
           }
           else if(this.cycle <= 336) {
               // First two tiles for next scanline are fetched and loaded into the shift registers.
               // Each memory access takes 2 PPU cycles to complete
               // Nametable byte
               // Attribute table byte
               // Tile bitmap low
               // Tile bitmap high
           }
           else if(this.cycle <= 340) {
               // Two bytes are fetched, but the purpose for this is unknown. Fetches are 2 ppu cycles each
               // Nametable byte
               // Nametable byte
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


