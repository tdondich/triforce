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
        }
    },
    methods: {
        // See: http://wiki.nesdev.com/w/index.php/CPU_power_up_state#After_reset
        reset() {
            // Do not touch the A,X,Y registers
            this.s = 0xfd;
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
            return this.$parent.$refs.memory.getAddressValue(0xfffc);
        },
        getIRQVector() {
            return this.$parent.$refs.memory.getAddressValue(0xfffe);
        },
        getNMIVector() {
            return this.$parent.$refs.memory.getAddressValue(0xfffa);
        },
        // Performs a CPU tick, going through an operation
        tick() {
            // Evaluate instruction code at pc
            console.log(this.pc.toString(16));
            let instr = this.$parent.$refs.memory.get(this.pc);
            console.log(instr);
            console.log("Instruction:" + instr.toString(16));
            this[instr]();
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

