import {fh, unsignedByteToSignedByte} from '../util'

export default {
    methods: {
        // ADC - Add Memory to accumulator with carry bit
        adc: function (location) {
            // Add memory to accumulator to represent carry bit
            let value = this.mem.get(location);
            let result = this.a + value;
            if (this.isCarry()) {
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
            this.setZero((this.a === 0x00));

            // Now set negative
            this.p = (this.p & 0b01111111) | (this.a & 0b10000000);
        },
        // Immediate
        0x69: function() {
            this.cycles = 2;
            this.instruction = () => {
                if(this.inDebug) this.debugger(2, () => `ADC #$${fh(this.mem.get(this.pc + 1))}`);
                this.adc(this.pc + 1);
                this.pc = this.pc + 2;
            }
       },
        // Zero Page
        0x65: function() {
            this.cycles = 3;
            this.instruction = () => {
                if(this.inDebug) this.debugger(2, () => `ADC $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
                this.adc(this.getZeroPageAddress(this.pc + 1));
                this.pc = this.pc + 2;
            }
       },
        // Zero Page, X
        0x75: function () {
            this.cycles = 4;
            this.instruction = () => {
                let targetAddress = this.getZeroPageXAddress(this.pc + 1);
                if(this.inDebug) this.debugger(2, () => `ADC $${fh(this.mem.get(this.pc + 1))},X @ ${fh(targetAddress, 2)} = ${fh(this.mem.get(targetAddress))}`);
                this.adc(targetAddress);
                this.pc = this.pc + 2;
            }
        },
 
        // Absolute
        0x6D: function() {
            this.cycles = 4;
            this.instruction = () => {
                let targetAddress = this.getAbsoluteAddress(this.pc + 1);
                if(this.inDebug) this.debugger(3, () => `ADC $${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.adc(targetAddress);
                this.pc = this.pc + 3;
            }
        },
        // Absolute, Y
        0x79: function() {
            this.cycles = 4;
            let targetAddress = this.getAbsoluteYAddress(this.pc + 1);
            let first = this.getAbsoluteAddress(this.pc + 1);
            if(this.pageCrossed(first, targetAddress)) {
                this.cycles = 5;
            }
            this.instruction = () => {
                let targetAddress = this.getAbsoluteYAddress(this.pc + 1);
                if(this.inDebug) this.debugger(3, () => `ADC $${fh(this.getAbsoluteAddress(this.pc + 1), 4)},Y @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.adc(targetAddress);
                this.pc = this.pc + 3;
            }
        },
        // Absolute, X
        0x7D: function () {
            this.cycles = 4;
            let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
            let first = this.getAbsoluteAddress(this.pc + 1);
            if(this.pageCrossed(first, targetAddress)) {
                this.cycles = 5;
            }
            this.instruction = () => {
                let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
                if(this.inDebug) this.debugger(3, () => `ADC $${fh(this.getAbsoluteAddress(this.pc + 1), 4)},X @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.adc(targetAddress);
                this.pc = this.pc + 3;
            }
        },
 
        // Indexed Indirect, X
        0x61: function() {
            this.cycles = 6;
            this.instruction = () => {
                let targetAddress = this.getIndexedIndirectXAddress(this.pc + 1);
                if(this.inDebug) this.debugger(2, () => `ADC ($${fh(this.mem.get(this.pc + 1))},X) @ ${fh((this.mem.get(this.pc + 1) + this.x) & 0xFF)} = ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.adc(targetAddress);
                this.pc = this.pc + 2;
            }
        },
        // Indirect Indexed, Y
        0x71: function () {
            this.cycles = 5;
            let targetAddress = this.getIndirectIndexedAddress(this.pc + 1);
            let first = this.getAbsoluteAddress(this.mem.get(this.pc + 1), true)
            if(this.pageCrossed(first, targetAddress)) {
                this.cycles = 6;
            }
            this.instruction = () => {
               let targetAddress = this.getIndirectIndexedAddress(this.pc + 1);
                if(this.inDebug) this.debugger(2, () => `ADC ($${fh(this.mem.get(this.pc + 1))}),Y = ${fh(this.getAbsoluteAddress(this.mem.get(this.pc + 1), true),4)} @ ${fh(targetAddress,4)} = ${fh(this.mem.get(targetAddress))}`);
                this.adc(targetAddress);
                this.pc = this.pc + 2;
            }
        },
 
    }
}