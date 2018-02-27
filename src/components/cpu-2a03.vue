<template>
<div class="row">
    <div class="col-sm-12">
        <h2>RP2A03 CPU</h2>
        <div class="form-group">
            <label>Force Reset Vector</label>
            <input v-model="forceResetVector" class="form-control col-sm-1">
        </div>
        <button @click="step = !step" v-if="step">Turn off step debugging</button>
        <button @click="step = !step" v-else>Turn on step debugging</button>
    </div>
    <div class="col-sm-6">
    <h4>Registers</h4>
    <table class="table table-dark table-sm table-bordered">
        <tbody>
            <tr>
                <th>A</th><td>{{a.toString(16).padStart(2, '0')}}</td>
                <th>X</th><td>{{x.toString(16).padStart(2, '0')}}</td>
                <th>Y</th><td>{{y.toString(16).padStart(2, '0')}}</td>
                <th>PC</th><td>{{pc.toString(16).padStart(2, '0')}}</td>
                <th>SP</th><td>{{sp.toString(16).padStart(2, '0')}}</td>
                <th>P</th><td>{{p.toString(16).padStart(2, '0')}}</td>
            </tr>
        </tbody>
    </table>
    </div>
    <div class="col-sm-6">
    <h4>Status Flags</h4>
    <table class="table table-dark table-sm table-bordered">
        <tbody>
            <tr>
                <th>carry</th><td>{{isCarry}}</td>
                <th>zero</th><td>{{isZero}}</td>
                <th>interrupt</th><td>{{isInterruptDisabled}}</td>
                <th>decimal</th><td>{{isDecimal}}</td>
                <th>overflow</th><td>{{isOverflow}}</td>
                <th>negative</th><td>{{isNegative}}</td>
            </tr>
        </tbody>
    </table>
    </div>
    <div class="col-sm-12 debug" v-if="debug">
        {{debug}}
    </div>
</div>

</template>

<script>
import InstructionsMixin from '../mixins/InstructionsMixin'

export default {
    mixins: [InstructionsMixin],
    data: function() {
        // Our data represents our internal registers and processor flag
        return {
            // For registers, see: http://wiki.nesdev.com/w/index.php/CPU_registers
            // Accumulator (Single Byte Wide)
            a: 0,
            // Index registers X and Y. (Single Byte Wide)
            x: 0,
            y: 0,
            // Program counter, supports 65536 adress locations, is 2 bytes wide)
            pc: 0,
            // The stack pointer (Single Byte Wide)
            sp: 0,
            // Status Register. Sets the status of various cpu flags (Single Byte Wide)
            // Note, computed properties help gather certain flag states easily than constant 
            // bitwise operation checks
            // See: http://wiki.nesdev.com/w/index.php/Status_flags
            // See: http://wiki.nesdev.com/w/index.php/CPU_status_flag_behavior
            p: 0,
            
            // How the CPU should operate
            // Stepping means that the CPU should step through each operation instead of continuous run
            step: true,
            forceResetVector: '',
            debug: ''
        }
    },
    computed: {
        // Computed properties help break down the processor flag state
        // This uses bitwise comparisons to evaluate the value of the p register and return values
        // We're using the ES6 0b prefix for binary numbers
        // See http://wiki.nesdev.com/w/index.php/CPU_status_flag_behavior for what bits represent which flags
        isCarry() {
            return (this.p & 0b0001) == 0b0001;
        },
        isZero() {
            return (this.p & 0b0010) == 0b0010;
        },
        isInterruptDisabled() {
            return (this.p & 0b0100) == 0b0100;
        },
        isDecimal() {
            return (this.p & 0b1000) == 0b1000;
        },
        isOverflow() {
            return (this.p & 0b1000000) == 0b1000000;
        },
        isNegative() {
            return (this.p & 0b10000000) == 0b10000000;
        },
        mem() {
            return this.$parent.$refs.memory;
        }
    },
    methods: {
        // See: http://wiki.nesdev.com/w/index.php/CPU_power_up_state#After_reset
        reset() {
            // Do not touch the A,X,Y registers
            this.sp = 0xfd;
            this.p = 0x34;
            this.a = this.x = this.y = 0;
            this.pc = this.getResetVector();
            // Begin to execute
            this.tick();
        },
        // Vectors
        // See: https://en.wikibooks.org/wiki/NES_Programming/Initializing_the_NES#Interrupt_Vectors
        // Reset address value is located at 0xfffc and 0xfffd (reversed)
        getResetVector() {
            if(this.forceResetVector) {
                return parseInt(this.forceResetVector);
            }
            return this.getAbsoluteAddress(0xfffc);
        },
        getIRQVector() {
            return this.getAbsoluteAddress(0xfffe);
        },
        getNMIVector() {
            return this.getAbsoluteAddress(0xfffa);
        },
        // Handling various addressing modes the cpu supports
        getZeroPageAddress(address) {
            return this.mem.get(address);
        },
        getZeroPageXAddress(address) {
            return (this.getZeroPageAddress(address) + this.x) & 0x00FF;
        },
        getZeroPageYAddress(address) {
            return (this.getZeroPageAddress(address) + this.y) & 0x00FF;
        },
        getRelativeAddress(address) {
            // First, let's get a signed 8 bit integer data view into address
            let signedDataView = new Int8Array(this.mem.slice(address, address+1));
            // Now, let's return
            return this.pc + signedDataView[0];
        },
        getAbsoluteAddress(address) {
            // Will fetch an address value from address and address + 1, but flip it so you get the true 2 byte address location
            let first = this.mem.get(address);
            let second = this.mem.get(address + 1);
            // Now, we need to return the number that is second + first
            return (second << 8) | first;
        },
        getAbsoluteXAddress(address) {
            return this.getAbsoluteAddress(address) + this.x;
        },
        getAbsoluteYAddress(address) {
            return this.getAbsoluteAddress(address) + this.y;
        },
        getIndirectAddress(address) {
            return this.mem.getAbsoluteAddress(this.getAbsoluteAddress(address));
        },
        getIndexedIndirectAddress(address) {
            let first = this.mem.getZeroPageXAddress(address);
            return this.mem.getAbsoluteAddress(first);
        },
        getIndirectIndexedAddress(address) {
            let first = this.mem.getZeroPageAddress(address);
            let second = this.mem.getAbsoluteAddress(first);
            return second + this.y;
        },
        // Performs a CPU tick, going through an operation
        tick() {
            // Evaluate instruction code at pc
            let instr = this.$parent.$refs.memory.get(this.pc);
            if(typeof this[instr] == 'undefined') {
                console.log("Failed to find instruction handler for " + instr.toString(16));
            } else {
                this[instr]();
            }
            setTimeout(this.tick, 250);
        },

    },
    // This is the initial power on state
    // See: http://wiki.nesdev.com/w/index.php/CPU_power_up_state#At_power-up
    mounted() {
        // Let's do a reliable fill of 0x00 to memory
        this.$parent.$refs.memory.fill(0x00);
        // P i set to interrupt disable
        this.p = 0x34;
        this.a = this.x = this.y = 0;
        this.s = 0xfd;
    }
  
}
</script>

<style lang="css" scoped>

</style>

