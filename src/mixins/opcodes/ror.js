import { fh } from "../helpers";

export default {
    methods: {
        // ROR - Rotate Right
        ror: function (location) {
            let value = 0;
            if(!location) {
                // Perform it on the accumulator
                value = this.a;
                let bit7 = this.isCarry ? 0x80 : 0x00;

                // First, set the carry
                this.setCarry(((value & 0b00000001) == 0b00000001));

                // Now, shift right one
                this.a = (this.a >>> 1) & 0xFF;

                // Now set bit 7 to the value of the old carry
                this.a = this.a | bit7;

                // Set zero
                this.setZero((this.a == 0x00));

                // Set negative
                this.setNegative((this.a & 0b10000000) == 0b10000000);

            } else {
                value = this.mem.get(location);
                let bit7 = this.isCarry ? 0x80 : 0x00;

                // First, set the carry
                this.setCarry(((value & 0b00000001) == 0b00000001));

                // Now, shift right one
                value = (this.a >>> 1) & 0xFF;

                // Now set bit 7 to the value of the old carry
                value = value | bit7;

                // Now set in memory
                this.mem.set(location, value);

                // Set zero
                this.setZero((value == 0x00));

                // Set negative
                this.setNegative((value & 0b10000000) == 0b10000000);
            }


        },
        // Accumulator
        0x6A: function() {
            this.debugger(1, `ROR A`);
            this.ror();
            this.pc = this.pc + 1;
        },
         // Zero Page
        0x66: function () {
            this.debugger(2, `ROR $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
            this.ror(this.getZeroPageAddress(this.pc + 1));
            this.pc = this.pc + 2;
        },
        // Absolute
        0x6E: function() {
            let targetAddress = this.getAbsoluteAddress(this.pc + 1);
            this.debugger(3, `ROR $${fh(targetAddress)} = ${fh(this.mem.get(targetAddress))}`);
            this.ror(targetAddress);
            this.pc = this.pc + 3;
        },
 
 
    }
}