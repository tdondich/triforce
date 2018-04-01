import {fh} from "../helpers";

export default {
    methods: {
        // STY - Store Y Register
        sty: function(location) {
            this.mem.set(location, this.y);
        },
        // Zero Page
        0x84: function () {
            this.cycles = 3;
            this.instruction = () => {
                this.debugger(2, () => `STY $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
                this.sty(this.getZeroPageAddress(this.pc + 1));
                this.pc = this.pc + 2;
            }
        },
        // Zero Page, X
        0x94: function () {
            this.cycles = 4;
            this.instruction = () => {
                let targetAddress = this.getZeroPageXAddress(this.pc + 1);
                this.debugger(2, () => `STY $${fh(this.mem.get(this.pc + 1))},X @ ${fh(targetAddress, 2)} = ${fh(this.mem.get(targetAddress))}`);
                this.sty(targetAddress);
                this.pc = this.pc + 2;
            }
        },
        // Absolute
        0x8C: function() {
            this.cycles = 4;
            this.instruction = () => {
                let targetAddress = this.getAbsoluteAddress(this.pc + 1);
                this.debugger(3, () => `STY $${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.sty(targetAddress);
                this.pc = this.pc + 3;
            }
        }
    }
}