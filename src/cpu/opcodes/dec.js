import { fh, unsignedByteToSignedByte } from '../../util'

function dec(Cpu) {
    Cpu.prototype.dec = function (location) {
        let value = unsignedByteToSignedByte(this.mem.get(location));
        value = (value - 1) & 0xFF;
        this.setZero((value === 0x00));
        this.mem.set(location, value);
        // Now set negative
        this.p = (this.p & 0b01111111) | (value & 0b10000000);
    }
    // Zero Page
    Cpu.prototype[0xC6] = function () {
        this.cycles = 5;
        this.instruction = () => {
            let targetAddress = this.getZeroPageAddress(this.pc + 1);
            if (this.inDebug) this.debugger(2, () => `DEC $${fh(targetAddress)} = ${fh(this.mem.get(targetAddress))}`);
            this.dec(targetAddress);
            this.pc = this.pc + 2;
        }
    }
    // Zero Page, X
    Cpu.prototype[0xD6] = function () {
        this.cycles = 6;
        this.instruction = () => {
            let targetAddress = this.getZeroPageXAddress(this.pc + 1);
            if (this.inDebug) this.debugger(2, () => `DEC $${fh(this.mem.get(this.pc + 1))},X @ ${fh(targetAddress, 2)} = ${fh(this.mem.get(targetAddress))}`);
            this.dec(targetAddress);
            this.pc = this.pc + 2;
        }
    }

    // Absolute
    Cpu.prototype[0xCE] = function () {
        this.cycles = 6;
        this.instruction = () => {
            let targetAddress = this.getAbsoluteAddress(this.pc + 1);
            if (this.inDebug) this.debugger(3, () => `DEC $${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
            this.dec(targetAddress);
            this.pc = this.pc + 3;
        }
    }
    // Absolute, X
    Cpu.prototype[0xDE] = function () {
        this.cycles = 7;
        this.instruction = () => {
            let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
            if (this.inDebug) this.debugger(3, () => `DEC $${fh(this.getAbsoluteAddress(this.pc + 1), 4)},X @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
            this.dec(targetAddress);
            this.pc = this.pc + 3;
        }
    }

}
export default dec