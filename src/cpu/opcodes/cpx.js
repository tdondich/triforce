import { fh } from '../../util'

function cpx(Cpu) {
    // CPX - Compare X with Immediate
    Cpu.prototype.cpx = function (location) {
        let value = this.mem.get(location);
        let result = this.x - value;

        // Set the carry flag
        this.setCarry((this.x >= value));

        // Set zero
        this.setZero((result === 0x00));

        // Set Negative
        // @todo: Check if this is calculated correct. It says if bit 7 is set.
        this.p = (this.p & 0b01111111) | (result & 0b10000000);
    }
    // Immediate
    Cpu.prototype[0xE0] = function () {
        this.cycles = 2;
        this.instruction = () => {
            if (this.inDebug) this.debugger(2, () => `CPX #$${fh(this.mem.get(this.pc + 1))}`);
            this.cpx(this.pc + 1);
            this.pc = this.pc + 2;
        }
    }
    // Zero Page
    Cpu.prototype[0xE4] = function () {
        this.cycles = 3;
        this.instruction = () => {
            if (this.inDebug) this.debugger(2, () => `CPX $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
            this.cpx(this.getZeroPageAddress(this.pc + 1));
            this.pc = this.pc + 2;
        }
    }
    // Absolute
    Cpu.prototype[0xEC] = function () {
        this.cycles = 4;
        this.instruction = () => {
            let targetAddress = this.getAbsoluteAddress(this.pc + 1);
            if (this.inDebug) this.debugger(3, () => `CPX $${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
            this.cpx(targetAddress);
            this.pc = this.pc + 3;
        }
    }
}
export default cpx