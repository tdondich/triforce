<template>
  <div>
      <canvas class="screen"></canvas>
 </div>
</template>

<script>
import memory from './memorybus.vue'
export default {
    components: {
        memory
    },
    data: function() {
        return {
            // There are 341 cycles in each scanline
            cycle: 0,
            // There are 262 scanlines, starting with -1
            // See: https://wiki.nesdev.com/w/index.php/PPU_rendering
            scanline: -1
        }
    },

    computed: {
        ppuctrl() {
            return this.mem.get(0x2000);
        },
        ppumask() {
            return this.mem.get(0x2001);
        },
        ppustatus() {
            return this.mem.get(0x2002);
        },
        oamaddr() {
            return this.mem.get(0x2003);
        },
        oamdata() {
            return this.mem.get(0x2004);
        },
        ppuscroll() {
            return this.mem.get(0x2005);
        },
        ppuaddr() {
            return this.mem.get(0x2006);
        },
        ppudata() {
            return this.mem.get(0x2007);
        },
        oamdma() {
            return this.mem.get(0x4014);
        },
        mem() {
            return this.$parent.$refs.memory;
        }
    },
    methods: {
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
           switch(this.cycle) {
               // Determine what cycle we are at in scanline

               default: {
                   console.log("No found cycle.");
               }

           }
           this.cycle = this.cycle + 1;
           if(this.cycle == 341) {
               // Reset to cycle 0 and increase scanline
               this.cycle = 0;
               this.scanline = (this.scanline == 260) ? -1 : this.scanline + 1;
           }
       }
    },
    mounted: function() {

    }
}
</script>


