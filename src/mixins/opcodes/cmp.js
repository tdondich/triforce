import { fh } from "../helpers";

export default {
    methods: {
        // CMP - Compare contents of accumulator with memory value
        cmp: function (location) {
            let value = this.mem.get(location);
            let result = this.a - value;
            this.setCarry((value <= this.a));
            this.setZero((result === 0x00));

            // Set Negative
            // @todo: Check if this is calculated correct. It says if bit 7 is set.
            this.p = (this.p & 0b01111111) | (result & 0b10000000);
        },
        // Immediate
        0xC9: function() {
            this.cycles = 2;
            this.instruction = () => {
                this.debugger(2, () => `CMP #$${fh(this.mem.get(this.pc + 1))}`);
                this.cmp(this.pc + 1);
                this.pc = this.pc + 2;
            }
        },
        // Zero Page
        0xC5: function () {
            this.cycles = 3;
            this.instruction = () => {
                this.debugger(2, () => `CMP $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
                this.cmp(this.getZeroPageAddress(this.pc + 1));
                this.pc = this.pc + 2;
            }
        },
        // Zero Page, X
        0xD5: function () {
            this.cycles = 4;
            this.instruction = () => {
                let targetAddress = this.getZeroPageXAddress(this.pc + 1);
                this.debugger(2, () => `CMP $${fh(this.mem.get(this.pc + 1))},X @ ${fh(targetAddress, 2)} = ${fh(this.mem.get(targetAddress))}`);
                this.cmp(targetAddress);
                this.pc = this.pc + 2;
            }
        },
 
        // Indexed Indirect, X
        0xC1: function() {
            this.cycles = 6;
            this.instruction = () => {
                let targetAddress = this.getIndexedIndirectXAddress(this.pc + 1);
                this.debugger(2, () => `CMP ($${fh(this.mem.get(this.pc + 1))},X) @ ${fh((this.mem.get(this.pc + 1) + this.x) & 0xFF)} = ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.cmp(targetAddress);
                this.pc = this.pc + 2;
            }
        },
       // Indirect Indexed, Y
        0xD1: function () {
            this.cycles = 5;
            let targetAddress = this.getIndirectIndexedAddress(this.pc + 1);
            let first = this.getAbsoluteAddress(this.mem.get(this.pc + 1), true)
            if(this.pageCrossed(first, targetAddress)) {
                this.cycles = 6;
            }
            this.instruction = () => {
               let targetAddress = this.getIndirectIndexedAddress(this.pc + 1);
                this.debugger(2, () => `CMP ($${fh(this.mem.get(this.pc + 1))}),Y = ${fh(this.getAbsoluteAddress(this.mem.get(this.pc + 1), true),4)} @ ${fh(targetAddress,4)} = ${fh(this.mem.get(targetAddress))}`);
                this.cmp(targetAddress);
                this.pc = this.pc + 2;
            }
        },
 

        // Absolute
        0xCD: function() {
            this.cycles = 4;
            this.instruction = () => {
                let targetAddress = this.getAbsoluteAddress(this.pc + 1);
                this.debugger(3, () => `CMP $${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.cmp(targetAddress);
                this.pc = this.pc + 3;
            }
        },
         // Absolute, Y
        0xD9: function() {
            this.cycles = 4;
            let targetAddress = this.getAbsoluteYAddress(this.pc + 1);
            let first = this.getAbsoluteAddress(this.pc + 1);
            if(this.pageCrossed(first, targetAddress)) {
                this.cycles = 5;
            }
            this.instruction = () => {
                let targetAddress = this.getAbsoluteYAddress(this.pc + 1);
                this.debugger(3, () => `CMP $${fh(this.getAbsoluteAddress(this.pc + 1), 4)},Y @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.cmp(targetAddress);
                this.pc = this.pc + 3;
            }
        },
         // Absolute, X
        0xDD: function () {
            this.cycles = 4;
            let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
            let first = this.getAbsoluteAddress(this.pc + 1);
            if(this.pageCrossed(first, targetAddress)) {
                this.cycles = 5;
            }
            this.instruction = () => {
                let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
                this.debugger(3, () => `CMP $${fh(this.getAbsoluteAddress(this.pc + 1), 4)},X @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.cmp(targetAddress);
                this.pc = this.pc + 3;
            }
        },
 
    }
}
 