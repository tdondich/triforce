import { fh } from "../helpers";

export default {
    methods: {
        // CMP - Compare contents of accumulator with memory value
        cmp: function (location) {
            let value = this.mem.get(location);
            let result = this.a - value;
            this.setCarry((value <= this.a));
            this.setZero((result == 0x00));

            // Set Negative
            // @todo: Check if this is calculated correct. It says if bit 7 is set.
            this.p = (this.p & 0b01111111) | (result & 0b10000000);
        },
        // Immediate
        0xC9: function() {
            this.cycles = 2;
            this.instruction = () => {
                this.debugger(2, `CMP #$${fh(this.mem.get(this.pc + 1))}`);
                this.cmp(this.pc + 1);
                this.pc = this.pc + 2;
            }
        },
        // Zero Page
        0xC5: function () {
            this.cycles = 3;
            this.instruction = () => {
                this.debugger(2, `CMP $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
                this.cmp(this.getZeroPageAddress(this.pc + 1));
                this.pc = this.pc + 2;
            }
        },
        // Indexed Indirect, X
        0xC1: function() {
            this.cycles = 6;
            this.instruction = () => {
                let targetAddress = this.getIndexedIndirectXAddress(this.pc + 1);
                this.debugger(2, `CMP ($${fh(this.mem.get(this.pc + 1))},X) @ ${fh((this.mem.get(this.pc + 1) + this.x) & 0xFF)} = ${fh(targetAddress)} = ${fh(this.mem.get(targetAddress))}`);
                this.cmp(targetAddress);
                this.pc = this.pc + 2;
            }
        },
        // Absolute
        0xCD: function() {
            this.cycles = 4;
            this.instruction = () => {
                let targetAddress = this.getAbsoluteAddress(this.pc + 1);
                this.debugger(3, `CMP $${fh(targetAddress)} = ${fh(this.mem.get(targetAddress))}`);
                this.cmp(targetAddress);
                this.pc = this.pc + 3;
            }
        },
 
    }
}
 