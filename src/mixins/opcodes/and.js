import { fh } from "../helpers";

export default {
    methods: {
        // AND - Logical AND with accumulator
        and: function (location) {
            this.a = this.a & this.mem.get(location);
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
        0x29: function() {
            this.debugger(2, `AND #$${fh(this.mem.get(this.pc + 1))}`);
            this.and(this.pc + 1);
            this.pc = this.pc + 2;
        },
        // Indexed Indirect, X
        0x21: function() {
            let targetAddress = this.getIndexedIndirectXAddress(this.pc + 1);
            this.debugger(2, `AND ($${fh(this.mem.get(this.pc + 1))},X) @ ${fh((this.mem.get(this.pc + 1) + this.x) & 0xFF)} = ${fh(targetAddress)} = ${fh(this.mem.get(targetAddress))}`);
            this.and(targetAddress);
            this.pc = this.pc + 2;
        }
    }
}
 