import { fh } from "../helpers";

export default {
    methods: {
        // LDY - Load Y Register
        ldy: function (location) {
            // Load value directly into y register
            this.y = this.mem.get(location);
            // Now set the zero flag if Y is 0
            this.setZero((this.y == 0x00));
            // Now set negative
            this.p = (this.p & 0b01111111) | (this.y & 0b10000000);
        },
        // Immediate
        0xA0: function() {
            this.cycles = 2;
            this.instruction = () => {
                this.debugger(2, `LDY #$${fh(this.mem.get(this.pc + 1))}`);
                this.ldy(this.pc + 1);
                this.pc = this.pc + 2;
            }
        },
        // Absolute
        0xAC: function() {
            this.cycles = 4;
            this.instruction = () => {
                let targetAddress = this.getAbsoluteAddress(this.pc + 1);
                this.debugger(3, `LDY $${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.ldy(targetAddress);
                this.pc = this.pc + 3;
            }
        },
        // Zero Page
        0xA4: function () {
            this.cycles = 3;
            this.instruction = () => {
                let targetAddress = this.getZeroPageAddress(this.pc + 1);
                this.debugger(2, `LDY $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(targetAddress))}`);
                this.ldy(targetAddress);
                this.pc = this.pc + 2;
            }
        }
    }
}
 