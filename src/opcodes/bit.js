import {fh} from '../util'

export default {
    methods: {

        // BIT - Bit Test with zero page addressing
        // This instructions is used to test if one or more bits are set in a target memory location. 
        // The mask pattern in A is ANDed with the value in memory to set or clear the zero flag, but 
        // the result is not kept. Bits 7 and 6 of the value from memory are copied into the N and V flags.
        bit: function (location) {
            let value = this.mem.get(location);
            // First, let's AND with the accumulator
            if ((this.a & value) === 0x00) {
                this.p = this.p | 0b0010;
            } else {
                this.p = this.p & 0b11111101;
            }
            // Now, let's copy to the N flag
            this.p = (this.p & 0b01111111) | (value & 0b10000000);
            // Now the V flag
            this.p = (this.p & 0b10111111) | (value & 0b01000000);
        },
        // Zero Page
        0x24: function () {
            this.cycles = 3;
            this.instruction = () => {
                if(this.inDebug) this.debugger(2, () => `BIT $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
                this.bit(this.getZeroPageAddress(this.pc + 1));
                this.pc = this.pc + 2;
            }
        },
        // Absolute
        0x2C: function() {
            this.cycles = 4;
            this.instruction = () => {
                let targetAddress = this.getAbsoluteAddress(this.pc + 1);
                if(this.inDebug) this.debugger(3, () => `BIT $${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.bit(targetAddress);
                this.pc = this.pc + 3;
            }
        }
 
    }
} 