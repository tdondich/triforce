import { fh } from '../../util'

function lax(Cpu) {
    // Absolute, X
    Cpu.prototype[0xA3] = function () {
        this.cycles = 6;
        this.instruction = () => {
            let targetAddress = this.getIndexedIndirectXAddress(this.pc + 1);
            if (this.inDebug) this.debugger(2, () => `*LAX ($${fh(this.mem.get(this.pc + 1))},X) @ ${fh((this.mem.get(this.pc + 1) + this.x) & 0xFF)} = ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
            this.lda(targetAddress);
            this.x = this.a;
            this.pc = this.pc + 2;
        }
    }
    // Zero Page
    Cpu.prototype[0xA7] = function () {
        this.cycles = 3;
        this.instruction = () => {
            let targetAddress = this.getZeroPageAddress(this.pc + 1);
            if (this.inDebug) this.debugger(2, () => `*LAX $${fh(targetAddress, 2)} = ${fh(this.mem.get(targetAddress))}`);
            this.lda(targetAddress);
            this.x = this.a;
            this.pc = this.pc + 2;
        }
    }
    // Absolute
    Cpu.prototype[0xAF] = function () {
        this.cycles = 4;
        this.instruction = () => {
            let targetAddress = this.getAbsoluteAddress(this.pc + 1);
            if (this.inDebug) this.debugger(3, () => `*LAX $${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
            this.lda(targetAddress);
            this.x = this.a;
            this.pc = this.pc + 3;

        }
    }
    Cpu.prototype[0xB3] = function () {
        this.cycles = 5;
        this.instruction = () => {
            let targetAddress = this.getIndirectIndexedAddress(this.pc + 1);
            if (this.inDebug) this.debugger(2, () => `*LAX ($${fh(this.mem.get(this.pc + 1))}),Y = ${fh(this.getAbsoluteAddress(this.mem.get(this.pc + 1), true), 4)} @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
            this.lda(targetAddress);
            this.x = this.a;
            this.pc = this.pc + 2;

        }
    }
    Cpu.prototype[0xB7] = function () {
        this.cycles = 4;
        this.instruction = () => {
            let targetAddress = this.getZeroPageYAddress(this.pc + 1);
            if (this.inDebug) this.debugger(2, () => `*LAX $${fh(this.mem.get(this.pc + 1))},Y @ ${fh(targetAddress, 2)} = ${fh(this.mem.get(targetAddress))}`);
            this.lda(targetAddress);
            this.x = this.a;
            this.pc = this.pc + 2;
        }
    }
    Cpu.prototype[0xBF] = function () {
        this.cycles = 4;
        this.instruction = () => {
            let targetAddress = this.getAbsoluteYAddress(this.pc + 1);
            if (this.inDebug) this.debugger(3, () => `*LAX $${fh(this.getAbsoluteAddress(this.pc + 1), 4)},Y @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
            this.lda(targetAddress);
            this.x = this.a;
            this.pc = this.pc + 3;
        }
    }


}
export default lax