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
       }
    },
    mounted: function() {

    }
}
</script>


