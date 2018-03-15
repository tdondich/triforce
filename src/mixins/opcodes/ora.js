import { fh } from "../helpers";

export default {
    methods: {
        // ORA - Logical OR operation on accumulator against memory contents - immediate addressing
        ora: function (location) {
            this.a = this.a | this.mem.get(location);
            // Set zero
            if (this.a == 0x00) {
                this.p = this.p | 0b10;
            } else {
                this.p = this.p & 0b11111101;
            }
            // Set Negative
            // @todo: Check if this is calculated correct. It says if bit 7 is set.
            this.p = (this.p & 0b01111111) | (this.a & 0b10000000);
        },
        // Immediate
        0x09: function () {
            this.cycles = 2;
            this.instruction = () => {
                this.debugger(2, `ORA #$${fh(this.mem.get(this.pc + 1))}`);
                this.ora(this.pc + 1);
                this.pc = this.pc + 2;
            }
        },
        // Zero Page
        0x05: function () {
            this.cycles = 3;
            this.instruction = () => {
                this.debugger(2, `ORA $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
                this.ora(this.getZeroPageAddress(this.pc + 1));
                this.pc = this.pc + 2;
            }
        },
        // Indirect X
        0x01: function() {
            this.cycles = 6;
            this.instruction = () => {
                let targetAddress = this.getIndexedIndirectXAddress(this.pc + 1);
                this.debugger(2, `ORA ($${fh(this.mem.get(this.pc + 1))},X) @ ${fh((this.mem.get(this.pc + 1) + this.x) & 0xFF)} = ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.ora(targetAddress);
                this.pc = this.pc + 2;
            }
        },
        // Absolute
        0x0D: function() {
            this.cycles = 4;
            this.instruction = () => {
                let targetAddress = this.getAbsoluteAddress(this.pc + 1);
                this.debugger(3, `ORA $${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.ora(targetAddress);
                this.pc = this.pc + 3;
            }
        }
 
    }
}