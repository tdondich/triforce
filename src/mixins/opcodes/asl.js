import { fh } from "../helpers";

export default {
    methods: {
        // ASL - Artithmetic Shift Left
        asl: function (location) {
            let value = 0;
            if(!location) {
                // Perform it on the accumulator
                value = this.a;
            } else {
                value = this.mem.get(location);
            }
            // First, set the carry
            this.setCarry(((value & 0b10000000) == 0b10000000));
            
            // Now, shift left
            this.a = (this.a << 1) & 0xFF;

            // Set zero
            this.setZero((this.a == 0x00));

            // Set negative
            this.setNegative((this.a & 0b10000000) == 0b10000000);


        },
        // Accumulator
        0x0A: function() {
            this.debugger(1, `ASL A`);
            this.asl();
            this.pc = this.pc + 1;
        }
    }
}