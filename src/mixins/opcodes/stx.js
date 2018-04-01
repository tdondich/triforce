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
                this.debugger(2, () => `STX $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
                this.stx(this.getZeroPageAddress(this.pc + 1));
                this.pc = this.pc + 2;
            }

        },
        // Zero Page, Y
        0x96: function () {
            this.cycles = 4;
            this.instruction = () => {
                let targetAddress = this.getZeroPageYAddress(this.pc + 1);
                this.debugger(2, () => `STX $${fh(this.mem.get(this.pc + 1))},Y @ ${fh(targetAddress, 2)} = ${fh(this.mem.get(targetAddress))}`);
                this.stx(targetAddress);
                this.pc = this.pc + 2;
            }
        },
 
 
        // Absolute
        0x8E: function() {
            this.cycles = 4;
            this.instruction = () => {
                let targetAddress = this.getAbsoluteAddress(this.pc + 1);
                this.debugger(3, () => `STX $${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.stx(targetAddress);
                this.pc = this.pc + 3;
            }
        }
    }
}