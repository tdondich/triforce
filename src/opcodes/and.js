import {fh} from '../util'

export default {
    methods: {
        // AND - Logical AND with accumulator
        and: function (location) {
            this.a = this.a & this.mem.get(location);
            // Now set the zero flag if A is 0
            if (this.a === 0x00) {
                this.p = this.p | 0b10;
            } else {
                this.p = this.p & 0b11111101;
            }
            // Now set negative
            this.p = (this.p & 0b01111111) | (this.a & 0b10000000);
        },
        // Immediate
        0x29: function () {
            this.cycles = 2;
            this.instruction = () => {
                if(this.inDebug) this.debugger(2, () => `AND #$${fh(this.mem.get(this.pc + 1))}`);
                this.and(this.pc + 1);
                this.pc = this.pc + 2;
            }
        },
        // Zero Page
        0x25: function () {
            this.cycles = 3;
            this.instruction = () => {
                if(this.inDebug) this.debugger(2, () => `AND $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
                this.and(this.getZeroPageAddress(this.pc + 1));
                this.pc = this.pc + 2;
            }
        },
        // Zero Page, X
        0x35: function () {
            this.cycles = 4;
            this.instruction = () => {
                let targetAddress = this.getZeroPageXAddress(this.pc + 1);
                if(this.inDebug) this.debugger(2, () => `AND $${fh(this.mem.get(this.pc + 1))},X @ ${fh(targetAddress, 2)} = ${fh(this.mem.get(targetAddress))}`);
                this.and(targetAddress);
                this.pc = this.pc + 2;
            }
        },
 
        // Indexed Indirect, X
        0x21: function () {
            this.cycles = 6;
            this.instruction = () => {
                let targetAddress = this.getIndexedIndirectXAddress(this.pc + 1);
                if(this.inDebug) this.debugger(2, () => `AND ($${fh(this.mem.get(this.pc + 1))},X) @ ${fh((this.mem.get(this.pc + 1) + this.x) & 0xFF)} = ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.and(targetAddress);
                this.pc = this.pc + 2;
            }
        },
        // Indirect Indexed, Y
        0x31: function () {
            this.cycles = 5;
            let targetAddress = this.getIndirectIndexedAddress(this.pc + 1);
            let first = this.getAbsoluteAddress(this.mem.get(this.pc + 1), true)
            if(this.pageCrossed(first, targetAddress)) {
                this.cycles = 6;
            }
            this.instruction = () => {
               let targetAddress = this.getIndirectIndexedAddress(this.pc + 1);
               if(this.inDebug) this.debugger(2, () => `AND ($${fh(this.mem.get(this.pc + 1))}),Y = ${fh(this.getAbsoluteAddress(this.mem.get(this.pc + 1), true),4)} @ ${fh(targetAddress,4)} = ${fh(this.mem.get(targetAddress))}`);
                this.and(targetAddress);
                this.pc = this.pc + 2;
            }
        },
 
 
        // Absolute
        0x2D: function() {
            this.cycles = 4;
            this.instruction = () => {
                let targetAddress = this.getAbsoluteAddress(this.pc + 1);
                if(this.inDebug) this.debugger(3, () => `AND $${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.and(targetAddress);
                this.pc = this.pc + 3;
            }
        },
        // Absolute, Y
        0x39: function() {
            this.cycles = 4;
            let targetAddress = this.getAbsoluteYAddress(this.pc + 1);
            let first = this.getAbsoluteAddress(this.pc + 1);
            if(this.pageCrossed(first, targetAddress)) {
                this.cycles = 5;
            }
            this.instruction = () => {
                let targetAddress = this.getAbsoluteYAddress(this.pc + 1);
                if(this.inDebug) this.debugger(3, () => `AND $${fh(this.getAbsoluteAddress(this.pc + 1), 4)},Y @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.and(targetAddress);
                this.pc = this.pc + 3;
            }
        },
        // Absolute, X
        0x3D: function() {
            this.cycles = 4;
            let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
            let first = this.getAbsoluteAddress(this.pc + 1);
            if(this.pageCrossed(first, targetAddress)) {
                this.cycles = 5;
            }
            this.instruction = () => {
                let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
                if(this.inDebug) this.debugger(3, () => `AND $${fh(this.getAbsoluteAddress(this.pc + 1), 4)},X @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.and(targetAddress);
                this.pc = this.pc + 3;
            }
        },
 
 
 
 
    }
}
 