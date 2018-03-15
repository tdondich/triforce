<template>
<div class="row">
    <div class="col-sm-12">
        <h2>RP2A03 CPU</h2>
        <div class="form-group">
            <label>Force Reset Vector</label>
            <input v-model="forceResetVector" class="form-control col-sm-1">
        </div>
        <div v-if="step">
            <button @click="step = !step; tick">Turn off step debugging</button>
            <button v-if="powered" @click="tick">Step Forward</button>
        </div>
        <div v-else>
            <button @click="step = !step">Turn on step debugging</button>
        </div>
        Cycle Counter: {{this.cycles}}
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
    <div class="alert alert-danger" v-if="error">
        {{error}}
    </div>
    <div class="col-sm-12 debug">
        {{this.cycles}}<br>
        <textarea rows="20" class="form-control" v-model="debug"></textarea>
    </div>


    <!-- These are memory mapped registers -->
    <!-- See: https://wiki.nesdev.com/w/index.php/2A03 -->
    <memory ref="registers" size="32" />

</div>

</template>

<script>
import memory from './memory.vue';
import instructions from '../mixins/instructions';
import stx from '../mixins/opcodes/stx';
import ldx from '../mixins/opcodes/ldx';
import lda from '../mixins/opcodes/lda';
import lsr from '../mixins/opcodes/lsr';
import asl from '../mixins/opcodes/asl';
import ror from '../mixins/opcodes/ror';
import rol from '../mixins/opcodes/rol';
import sta from '../mixins/opcodes/sta';
import ora from '../mixins/opcodes/ora';
import and from '../mixins/opcodes/and';
import eor from '../mixins/opcodes/eor';
import adc from '../mixins/opcodes/adc';
import cmp from '../mixins/opcodes/cmp';
import sbc from '../mixins/opcodes/sbc';
import ldy from '../mixins/opcodes/ldy';
import sty from '../mixins/opcodes/sty';
import cpx from '../mixins/opcodes/cpx';
import cpy from '../mixins/opcodes/cpy';
import inc from '../mixins/opcodes/inc';
import dec from '../mixins/opcodes/dec';
import bit from '../mixins/opcodes/bit';

