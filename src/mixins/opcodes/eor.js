import { fh } from "../helpers";

export default {
    methods: {
        // EOR - Exclusive OR on accumulator
        eor: function (location) {
            this.a = this.a ^ this.mem.get(location);
            // Now set the zero flag if A is 0
            if (this.a == 0x00) {
                this.p = this.p | 0b10;
            } else {
                this.p = this.p & 0b11111101;
            }
            // Now set negative
            this.p = (this.p & 0b01111111) | (this.a & 0b10000000);
        },
        // Immediate
        0x49: function() {
            this.debugger(2, `EOR #$${fh(this.mem.get(this.pc + 1))}`);
            this.eor(this.pc + 1);
            this.pc = this.pc + 2;
        },
        // Zero Page
        0x45: function () {
            this.debugger(2, `EOR $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
            this.eor(this.getZeroPageAddress(this.pc + 1));
            this.pc = this.pc + 2;
        },
        // Indexed Indirect, X
        0x41: function() {
            let targetAddress = this.getIndexedIndirectXAddress(this.pc + 1);
            this.debugger(2, `EOR ($${fh(this.mem.get(this.pc + 1))},X) @ ${fh((this.mem.get(this.pc + 1) + this.x) & 0xFF)} = ${fh(targetAddress)} = ${fh(this.mem.get(targetAddress))}`);
            this.eor(targetAddress);
            this.pc = this.pc + 2;
        },
        // Absolute
        0x4D: function() {
            let targetAddress = this.getAbsoluteAddress(this.pc + 1);
            this.debugger(3, `EOR $${fh(targetAddress)} = ${fh(this.mem.get(targetAddress))}`);
            this.eor(targetAddress);
            this.pc = this.pc + 3;
        }
 
    }
}