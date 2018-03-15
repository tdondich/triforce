import { fh } from "../helpers";

export default {
    methods: {
        // ROL - Rotate Left
        rol: function (location) {
            let value = 0;
            if(!location) {
                // Perform it on the accumulator
                value = this.a;
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

            } else {
                value = this.mem.get(location);
                let bit0 = this.isCarry ? 0x01 : 0x00;

                // First, set the carry
                this.setCarry(((value & 0b10000000) == 0b10000000));

                // Now, shift left one
                value = (value << 1) & 0xFF;

                // Now set bit 0 to the value of the old carry
                value = value | bit0;

                // Now set in memory
                this.mem.set(location, value);

                // Set zero
                this.setZero((value == 0x00));

                // Set negative
                this.setNegative((value & 0b10000000) == 0b10000000);
            }


        },
        // Accumulator
        0x2A: function() {
            this.cycles = 2;
            this.instruction = () => {
                this.debugger(1, `ROL A`);
                this.rol();
                this.pc = this.pc + 1;
            }
        },
         // Zero Page
        0x26: function () {
            this.cycles = 5;
            this.instruction = () => {
                this.debugger(2, `ROL $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
                this.rol(this.getZeroPageAddress(this.pc + 1));
                this.pc = this.pc + 2;
            }
        },
        // Zero Page, X
        0x36: function () {
            this.cycles = 6;
            this.instruction = () => {
                let targetAddress = this.getZeroPageXAddress(this.pc + 1);
                this.debugger(2, `ROL $${fh(this.mem.get(this.pc + 1))},X @ ${fh(targetAddress, 2)} = ${fh(this.mem.get(targetAddress))}`);
                this.rol(targetAddress);
                this.pc = this.pc + 2;
            }
        },
 
        // Absolute
        0x2E: function() {
            this.cycles = 6;
            this.instruction = () => {
                let targetAddress = this.getAbsoluteAddress(this.pc + 1);
                this.debugger(3, `ROL $${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.rol(targetAddress);
                this.pc = this.pc + 3;
            }
        },
           // Absolute, X
        0x3E: function () {
            this.cycles = 7;
            this.instruction = () => {
                let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
                this.debugger(3, `ROL $${fh(this.getAbsoluteAddress(this.pc + 1), 4)},X @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.rol(targetAddress);
                this.pc = this.pc + 3;
            }
        },
 
 
    }
}