export default {
    components: {
        memory
    },
    mixins: [
        instructions,
        stx,
        ldx,
        lda,
        lsr,
        asl,
        ror,
        rol,
        sta,
        ora,
        and,
        eor,
        adc,
        cmp,
        sbc,
        ldy,
        sty,
        cpx,
        cpy,
        inc,
        dec,
        bit
    ],
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
            step: false,
            forceResetVector: '',
            debug: '',
            // If the CPU encountered a critical error
            error: '',
            powered: false,

            // Cycle count.  When the cycle count hits 0, apply the actual operation
            cycles: 0,
            // This holds the actual instruction callback when cycle hits 0
            instruction: null,
            // Determines if we wrote to the OAMDMA Memory mapped register, if so, we need 
            // to do a memory transfer, and this halts the cpu for a number of cycles
            OAMDMAWritten: false,

            // Even/odd CPU cycle
            odd: false
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
            return this.$parent.$refs.mainbus;
        },
        debugOutput() {
            return this.debug.join("\n");
        }
    },
    methods: {
        // These are sets and gets for our memory mapped registers
        set(address, value) {
            this.$refs.registers.set(address, value);
            // Check if we wrote to OAMDMA
            // That would map to our 0x0014
            if(address == 0x0014) {
                console.log("OAM DMA Written.");
                this.OAMDMAWritten = true;
            }
       },
        get(address) {
            return this.$refs.registers.get(address);
        },
 
        setCarry(val) {
            if(val) {
                // Set carry flag
                this.p = this.p | 0b00000001;
            } else {
                // Reset carry flag
                this.p = this.p & 0b11111110;
            }
        },
        setOverflow(val) {
            if(val) {
                // Set overflow
                this.p = this.p | 0b01000000;
            } else {
                this.p = this.p & 0b10111111;
            }
        },
        setZero(val) {
            if(val) {
                this.p = this.p | 0b00000010;
            } else {
                this.p = this.p & 0b11111101;
            }
        },
        setNegative(val) {
            if(val) {
                this.p = this.p | 0b10000000;
            } else {
                this.p = this.p & 0b01111111;
            }
        },
        // See: http://wiki.nesdev.com/w/index.php/CPU_power_up_state#After_reset
        reset() {
            this.error = '';
            // Turn on PPU
            //this.$parent.$refs.ppu.reset();


            // Do not touch the A,X,Y registers
            // subtract 3 from sp, wrapping if necessary
            for(let count = 0; count < 3; count++) {
                if(this.sp == 0x00) {
                    this.sp = 0xFF;
                } else {
                    this.sp--;
                }
            }
            this.p = 0x24;
            this.a = this.x = this.y = 0;
            this.pc = this.getResetVector();
        },
        // This is the initial power on state
        // See: http://wiki.nesdev.com/w/index.php/CPU_power_up_state#At_power-up
        power() {
            this.powered = true;

            // Turn on ppu
            //this.$parent.$refs.ppu.reset();

            // P i set to interrupt disable
            this.p = 0x24;
            this.a = this.x = this.y = 0;
            this.sp = 0xfd;
            // Frame IRQ enabled
            this.mem.set(0x4017, 0x00);
            // All channels enabled
            this.mem.set(0x4015, 0x00);
            this.mem.fill(0x00, 0x4000, 0x400f);
            // Begin to execute
            this.pc = this.getResetVector();
        },
        // Determines if two addresses would be crossing memory pages.
        // A page from our CPU perspective is a 256 byte region.
        pageCrossed(source, target) {
            return ((source & 0xFF00) != (target & 0xFF00));
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
            // Get the signed integer value
            // See: http://blog.vjeux.com/2013/javascript/conversion-from-uint8-to-int8-x-24.html
            return this.pc + (this.mem.get(address) << 24 >> 24 );
        },
        getAbsoluteAddress(address, zeroPage = false) {
            // Will fetch an address value from address and address + 1, but flip it so you get the true 2 byte address location
            let first = this.mem.get(address);
            let second = 0x00;
            // Check to see if we're meant to be pulling from zero page.  If so, we need to wrap
            if(zeroPage && address == 0xFF) {
                    second = this.mem.get(0x00);
            } else {
                second = this.mem.get(address + 1);
            }
            // Now, we need to return the number that is second + first
            return (second << 8) | first;
        },
        // Sets an absolute address at memory location
        setAbsoluteAddress(address, value) {
            this.mem.set(address, value & 0xff);
            this.mem.set(address + 1, value >> 8);
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
        getIndexedIndirectXAddress(address) {
            let first = this.getZeroPageXAddress(address);
            return this.getAbsoluteAddress(first, true);
        },
        getIndexedIndirectYAddress(address) {
            let first = this.getZeroPageYAddress(address);
            return this.getAbsoluteAddress(first, true);
        },
        getIndirectIndexedAddress(address) {
            // First, get the absolute address
            let first = this.getAbsoluteAddress(this.mem.get(address), true);
            return (first + this.y) & 0xFFFF;
        },
        // Performs a CPU tick, going through an operation
        tick() {
            this.odd = !this.odd;

            // Check to see if we actually need to perform an operation
            if(this.cycles == 0 && this.instruction == null) {
                let instr = this.mem.get(this.pc);
                if(typeof this[instr] == 'undefined') {
                    this.error = "Failed to find instruction handler for " + instr.toString(16);
                    throw this.error;
                } else {
                    // Run the opcode. This will set the cycles counter and the instruction handler
                    this[instr]();
                }
            }
            if(this.cycles > 0) {
                // consume a cycle
                this.cycles = this.cycles - 1;
            }
            // Now check to see if we really need to run the instruction because all the cycles have been met
            if(this.cycles == 0 && this.instruction != null) {
                // Run the instruction
                this.instruction();
                this.instruction = null;
            }
            // Check for OAMDMA being written to
            if(this.OAMDMAWritten) {
                this.cycles = this.odd ? 514 : 513;
                this.instruction = () => {
                    // Copy all data from $XX00-$XXFF to ppu OAM
                    let base = this.mem.get(0x4014);
                    // Now, let's create the base address
                    base = base << 8;
                    for(let i = 0; i < 256; i++) {
                        let value = this.mem.get(base + i);
                        // Copy over to address
                        this.$parent.$refs.ppu.copyToOAM(i, value);
                    }
                }
            }
      },
        // Pushes to the top of the stack then modified the stack pointer
        stackPush(val) {
            this.mem.set(0x0100 | this.sp, val);
            // Go 'up' a stack
            this.sp = (this.sp - 1) & 0xFF;
            return true;
        },
        // Pops off the stack, returning the address
        stackPop() {
            this.sp = (this.sp + 1) & 0xFF;
            return this.mem.get(0x0100 | this.sp);
        }
    }
}
</script>

<style lang="css" scoped>
.debug {
    font-family: 'Courier New', Courier, monospace;
}
</style>

