import { fh } from "../helpers";

export default {
    methods: {
        // CPX - Compare X with Immediate
        cpx: function (location) {
            let value = this.mem.get(location);
            let result = this.x - value;

            // Set the carry flag
            this.setCarry((this.x >= value));

            // Set zero
            this.setZero((result == 0x00));

            // Set Negative
            // @todo: Check if this is calculated correct. It says if bit 7 is set.
            this.p = (this.p & 0b01111111) | (result & 0b10000000);
        },
        // Immediate
        0xE0: function() {
            this.debugger(2, `CPX #$${fh(this.mem.get(this.pc + 1))}`);
            this.cpx(this.pc + 1);
            this.pc = this.pc + 2;
        },
        // Zero Page
        0xE4: function() {
            this.debugger(2, `CPX $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
            this.cpx(this.getZeroPageAddress(this.pc + 1));
            this.pc = this.pc + 2;
        }
    }
}
