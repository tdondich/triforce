import { fh, unsignedByteToSignedByte } from "../helpers";

export default {
    methods: {
        dec: function(location) {
            let value = unsignedByteToSignedByte(this.mem.get(location));

            value = (value - 1) & 0xFF;

            this.setZero((value == 0x00));

            this.mem.set(location, value);

            // Now set negative
            this.p = (this.p & 0b01111111) | (value & 0b10000000);

        },
        // Zero Page
        0xC6: function() {
            let targetAddress = this.getZeroPageAddress(this.pc + 1);
            this.debugger(2, `DEC $${fh(targetAddress)} = ${fh(this.mem.get(targetAddress))}`);
            this.dec(targetAddress);
            this.pc = this.pc + 2;
        },
        // Absolute
        0xCE: function() {
            let targetAddress = this.getAbsoluteAddress(this.pc + 1);
            this.debugger(3, `DEC $${fh(targetAddress)} = ${fh(this.mem.get(targetAddress))}`);
            this.dec(targetAddress);
            this.pc = this.pc + 3;
        },
 
    }
}