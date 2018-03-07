import { fh } from "../helpers";

export default {
    methods: {
        // LSR - Logical Shift Right
        lsr: function (location) {
            let value = 0;
            if(!location) {
                // Perform it on the accumulator
                value = this.a;
            } else {
                value = this.mem.get(location);
            }
            // First, set the carry
            this.setCarry(((value & 0b0001) == 0b0001));
            
            // Now, shift right
            this.a = this.a >>> 1;

            // Set zero
            this.setZero((this.a == 0x00));

            this.setNegative(false);


        },
        // Accumulator
        0x4A: function() {
            this.debugger(1, `LSR A`);
            this.lsr();
            this.pc = this.pc + 1;
        }
    }
}