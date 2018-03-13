<template>
  <div>
      <canvas class="screen"></canvas>

      <memory ref="registers" size="8" />

      <memory ref="oam" size="256" />

      <!-- Now our VRAM Representation -->
      <!-- Our two Pattern Tables -->
      <memory ref="pattern0" size="4096" />
      <memory ref="pattern1" size="4096" />
      <!-- Our nametables -->
      <memory ref="nametable0" size="1024" />
      <memory ref="nametable1" size="1024" />
      <memory ref="nametable2" size="1024" />
      <memory ref="nametable3" size="1024" />
      <!-- Our palettes -->
      <memory ref="palette" size="32" />

      <databus name="Nametable Databus" ref="nametablebus" size="4096" :sections="[
        {
            ref: 'nametable0',
            min: 0x0000,
            max: 0x03FF,
            size: 1024
        },
        {
            ref: 'nametable1',
            min: 0x0400,
            max: 0x07FF,
            size: 1024
        },
        {
            ref: 'nametable2',
            min: 0x0800,
            max: 0x0BFF,
            size: 1024,
        },
        {
            ref: 'nametable3',
            min: 0x0C00,
            max: 0x0FFF,
            size: 1024
        }
      ]" />

    <databus name="PPU Sub Databus" size="16384" ref="ppusubbus" :sections="[
        {
            ref: 'pattern0',
            min: 0x0000,
            max: 0x0FFF,
            size: 4096
        },
        {
            ref: 'pattern0',
            min: 0x0000,
            max: 0x0FFF,
            size: 4096
        },
        // The following repeats the nametables twice
        {
            ref: 'nametablebus',
            min: 0x2000,
            max: 0x3EFF,
            size: 4096
        },
        {
            ref: 'palette',
            min: 0x3F00,
            max: 0x3FFF,
            size: 32
        }
    ]" />

    <!-- Now, our main data bus for the ppu, providing for the full 64K address space -->
    <databus name="PPU Main Databus" size="65536" ref="ppumainbus" :sections="[
        {
            ref: 'ppusubbus',
            min: 0x0000,
            max: 0xFFFF,
            size: 16384
        }
    ]" />
 </div>
</template>

<script>
import databus from './databus.vue'

export default {
    components: {
        databus
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
            return this.mem.get(0x0000);
        },
        ppumask() {
            return this.mem.get(0x0001);
        },
        ppustatus() {
            return this.mem.get(0x0002);
        },
        oamaddr() {
            return this.mem.get(0x0003);
        },
        oamdata() {
            return this.mem.get(0x0004);
        },
        ppuscroll() {
            return this.mem.get(0x0005);
        },
        ppuaddr() {
            return this.mem.get(0x0006);
        },
        ppudata() {
            return this.mem.get(0x0007);
        },
        oamdma() {
            return this.mem.get(0x4014);
        },
        mem() {
            return this.$refs.registers;
        }
    },
    methods: {
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
            this.mem.set(0x2000, val & 0xFF);
        },
        setPPUMask(val) {
            this.mem.set(0x2001, val & 0xFF);
        },
       setPPUStatus(val) {
           this.mem.set(0x2002, val & 0xFF);
       },
       setOAMAddr(val) {
           this.mem.set(0x2003, val & 0xFF);
       },
       setOAMData(val) {
           this.mem.set(0x2004, val & 0xFF);
       },
       setPPUScroll(val) {
           this.mem.set(0x2005, val & 0xFF);
       },
       setPPUAddress(val) {
           this.mem.set(0x2006, val & 0xFF);
       },
       setPPUData(val) {
           this.mem.set(0x2007, val & 0xFF);
       },
       setOAMDMA(val) {
           this.mem.set(0x4014, val & 0xFF);
       },
       // See: http://wiki.nesdev.com/w/index.php/PPU_power_up_state
       reset() {
           // Set VBlank flag
           this.setPPUStatus(0x80);
           this.setOAMAddr(0x2F);
           this.setPPUAddress(0x0001);
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
                       // And fire VBlank NMI
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
    },
    mounted: function() {

    }
}
</script>


