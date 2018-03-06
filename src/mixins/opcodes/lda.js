import { fh } from "../helpers";

export default {
    methods: {
        // LDA - Load Accumulator
        lda: function (location) {
            this.a = this.mem.get(location);
            // Now set the zero flag if A is 0
            if (this.a == 0x00) {
                this.p = this.p | 0b10;
            } else {
                this.p = this.p & 0b11111101;
            }
            // Now set negative
            this.p = (this.p & 0b01111111) | (this.a & 0b10000000);
        },
        // Immediate
        0xA9: function () {
            this.debugger(2, `LDA #$${fh(this.mem.get(this.pc + 1))}`);
            this.lda(this.pc + 1);
            this.pc = this.pc + 2;
        },
        // Absolute
        0xAD: function() {
            let targetAddress = this.getAbsoluteAddress(this.pc + 1);
            this.debugger(3, `LDA $${fh(targetAddress)} = ${fh(this.mem.get(targetAddress))}`);
            this.lda(targetAddress);
            this.pc = this.pc + 3;
        }
    }
}