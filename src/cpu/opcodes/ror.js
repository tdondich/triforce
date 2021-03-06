import { fh } from '../../util'

function ror(Cpu) {
    // ROR - Rotate Right
    Cpu.prototype.ror = function (location) {
        let value = 0;
        if (location === undefined) {
            // Perform it on the accumulator
            value = this.a;
            let bit7 = this.isCarry() ? 0x80 : 0x00;

            // First, set the carry
            this.setCarry(((value & 0b00000001) === 0b00000001));

            // Now, shift right one
            this.a = (this.a >>> 1) & 0xFF;

            // Now set bit 7 to the value of the old carry
            this.a = this.a | bit7;

            // Set zero
            this.setZero((this.a === 0x00));

            // Set negative
            this.setNegative((this.a & 0b10000000) === 0b10000000);

        } else {
            value = this.mem.get(location);
            let bit7 = this.isCarry() ? 0x80 : 0x00;

            // First, set the carry
            this.setCarry(((value & 0b00000001) === 0b00000001));

            // Now, shift right one
            value = (this.a >>> 1) & 0xFF;

            // Now set bit 7 to the value of the old carry
            value = value | bit7;

            // Now set in memory
            this.mem.set(location, value);

            // Set zero
            this.setZero((value === 0x00));

            // Set negative
            this.setNegative((value & 0b10000000) === 0b10000000);
        }

    }
    // Accumulator
    Cpu.prototype[0x6A] = function () {
        this.cycles = 2;
        this.instruction = () => {
            if (this.inDebug) this.debugger(1, () => `ROR A`);
            this.ror();
            this.pc = this.pc + 1;
        }
    }
    // Zero Page
    Cpu.prototype[0x66] = function () {
        this.cycles = 5;
        this.instruction = () => {
            if (this.inDebug) this.debugger(2, () => `ROR $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
            this.ror(this.getZeroPageAddress(this.pc + 1));
            this.pc = this.pc + 2;
        }
    }
    // Zero Page, X
    Cpu.prototype[0x76] = function () {
        this.cycles = 6;
        this.instruction = () => {
            let targetAddress = this.getZeroPageXAddress(this.pc + 1);
            if (this.inDebug) this.debugger(2, () => `ROR $${fh(this.mem.get(this.pc + 1))},X @ ${fh(targetAddress, 2)} = ${fh(this.mem.get(targetAddress))}`);
            this.ror(targetAddress);
            this.pc = this.pc + 2;
        }
    }

    // Absolute
    Cpu.prototype[0x6E] = function () {
        this.cycles = 6;
        this.instruction = () => {
            let targetAddress = this.getAbsoluteAddress(this.pc + 1);
            if (this.inDebug) this.debugger(3, () => `ROR $${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
            this.ror(targetAddress);
            this.pc = this.pc + 3;
        }
    }
    // Absolute, X
    Cpu.prototype[0x7E] = function () {
        this.cycles = 7;
        this.instruction = () => {
            let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
            if (this.inDebug) this.debugger(3, () => `ROR $${fh(this.getAbsoluteAddress(this.pc + 1), 4)},X @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
            this.ror(targetAddress);
            this.pc = this.pc + 3;
        }
    }

}
export default ror