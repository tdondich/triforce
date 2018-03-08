import { fh } from "../helpers";

export default {
    methods: {
        inc: function(location) {
            let value = this.mem.get(location);
            value = (value + 1) & 0xFF;

            this.setZero((value == 0x00));

            this.mem.set(location, value);

            // Now set negative
            this.p = (this.p & 0b01111111) | (value & 0b10000000);

        },
        // Zero Page
        0xE6: function() {
            let targetAddress = this.getZeroPageAddress(this.pc + 1);
            this.debugger(2, `INC $${fh(targetAddress)} = ${fh(this.mem.get(targetAddress))}`);
            this.inc(targetAddress);
            this.pc = this.pc + 2;
        },
        // Absolute
        0xEE: function() {
            let targetAddress = this.getAbsoluteAddress(this.pc + 1);
            this.debugger(3, `INC $${fh(targetAddress)} = ${fh(this.mem.get(targetAddress))}`);
            this.inc(targetAddress);
            this.pc = this.pc + 3;
        },
 
    }
}