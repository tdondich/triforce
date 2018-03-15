import { fh } from "../helpers";

export default {
    methods: {
        // LDX with Immediate Addressing
        ldx: function (location) {
            this.x = this.mem.get(location);
            // Now set the zero flag if X is 0
            if (this.x == 0x00) {
                this.p = this.p | 0b10;
            } else {
                this.p = this.p & 0b11111101;
            }
            // Now set negative
            this.p = (this.p & 0b01111111) | (this.x & 0b10000000);
        },
        // Immediate
        0xA2: function() {
            this.cycles = 2;
            this.instruction = () => {
                this.debugger(2, `LDX #$${fh(this.mem.get(this.pc + 1))}`);
                this.ldx(this.pc + 1);
                this.pc = this.pc + 2;
            }
        },
        // Zero Page
        0xA6: function () {
            this.cycles = 3;
            this.instruction = () => {
                this.debugger(2, `LDX $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
                this.ldx(this.getZeroPageAddress(this.pc + 1));
                this.pc = this.pc + 2;
            }
        },
        // Absolute
        0xAE: function() {
            this.cycles = 4;
            this.instruction = () => {
                let targetAddress = this.getAbsoluteAddress(this.pc + 1);
                this.debugger(3, `LDX $${fh(targetAddress, 4)} = ${fh(this.mem.get(this.getAbsoluteAddress(this.pc + 1)))}`);
                this.ldx(targetAddress);
                this.pc = this.pc + 3;
            }
        }
    }
}