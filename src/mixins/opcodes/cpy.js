import { fh } from "../helpers";

export default {
    methods: {
        // CPY - Compare Y
        cpy: function (location) {
            let value = this.mem.get(location);
            let result = this.y - value;

            // Set the carry flag
            this.setCarry((this.y >= value));

            // Set zero
            this.setZero((result == 0x00));

            // Set Negative
            // @todo: Check if this is calculated correct. It says if bit 7 is set.
            this.p = (this.p & 0b01111111) | (result & 0b10000000);
        },
        // Immediate
        0xC0: function() {
            this.cycles = 2;
            this.instruction = () => {
                this.debugger(2, `CPY #$${fh(this.mem.get(this.pc + 1))}`);
                this.cpy(this.pc + 1);
                this.pc = this.pc + 2;
            }
        },
        // Zero Page
        0xC4: function() {
            this.cycles = 3;
            this.instruction = () => {
                this.debugger(2, `CPY $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
                this.cpy(this.getZeroPageAddress(this.pc + 1));
                this.pc = this.pc + 2;
            }
        },
        // Absolute
        0xCC: function() {
            this.cycles = 4;
            this.instruction = () => {
                let targetAddress = this.getAbsoluteAddress(this.pc + 1);
                this.debugger(3, `CPY $${fh(targetAddress)} = ${fh(this.mem.get(targetAddress))}`);
                this.cpy(targetAddress);
                this.pc = this.pc + 3;
            }
        },
 
    }
}
