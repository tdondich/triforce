import { fh, unsignedByteToSignedByte } from "../helpers";

export default {
    methods: {
        // SBC - Subtract with Carry 
        // Note: This was was nuts. See: http://users.telenet.be/kim1-6502/6502/proman.html#222
        sbc: function (location) {
            let value = this.mem.get(location);
            value = value ^ 0xFF;

            let result = this.a + value;
            if (this.isCarry) {
                result = result + 1;
            }
            this.setCarry((result > 0xFF));

            // Determine a 2's complement overflow
            // So let's get the signed values of both operands and add them
            let intVal = unsignedByteToSignedByte(this.a) + unsignedByteToSignedByte(value);
            this.setOverflow((intVal > 127 || intVal < -128));

            // Now set to accumulator, but be sure to mask
            this.a = result & 0xFF;

            // Evaluate to zero, only after the accumulator has been set
            this.setZero((this.a == 0x00));

            // Now set negative
            this.p = (this.p & 0b01111111) | (this.a & 0b10000000);
        },
        // Immediate
        0xE9: function() {
            this.debugger(2, `SBC #$${fh(this.mem.get(this.pc + 1))}`);
            this.sbc(this.pc + 1);
            this.pc = this.pc + 2;
        },
        // Zero Page
        0xE5: function () {
            this.debugger(2, `SBC $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
            this.sbc(this.getZeroPageAddress(this.pc + 1));
            this.pc = this.pc + 2;
        },
        // Indexed Indirect, X 
        0xE1: function() {
            let targetAddress = this.getIndexedIndirectXAddress(this.pc + 1);
            this.debugger(2, `SBC ($${fh(this.mem.get(this.pc + 1))},X) @ ${fh((this.mem.get(this.pc + 1) + this.x) & 0xFF)} = ${fh(targetAddress)} = ${fh(this.mem.get(targetAddress))}`);
            this.sbc(targetAddress);
            this.pc = this.pc + 2;
        }

    }
}