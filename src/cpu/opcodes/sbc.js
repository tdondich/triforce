import { fh, unsignedByteToSignedByte } from '../../util'

function sbc(Cpu) {
    // SBC - Subtract with Carry 
    // Note: This was was nuts. See: http://users.telenet.be/kim1-6502/6502/proman.html#222
    Cpu.prototype.sbc = function (location) {
        let value = this.mem.get(location);
        value = value ^ 0xFF;

        let result = this.a + value;
        if (this.isCarry()) {
            result = result + 1;
        }
        this.setCarry((result > 0xFF));

        // Determine a 2's complement overflow
        // So let's get the signed values of both operands and add them
        let intVal = unsignedByteToSignedByte(this.a) + unsignedByteToSignedByte(value);
        this.setOverflow((intVal > 127 || intVal < -128));

        // Now set to accumulator, but be sure to mask
        this.a = result & 0xFF;

        // Evaluate to zero, only after the accumulator has been set
        this.setZero((this.a === 0x00));

        // Now set negative
        this.p = (this.p & 0b01111111) | (this.a & 0b10000000);
    }
    // Immediate
    Cpu.prototype[0xE9] = function () {
        this.cycles = 2;
        this.instruction = () => {
            if (this.inDebug) this.debugger(2, () => `SBC #$${fh(this.mem.get(this.pc + 1))}`);
            this.sbc(this.pc + 1);
            this.pc = this.pc + 2;
        }
    }
    // Zero Page
    Cpu.prototype[0xE5] = function () {
        this.cycles = 3;
        this.instruction = () => {
            if (this.inDebug) this.debugger(2, () => `SBC $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
            this.sbc(this.getZeroPageAddress(this.pc + 1));
            this.pc = this.pc + 2;
        }
    }
    // Zero Page, X
    Cpu.prototype[0xF5] = function () {
        this.cycles = 4;
        this.instruction = () => {
            let targetAddress = this.getZeroPageXAddress(this.pc + 1);
            if (this.inDebug) this.debugger(2, () => `SBC $${fh(this.mem.get(this.pc + 1))},X @ ${fh(targetAddress, 2)} = ${fh(this.mem.get(targetAddress))}`);
            this.sbc(targetAddress);
            this.pc = this.pc + 2;
        }
    }

    // Indexed Indirect, X 
    Cpu.prototype[0xE1] = function () {
        this.cycles = 6;
        this.instruction = () => {
            let targetAddress = this.getIndexedIndirectXAddress(this.pc + 1);
            if (this.inDebug) this.debugger(2, () => `SBC ($${fh(this.mem.get(this.pc + 1))},X) @ ${fh((this.mem.get(this.pc + 1) + this.x) & 0xFF)} = ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
            this.sbc(targetAddress);
            this.pc = this.pc + 2;
        }
    }
    // Indirect Indexed, Y
    Cpu.prototype[0xF1] = function () {
        this.cycles = 5;
        let targetAddress = this.getIndirectIndexedAddress(this.pc + 1);
        let first = this.getAbsoluteAddress(this.mem.get(this.pc + 1), true)
        if (this.pageCrossed(first, targetAddress)) {
            this.cycles = 6;
        }
        this.instruction = () => {
            let targetAddress = this.getIndirectIndexedAddress(this.pc + 1);
            if (this.inDebug) this.debugger(2, () => `SBC ($${fh(this.mem.get(this.pc + 1))}),Y = ${fh(this.getAbsoluteAddress(this.mem.get(this.pc + 1), true), 4)} @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
            this.sbc(targetAddress);
            this.pc = this.pc + 2;
        }
    }

    // Absolute
    Cpu.prototype[0xED] = function () {
        this.cycles = 4;
        this.instruction = () => {
            let targetAddress = this.getAbsoluteAddress(this.pc + 1);
            if (this.inDebug) this.debugger(3, () => `SBC $${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
            this.sbc(targetAddress);
            this.pc = this.pc + 3;
        }
    }
    // Absolute, Y
    Cpu.prototype[0xF9] = function () {
        this.cycles = 4;
        let targetAddress = this.getAbsoluteYAddress(this.pc + 1);
        let first = this.getAbsoluteAddress(this.pc + 1);
        if (this.pageCrossed(first, targetAddress)) {
            this.cycles = 5;
        }
        this.instruction = () => {
            let targetAddress = this.getAbsoluteYAddress(this.pc + 1);
            if (this.inDebug) this.debugger(3, () => `SBC $${fh(this.getAbsoluteAddress(this.pc + 1), 4)},Y @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
            this.sbc(targetAddress);
            this.pc = this.pc + 3;
        }
    }
    // Absolute, X
    Cpu.prototype[0xFD] = function () {
        this.cycles = 4;
        let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
        let first = this.getAbsoluteAddress(this.pc + 1);
        if (this.pageCrossed(first, targetAddress)) {
            this.cycles = 5;
        }
        this.instruction = () => {
            let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
            if (this.inDebug) this.debugger(3, () => `SBC $${fh(this.getAbsoluteAddress(this.pc + 1), 4)},X @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
            this.sbc(targetAddress);
            this.pc = this.pc + 3;
        }
    }

}
export default sbc