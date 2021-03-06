import { fh } from '../../util'

function asl(Cpu) {
    // ASL - Artithmetic Shift Left
    Cpu.prototype.asl = function (location) {
        let value = 0;
        if (location === undefined) {
            // Perform it on the accumulator
            value = this.a;
            // First, set the carry
            this.setCarry(((value & 0b10000000) === 0b10000000));

            // Now, shift left
            this.a = (this.a << 1) & 0xFF;

            // Set zero
            this.setZero((this.a === 0x00));

            // Set negative
            this.setNegative((this.a & 0b10000000) === 0b10000000);
        } else {
            value = this.mem.get(location);
            // First, set the carry
            this.setCarry(((value & 0b10000000) === 0b10000000));

            // Now, shift left
            this.mem.set(location, (value << 1) & 0xFF);

            value = this.mem.get(location);

            // Set zero
            this.setZero((value === 0x00));

            // Set negative
            this.setNegative((value & 0b10000000) === 0b10000000);
        }

    }
    // Accumulator
    Cpu.prototype[0x0A] = function () {
        this.cycles = 2;
        this.instruction = () => {
            if (this.inDebug) this.debugger(1, () => `ASL A`);
            this.asl();
            this.pc = this.pc + 1;
        }
    }
    // Zero Page
    Cpu.prototype[0x06] = function () {
        this.cycles = 5;
        this.instruction = () => {
            if (this.inDebug) this.debugger(2, () => `ASL $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
            this.asl(this.getZeroPageAddress(this.pc + 1));
            this.pc = this.pc + 2;
        }
    }
    // Zero Page, X
    Cpu.prototype[0x16] = function () {
        this.cycles = 6;
        this.instruction = () => {
            let targetAddress = this.getZeroPageXAddress(this.pc + 1);
            if (this.inDebug) this.debugger(2, () => `ASL $${fh(this.mem.get(this.pc + 1))},X @ ${fh(targetAddress, 2)} = ${fh(this.mem.get(targetAddress))}`);
            this.asl(targetAddress);
            this.pc = this.pc + 2;
        }
    }

    // Absolute
    Cpu.prototype[0x0E] = function () {
        this.cycles = 6;
        this.instruction = () => {
            let targetAddress = this.getAbsoluteAddress(this.pc + 1);
            if (this.inDebug) this.debugger(3, () => `ASL $${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
            this.asl(targetAddress);
            this.pc = this.pc + 3;
        }
    }
    // Absolute, X
    Cpu.prototype[0x1E] = function () {
        this.cycles = 7;
        this.instruction = () => {
            let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
            if (this.inDebug) this.debugger(3, () => `ASL $${fh(this.getAbsoluteAddress(this.pc + 1), 4)},X @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
            this.asl(targetAddress);
            this.pc = this.pc + 3;
        }
    }

}
export default asl