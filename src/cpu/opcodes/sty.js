import { fh } from '../../util'

function sty(Cpu) {
    // STY - Store Y Register
    Cpu.prototype.sty = function (location) {
        this.mem.set(location, this.y);
    }
    // Zero Page
    Cpu.prototype[0x84] = function () {
        this.cycles = 3;
        this.instruction = () => {
            if (this.inDebug) this.debugger(2, () => `STY $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
            this.sty(this.getZeroPageAddress(this.pc + 1));
            this.pc = this.pc + 2;
        }
    }
    // Zero Page, X
    Cpu.prototype[0x94] = function () {
        this.cycles = 4;
        this.instruction = () => {
            let targetAddress = this.getZeroPageXAddress(this.pc + 1);
            if (this.inDebug) this.debugger(2, () => `STY $${fh(this.mem.get(this.pc + 1))},X @ ${fh(targetAddress, 2)} = ${fh(this.mem.get(targetAddress))}`);
            this.sty(targetAddress);
            this.pc = this.pc + 2;
        }
    }
    // Absolute
    Cpu.prototype[0x8C] = function () {
        this.cycles = 4;
        this.instruction = () => {
            let targetAddress = this.getAbsoluteAddress(this.pc + 1);
            if (this.inDebug) this.debugger(3, () => `STY $${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
            this.sty(targetAddress);
            this.pc = this.pc + 3;
        }
    }
}

export default sty