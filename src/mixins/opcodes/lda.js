import { fh } from "../helpers";

export default {
    methods: {
        // LDA - Load Accumulator
        lda: function (location) {
            this.a = this.mem.get(location);
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
        0xA9: function () {
            this.cycles = 2;
            this.instruction = () => {
                this.debugger(2, `LDA #$${fh(this.mem.get(this.pc + 1))}`);
                this.lda(this.pc + 1);
                this.pc = this.pc + 2;
            }
        },
        // Zero Page
        0xA5: function() {
            this.cycles = 3;
            this.instruction = () => {
                let targetAddress = this.getZeroPageAddress(this.pc + 1);
                this.debugger(2, `LDA $${fh(targetAddress, 2)} = ${fh(this.mem.get(targetAddress))}`);
                this.lda(targetAddress);
                this.pc = this.pc + 2;
            }
        },
        // Absolute
        0xAD: function() {
            this.cycles = 4;
            this.instruction = () => {
                let targetAddress = this.getAbsoluteAddress(this.pc + 1);
                this.debugger(3, `LDA $${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.lda(targetAddress);
                this.pc = this.pc + 3;
            }
        },
        // Indexed Indirect, X
        0xA1: function() {
            this.cycles = 6;
            this.instruction = () => {
                let targetAddress = this.getIndexedIndirectXAddress(this.pc + 1);
                this.debugger(2, `LDA ($${fh(this.mem.get(this.pc + 1))},X) @ ${fh((this.mem.get(this.pc + 1) + this.x) & 0xFF)} = ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.lda(targetAddress);
                this.pc = this.pc + 2;
            }
        },
        // Indirect Indexed, Y
        0xB1: function () {
            this.cycles = 5;
            let targetAddress = this.getIndirectIndexedAddress(this.pc + 1);
            if(this.pageCrossed(this.pc + 1), targetAddress) {
                this.cycles = 6;
            }
            this.instruction = () => {
               let targetAddress = this.getIndirectIndexedAddress(this.pc + 1);
                this.debugger(2, `LDA ($${fh(this.mem.get(this.pc + 1))}),Y = ${fh(this.getAbsoluteAddress(this.mem.get(this.pc + 1), true),4)} @ ${fh(targetAddress,4)} = ${fh(this.mem.get(targetAddress))}`);
                this.lda(targetAddress);
                this.pc = this.pc + 2;
            }
        },
 
        // Absolute, X
        0xBD: function() {
            this.cycles = 4;
            let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
            if(this.pageCrossed(this.pc + 1), targetAddress) {
                this.cycles = 5;
            }
            this.instruction = () => {
                let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
                this.debugger(3, `LDA ($${fh(this.mem.get(this.pc + 1))},X) ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.lda(targetAddress);
                this.pc = this.pc + 3;
            }
        },
        // Absolute, Y
        0xB9: function() {
            this.cycles = 4;
            let targetAddress = this.getAbsoluteYAddress(this.pc + 1);
            if(this.pageCrossed(this.pc + 1), targetAddress) {
                this.cycles = 5;
            }
            this.instruction = () => {
                let targetAddress = this.getAbsoluteYAddress(this.pc + 1);
                this.debugger(3, `LDA $${fh(this.getAbsoluteAddress(this.pc + 1), 4)},Y @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.lda(targetAddress);
                this.pc = this.pc + 3;
            }
        }
 
    }
}