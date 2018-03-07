import { fh } from "../helpers";

export default {
    methods: {
        // ROL - Rotate Left
        rol: function (location) {
            let value = 0;
            if(!location) {
                // Perform it on the accumulator
                value = this.a;
            } else {
                value = this.mem.get(location);
            }

            let bit0 = this.isCarry ? 0x01 : 0x00; 

            // First, set the carry
            this.setCarry(((value & 0b10000000) == 0b10000000));
            
            // Now, shift left one
            this.a = (this.a << 1) & 0xFF;

            // Now set bit 0 to the value of the old carry
            this.a = this.a | bit0;

            // Set zero
            this.setZero((this.a == 0x00));

            // Set negative
            this.setNegative((this.a & 0b10000000) == 0b10000000);


        },
        // Accumulator
        0x2A: function() {
            this.debugger(1, `ROL A`);
            this.rol();
            this.pc = this.pc + 1;
        }
    }
}