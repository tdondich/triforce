import { fh, unsignedByteToSignedByte } from "../helpers";

export default {
    methods: {
        // ADC - Add Memory to accumulator with carry bit
        adc: function (location) {
            // Add memory to accumulator to represent carry bit
            let value = this.mem.get(location);
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
        0x69: function() {
            this.debugger(2, `ADC #$${fh(this.mem.get(this.pc + 1))}`);
            this.adc(this.pc + 1);
            this.pc = this.pc + 2;
        },
        // Zero Page
        0x65: function () {
            this.debugger(2, `ADC $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
            this.adc(this.getZeroPageAddress(this.pc + 1));
            this.pc = this.pc + 2;
        },
        // Absolute
        0x6D: function() {
            let targetAddress = this.getAbsoluteAddress(this.pc + 1);
            this.debugger(3, `ADC $${fh(targetAddress)} = ${fh(this.mem.get(targetAddress))}`);
            this.adc(targetAddress);
            this.pc = this.pc + 3;
        },
        // Indexed Indirect, X
        0x61: function() {
            let targetAddress = this.getIndexedIndirectXAddress(this.pc + 1);
            this.debugger(2, `ADC ($${fh(this.mem.get(this.pc + 1))},X) @ ${fh((this.mem.get(this.pc + 1) + this.x) & 0xFF)} = ${fh(targetAddress)} = ${fh(this.mem.get(targetAddress))}`);
            this.adc(targetAddress);
            this.pc = this.pc + 2;
        }
    }
}