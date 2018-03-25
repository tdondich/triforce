import {fh} from '../helpers';

export default {
    methods: {
       0xEA: function() {
            this.cycles = 2;
            this.instruction = () => {
                this.debugger(1, `NOP`);
                this.pc = this.pc + 1;
            }
        },
        // Unofficial NOPs below
        // $1A, $3A, $5A, $7A, $DA, $FA

        // $04 - IGN - Another form of NOP
        0x04: function() {
            this.cycles = 3;
            this.instruction = () => {
                this.debugger(2, `*NOP $${fh(this.mem.get(this.pc + 1), 2)} = ${fh(this.mem.get(this.mem.get(this.pc + 1)), 2)}`);
                this.pc = this.pc + 2;
            }
        },
        0x44: function() {
            this.cycles = 3;
            this.instruction = () => {
                this.debugger(2, `*NOP $${fh(this.mem.get(this.pc + 1), 2)} = ${fh(this.mem.get(this.mem.get(this.pc + 1)), 2)}`);
                this.pc = this.pc + 2;
            }
        },
        0x64: function() {
            this.cycles = 3;
            this.instruction = () => {
                this.debugger(2, `*NOP $${fh(this.mem.get(this.pc + 1), 2)} = ${fh(this.mem.get(this.mem.get(this.pc + 1)), 2)}`);
                this.pc = this.pc + 2;
            }
        },
        0x0C: function() {
            this.cycles = 4;
            this.instruction = () => {
                this.debugger(3, `*NOP $${fh(this.getAbsoluteAddress(this.pc + 1), 2)} = ${fh(this.mem.get(this.getAbsoluteAddress(this.pc + 1)), 2)}`);
                this.pc = this.pc + 3;
            }
        },


 
    }
}
