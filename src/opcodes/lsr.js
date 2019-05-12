import {fh} from '../util'

export default {
    methods: {
        // LSR - Logical Shift Right
        lsr: function (location) {
            let value = 0;
            if(location === undefined) {
                // Perform it on the accumulator
                value = this.a;
                // First, set the carry
                this.setCarry(((value & 0b0001) === 0b0001));

                // Now, shift right
                this.a = this.a >>> 1;

                // Set zero
                this.setZero((this.a === 0x00));

            } else {
                value = this.mem.get(location);
                this.mem.set(location, value >>> 1);
                // First, set the carry
                this.setCarry(((value & 0b0001) === 0b0001));

                // Set zero
                this.setZero((this.mem.get(location) === 0x00));
            }
            this.setNegative(false);

        },
        // Accumulator
        0x4A: function() {
            this.cycles = 2;
            this.instruction = () => {
                if(this.inDebug) this.debugger(1, () => `LSR A`);
                this.lsr();
                this.pc = this.pc + 1;
            }
        },
         // Zero Page
        0x46: function () {
            this.cycles = 5;
            this.instruction = () => {
                if(this.inDebug) this.debugger(2, () => `LSR $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
                this.lsr(this.getZeroPageAddress(this.pc + 1));
                this.pc = this.pc + 2;
            }
        },
        // Zero Page, X
        0x56: function () {
            this.cycles = 6;
            this.instruction = () => {
                let targetAddress = this.getZeroPageXAddress(this.pc + 1);
                if(this.inDebug) this.debugger(2, () => `LSR $${fh(this.mem.get(this.pc + 1))},X @ ${fh(targetAddress, 2)} = ${fh(this.mem.get(targetAddress))}`);
                this.lsr(targetAddress);
                this.pc = this.pc + 2;
            }
        },
 
        // Absolute
        0x4E: function() {
            this.cycles = 6;
            this.instruction = () => {
                let targetAddress = this.getAbsoluteAddress(this.pc + 1);
                if(this.inDebug) this.debugger(3, () => `LSR $${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.lsr(targetAddress);
                this.pc = this.pc + 3;
            }
        },
           // Absolute, X
        0x5E: function () {
            this.cycles = 7;
            this.instruction = () => {
                let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
                if(this.inDebug) this.debugger(3, () => `LSR $${fh(this.getAbsoluteAddress(this.pc + 1), 4)},X @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.lsr(targetAddress);
                this.pc = this.pc + 3;
            }
        },
 
    }
}