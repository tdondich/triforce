import { fh } from "../helpers";

export default {
    methods: {
        // STA - Store Accumulator
        sta: function (location) {
            this.mem.set(location, this.a);
        },
        // Zero Page Addressing
        0x85: function () {
            let targetAddress = this.getZeroPageAddress(this.pc + 1);
            this.debugger(2, `STA $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(targetAddress))}`);
            this.sta(targetAddress);
            this.pc = this.pc + 2;
        },
        // Absolute
        0x8D: function() {
            let targetAddress = this.getAbsoluteAddress(this.pc + 1);
            this.debugger(3, `STA $${fh(targetAddress)} = ${fh(this.mem.get(targetAddress))}`);
            this.sta(targetAddress);
            this.pc = this.pc + 3;
        },
        // Indexed Indirect, X
        0x81: function() {
            let targetAddress = this.getIndexedIndirectXAddress(this.pc + 1);
            this.debugger(2, `STA ($${fh(this.mem.get(this.pc + 1))},X) @ ${fh((this.mem.get(this.pc + 1) + this.x) & 0xFF)} = ${fh(targetAddress)} = ${fh(this.mem.get(targetAddress))}`);
            this.sta(targetAddress);
            this.pc = this.pc + 2;
        }
    }
}