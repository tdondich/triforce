import { fh } from "../helpers";

export default {
    methods: {
        // STA - Store Accumulator
        sta: function (location) {
            this.mem.set(location, this.a);
        },
        // Zero Page Addressing
        0x85: function () {
            this.cycles = 3;
            this.instruction = () => {
                let targetAddress = this.getZeroPageAddress(this.pc + 1);
                this.debugger(2, `STA $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(targetAddress))}`);
                this.sta(targetAddress);
                this.pc = this.pc + 2;
            }
        },
        // Zero Page, X
        0x95: function () {
            this.cycles = 4;
            this.instruction = () => {
                let targetAddress = this.getZeroPageXAddress(this.pc + 1);
                this.debugger(2, `STA $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(targetAddress))}`);
                this.sta(targetAddress);
                this.pc = this.pc + 2;
            }
        },
        // Absolute
        0x8D: function() {
            this.cycles = 4;
            this.instruction = () => {
                let targetAddress = this.getAbsoluteAddress(this.pc + 1);
                this.debugger(3, `STA $${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.sta(targetAddress);
                this.pc = this.pc + 3;
            }
        },
        // Absolute, X
        0x9D: function() {
            this.cycles = 5;
            this.instruction = () => {
                let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
                this.debugger(3, `STA $${fh(targetAddress)} = ${fh(this.mem.get(targetAddress))}`);
                this.sta(targetAddress);
                this.pc = this.pc + 3;
            }
        },
        // Absolute, Y
        0x99: function() {
            this.cycles = 5;
            this.instruction = () => {
                let targetAddress = this.getAbsoluteYAddress(this.pc + 1);
                this.debugger(3, `STA $${fh(this.getAbsoluteAddress(this.pc + 1), 4)},Y @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.sta(targetAddress);
                this.pc = this.pc + 3;
            }
        },
        // Indexed Indirect, X
        0x81: function() {
            this.cycles = 6;
            this.instruction = () => {
                let targetAddress = this.getIndexedIndirectXAddress(this.pc + 1);
                this.debugger(2, `STA ($${fh(this.mem.get(this.pc + 1))},X) @ ${fh((this.mem.get(this.pc + 1) + this.x) & 0xFF)} = ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.sta(targetAddress);
                this.pc = this.pc + 2;
            }
        },
       // Indirect Indexed, Y
        0x91: function () {
            this.cycles = 5;
            let targetAddress = this.getIndirectIndexedAddress(this.pc + 1);
            if(this.pageCrossed(this.pc + 1), targetAddress) {
                this.cycles = 6;
            }
            this.instruction = () => {
               let targetAddress = this.getIndirectIndexedAddress(this.pc + 1);
                this.debugger(2, `STA ($${fh(this.mem.get(this.pc + 1))}),Y = ${fh(this.getAbsoluteAddress(this.mem.get(this.pc + 1), true),4)} @ ${fh(targetAddress,4)} = ${fh(this.mem.get(targetAddress))}`);
                this.sta(targetAddress);
                this.pc = this.pc + 2;
            }
        },
 
    }
}