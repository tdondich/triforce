import {fh} from '../util'

export default {
    methods: {
        // LDY - Load Y Register
        ldy: function (location) {
            // Load value directly into y register
            this.y = this.mem.get(location);
            // Now set the zero flag if Y is 0
            this.setZero((this.y === 0x00));
            // Now set negative
            this.p = (this.p & 0b01111111) | (this.y & 0b10000000);
        },
        // Immediate
        0xA0: function() {
            this.cycles = 2;
            this.instruction = () => {
                if(this.inDebug) this.debugger(2, () => `LDY #$${fh(this.mem.get(this.pc + 1))}`);
                this.ldy(this.pc + 1);
                this.pc = this.pc + 2;
            }
        },
        // Absolute
        0xAC: function() {
            this.cycles = 4;
            this.instruction = () => {
                let targetAddress = this.getAbsoluteAddress(this.pc + 1);
                if(this.inDebug) this.debugger(3, () => `LDY $${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.ldy(targetAddress);
                this.pc = this.pc + 3;
            }
        },
        // Absolute, X
        0xBC: function() {
            this.cycles = 4;
            let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
            let first = this.getAbsoluteAddress(this.pc + 1);
            if(this.pageCrossed(first, targetAddress)) {
                this.cycles = 5;
            }
            this.instruction = () => {
                let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
                if(this.inDebug) this.debugger(3, () => `LDY $${fh(this.getAbsoluteAddress(this.pc + 1), 4)},X @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.ldy(targetAddress);
                this.pc = this.pc + 3;
            }
        },
 
        // Zero Page
        0xA4: function () {
            this.cycles = 3;
            this.instruction = () => {
                let targetAddress = this.getZeroPageAddress(this.pc + 1);
                if(this.inDebug) this.debugger(2, () => `LDY $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(targetAddress))}`);
                this.ldy(targetAddress);
                this.pc = this.pc + 2;
            }
        },
        // Zero Page, X
        0xB4: function () {
            this.cycles = 4;
            this.instruction = () => {
                let targetAddress = this.getZeroPageXAddress(this.pc + 1);
                if(this.inDebug) this.debugger(2, () => `LDY $${fh(this.mem.get(this.pc + 1))},X @ ${fh(targetAddress, 2)} = ${fh(this.mem.get(targetAddress))}`);
                this.ldy(targetAddress);
                this.pc = this.pc + 2;
            }
        },
 
    }
}
 