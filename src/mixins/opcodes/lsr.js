import { fh } from "../helpers";

export default {
    methods: {
        // LSR - Logical Shift Right
        lsr: function (location) {
            let value = 0;
            if (!location) {
                // Perform it on the accumulator
                value = this.a;
                // First, set the carry
                this.setCarry(((value & 0b0001) == 0b0001));

                // Now, shift right
                this.a = this.a >>> 1;

                // Set zero
                this.setZero((this.a == 0x00));

            } else {
                value = this.mem.get(location);
                this.mem.set(location, value >>> 1);
                // First, set the carry
                this.setCarry(((value & 0b0001) == 0b0001));

                // Set zero
                this.setZero((this.mem.get(location) == 0x00));
            }
            this.setNegative(false);

        },
        // Accumulator
        0x4A: function() {
            this.debugger(1, `LSR A`);
            this.lsr();
            this.pc = this.pc + 1;
        },
         // Zero Page
        0x46: function () {
            this.debugger(2, `LSR $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
            this.lsr(this.getZeroPageAddress(this.pc + 1));
            this.pc = this.pc + 2;
        },
        // Absolute
        0x4E: function() {
            let targetAddress = this.getAbsoluteAddress(this.pc + 1);
            this.debugger(3, `LSR $${fh(targetAddress)} = ${fh(this.mem.get(targetAddress))}`);
            this.lsr(targetAddress);
            this.pc = this.pc + 3;
        },
 
    }
}