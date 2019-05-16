import { fh } from '../../util'

function nop(Cpu) {
    Cpu.prototype[0xEA] = function () {
        this.cycles = 2;
        this.instruction = () => {
            if (this.inDebug) this.debugger(1, () => `NOP`);
            this.pc = this.pc + 1;
        }
    }
    // Unofficial NOPs below
    // $1A, $3A, $5A, $7A, $DA, $FA
    Cpu.prototype[0x1A] = function () {
        this.cycles = 2;
        this.instruction = () => {
            if (this.inDebug) this.debugger(1, () => `*NOP`);
            this.pc = this.pc + 1;
        }
    }
    Cpu.prototype[0x3A] = function () {
        this.cycles = 2;
        this.instruction = () => {
            if (this.inDebug) this.debugger(1, () => `*NOP`);
            this.pc = this.pc + 1;
        }
    }
    Cpu.prototype[0x5A] = function () {
        this.cycles = 2;
        this.instruction = () => {
            if (this.inDebug) this.debugger(1, () => `*NOP`);
            this.pc = this.pc + 1;
        }
    }
    Cpu.prototype[0x7A] = function () {
        this.cycles = 2;
        this.instruction = () => {
            if (this.inDebug) this.debugger(1, () => `*NOP`);
            this.pc = this.pc + 1;
        }
    }
    Cpu.prototype[0xDA] = function () {
        this.cycles = 2;
        this.instruction = () => {
            if (this.inDebug) this.debugger(1, () => `*NOP`);
            this.pc = this.pc + 1;
        }
    }
    Cpu.prototype[0xFA] = function () {
        this.cycles = 2;
        this.instruction = () => {
            if (this.inDebug) this.debugger(1, () => `*NOP`);
            this.pc = this.pc + 1;
        }
    }

    // $04 - IGN - Another form of *NOP
    Cpu.prototype[0x04] = function () {
        this.cycles = 3;
        this.instruction = () => {
            if (this.inDebug) this.debugger(2, () => `*NOP $${fh(this.mem.get(this.pc + 1), 2)} = ${fh(this.mem.get(this.mem.get(this.pc + 1)), 2)}`);
            this.pc = this.pc + 2;
        }
    }
    Cpu.prototype[0x44] = function () {
        this.cycles = 3;
        this.instruction = () => {
            if (this.inDebug) this.debugger(2, () => `*NOP $${fh(this.mem.get(this.pc + 1), 2)} = ${fh(this.mem.get(this.mem.get(this.pc + 1)), 2)}`);
            this.pc = this.pc + 2;
        }
    }
    Cpu.prototype[0x64] = function () {
        this.cycles = 3;
        this.instruction = () => {
            if (this.inDebug) this.debugger(2, () => `*NOP $${fh(this.mem.get(this.pc + 1), 2)} = ${fh(this.mem.get(this.mem.get(this.pc + 1)), 2)}`);
            this.pc = this.pc + 2;
        }
    }
    Cpu.prototype[0x0C] = function () {
        this.cycles = 4;
        this.instruction = () => {
            if (this.inDebug) this.debugger(3, () => `*NOP $${fh(this.getAbsoluteAddress(this.pc + 1), 2)} = ${fh(this.mem.get(this.getAbsoluteAddress(this.pc + 1)), 2)}`);
            this.pc = this.pc + 3;
        }
    }
    Cpu.prototype[0x14] = function () {
        this.cycles = 4;
        this.instruction = () => {
            let targetAddress = this.getZeroPageXAddress(this.pc + 1);
            if (this.inDebug) this.debugger(2, () => `*NOP $${fh(this.mem.get(this.pc + 1))},X @ ${fh(targetAddress, 2)} = ${fh(this.mem.get(targetAddress))}`);
            this.pc = this.pc + 2;
        }
    }
    Cpu.prototype[0x34] = function () {
        this.cycles = 4;
        this.instruction = () => {
            let targetAddress = this.getZeroPageXAddress(this.pc + 1);
            if (this.inDebug) this.debugger(2, () => `*NOP $${fh(this.mem.get(this.pc + 1))},X @ ${fh(targetAddress, 2)} = ${fh(this.mem.get(targetAddress))}`);
            this.pc = this.pc + 2;
        }
    }
    Cpu.prototype[0x54] = function () {
        this.cycles = 4;
        this.instruction = () => {
            let targetAddress = this.getZeroPageXAddress(this.pc + 1);
            if (this.inDebug) this.debugger(2, () => `*NOP $${fh(this.mem.get(this.pc + 1))},X @ ${fh(targetAddress, 2)} = ${fh(this.mem.get(targetAddress))}`);
            this.pc = this.pc + 2;
        }
    }
    Cpu.prototype[0x74] = function () {
        this.cycles = 4;
        this.instruction = () => {
            let targetAddress = this.getZeroPageXAddress(this.pc + 1);
            if (this.inDebug) this.debugger(2, () => `*NOP $${fh(this.mem.get(this.pc + 1))},X @ ${fh(targetAddress, 2)} = ${fh(this.mem.get(targetAddress))}`);
            this.pc = this.pc + 2;
        }
    }
    Cpu.prototype[0xD4] = function () {
        this.cycles = 4;
        this.instruction = () => {
            let targetAddress = this.getZeroPageXAddress(this.pc + 1);
            if (this.inDebug) this.debugger(2, () => `*NOP $${fh(this.mem.get(this.pc + 1))},X @ ${fh(targetAddress, 2)} = ${fh(this.mem.get(targetAddress))}`);
            this.pc = this.pc + 2;
        }
    }
    Cpu.prototype[0xF4] = function () {
        this.cycles = 4;
        this.instruction = () => {
            let targetAddress = this.getZeroPageXAddress(this.pc + 1);
            if (this.inDebug) this.debugger(2, () => `*NOP $${fh(this.mem.get(this.pc + 1))},X @ ${fh(targetAddress, 2)} = ${fh(this.mem.get(targetAddress))}`);
            this.pc = this.pc + 2;
        }
    }
    Cpu.prototype[0x80] = function () {
        this.cycles = 2;
        this.instruction = () => {
            if (this.inDebug) this.debugger(2, () => `*NOP #$${fh(this.mem.get(this.pc + 1))}`);
            this.pc = this.pc + 2;
        }
    },
        Cpu.prototype[0x82] = function () {
            this.cycles = 2;
            this.instruction = () => {
                if (this.inDebug) this.debugger(2, () => `*NOP #$${fh(this.mem.get(this.pc + 1))}`);
                this.pc = this.pc + 2;
            }
        }
    Cpu.prototype[0x89] = function () {
        this.cycles = 2;
        this.instruction = () => {
            if (this.inDebug) this.debugger(2, () => `*NOP #$${fh(this.mem.get(this.pc + 1))}`);
            this.pc = this.pc + 2;
        }
    },
        Cpu.prototype[0xC2] = function () {
            this.cycles = 2;
            this.instruction = () => {
                if (this.inDebug) this.debugger(2, () => `*NOP #$${fh(this.mem.get(this.pc + 1))}`);
                this.pc = this.pc + 2;
            }
        }
    Cpu.prototype[0xE2] = function () {
        this.cycles = 2;
        this.instruction = () => {
            if (this.inDebug) this.debugger(2, () => `*NOP #$${fh(this.mem.get(this.pc + 1))}`);
            this.pc = this.pc + 2;
        }
    },

        // Absolute,X unofficial
        Cpu.prototype[0x1C] = function () {
            this.cycles = 4;
            let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
            if (this.pageCrossed(this.pc + 1), targetAddress) {
                this.cycles = 5;
            }
            this.instruction = () => {
                let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
                if (this.inDebug) this.debugger(3, () => `*NOP $${fh(this.getAbsoluteAddress(this.pc + 1), 4)},X @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.pc = this.pc + 3;
            }
        },
        Cpu.prototype[0x3C] = function () {
            this.cycles = 4;
            let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
            if (this.pageCrossed(this.pc + 1), targetAddress) {
                this.cycles = 5;
            }
            this.instruction = () => {
                let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
                if (this.inDebug) this.debugger(3, () => `*NOP $${fh(this.getAbsoluteAddress(this.pc + 1), 4)},X @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.pc = this.pc + 3;
            }
        },

        Cpu.prototype[0x5C] = function () {
            this.cycles = 4;
            let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
            if (this.pageCrossed(this.pc + 1), targetAddress) {
                this.cycles = 5;
            }
            this.instruction = () => {
                let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
                if (this.inDebug) this.debugger(3, () => `*NOP $${fh(this.getAbsoluteAddress(this.pc + 1), 4)},X @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.pc = this.pc + 3;
            }
        },

        Cpu.prototype[0x7C] = function () {
            this.cycles = 4;
            let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
            if (this.pageCrossed(this.pc + 1), targetAddress) {
                this.cycles = 5;
            }
            this.instruction = () => {
                let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
                if (this.inDebug) this.debugger(3, () => `*NOP $${fh(this.getAbsoluteAddress(this.pc + 1), 4)},X @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.pc = this.pc + 3;
            }
        },

        Cpu.prototype[0xDC] = function () {
            this.cycles = 4;
            let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
            if (this.pageCrossed(this.pc + 1), targetAddress) {
                this.cycles = 5;
            }
            this.instruction = () => {
                let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
                if (this.inDebug) this.debugger(3, () => `*NOP $${fh(this.getAbsoluteAddress(this.pc + 1), 4)},X @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.pc = this.pc + 3;
            }
        },

        Cpu.prototype[0xFC] = function () {
            this.cycles = 4;
            let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
            if (this.pageCrossed(this.pc + 1), targetAddress) {
                this.cycles = 5;
            }
            this.instruction = () => {
                let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
                if (this.inDebug) this.debugger(3, () => `*NOP $${fh(this.getAbsoluteAddress(this.pc + 1), 4)},X @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.pc = this.pc + 3;
            }
        }
}

export default nop


