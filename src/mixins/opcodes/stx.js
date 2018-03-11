import {fh} from "../helpers";

export default {
    methods: {
        // STX - Store X Register
        stx: function(location) {
            this.mem.set(location, this.x);
        },

        // Zero Page
        0x86: function () {
            this.cycles = 3;
            this.instruction = () => {
                this.debugger(2, `STX $${fh(this.mem.get(this.pc + 1))} = ${fh(this.x)}`);
                this.stx(this.getZeroPageAddress(this.pc + 1));
                this.pc = this.pc + 2;
            }

        },

        // Absolute
        0x8E: function() {
            this.cycles = 4;
            this.instruction = () => {
                let targetAddress = this.getAbsoluteAddress(this.pc + 1);
                this.debugger(3, `STX $${fh(targetAddress)} = ${fh(this.mem.get(targetAddress))}`);
                this.stx(targetAddress);
                this.pc = this.pc + 3;
            }
        }
    }
}