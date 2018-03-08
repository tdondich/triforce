import { fh } from "../helpers";

export default {
    methods: {
        // ASL - Artithmetic Shift Left
        asl: function (location) {
            let value = 0;
            if(!location) {
                // Perform it on the accumulator
                value = this.a;
                // First, set the carry
                this.setCarry(((value & 0b10000000) == 0b10000000));
                
                // Now, shift left
                this.a = (this.a << 1) & 0xFF;

                // Set zero
                this.setZero((this.a == 0x00));

                // Set negative
                this.setNegative((this.a & 0b10000000) == 0b10000000);
            } else {
                value = this.mem.get(location);
                // First, set the carry
                this.setCarry(((value & 0b10000000) == 0b10000000));
                
                // Now, shift left
                this.mem.set(location, (value << 1) & 0xFF); 

                value = this.mem.get(location);

                // Set zero
                this.setZero((value == 0x00));

                // Set negative
                this.setNegative((value & 0b10000000) == 0b10000000);
            }

        },
        // Accumulator
        0x0A: function() {
            this.debugger(1, `ASL A`);
            this.asl();
            this.pc = this.pc + 1;
        },
         // Zero Page
        0x06: function () {
            this.debugger(2, `ASL $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
            this.asl(this.getZeroPageAddress(this.pc + 1));
            this.pc = this.pc + 2;
        },
        // Absolute
        0x0E: function() {
            let targetAddress = this.getAbsoluteAddress(this.pc + 1);
            this.debugger(3, `ASL $${fh(targetAddress)} = ${fh(this.mem.get(targetAddress))}`);
            this.asl(targetAddress);
            this.pc = this.pc + 3;
        },
 
 
    }
}