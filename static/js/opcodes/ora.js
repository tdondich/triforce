var ora = {
    methods: {
        // ORA - Logical OR operation on accumulator against memory contents - immediate addressing
        ora: function (location) {
            this.a = this.a | this.mem.get(location);
            // Set zero
            if (this.a === 0x00) {
                this.p = this.p | 0b10;
            } else {
                this.p = this.p & 0b11111101;
            }
            // Set Negative
            // @todo: Check if this is calculated correct. It says if bit 7 is set.
            this.p = (this.p & 0b01111111) | (this.a & 0b10000000);
        },
        // Immediate
        0x09: function () {
            this.cycles = 2;
            this.instruction = () => {
                if(this.inDebug) this.debugger(2, () => `ORA #$${fh(this.mem.get(this.pc + 1))}`);
                this.ora(this.pc + 1);
                this.pc = this.pc + 2;
            }
        },
        // Zero Page
        0x05: function () {
            this.cycles = 3;
            this.instruction = () => {
                if(this.inDebug) this.debugger(2, () => `ORA $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
                this.ora(this.getZeroPageAddress(this.pc + 1));
                this.pc = this.pc + 2;
            }
        },
        // Zero Page, X
        0x15: function () {
            this.cycles = 4;
            this.instruction = () => {
                let targetAddress = this.getZeroPageXAddress(this.pc + 1);
                if(this.inDebug) this.debugger(2, () => `ORA $${fh(this.mem.get(this.pc + 1))},X @ ${fh(targetAddress, 2)} = ${fh(this.mem.get(targetAddress))}`);
                this.ora(targetAddress);
                this.pc = this.pc + 2;
            }
        },
 
        // Indirect X
        0x01: function() {
            this.cycles = 6;
            this.instruction = () => {
                let targetAddress = this.getIndexedIndirectXAddress(this.pc + 1);
                if(this.inDebug) this.debugger(2, () => `ORA ($${fh(this.mem.get(this.pc + 1))},X) @ ${fh((this.mem.get(this.pc + 1) + this.x) & 0xFF)} = ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.ora(targetAddress);
                this.pc = this.pc + 2;
            }
        },
        // Indirect Indexed, Y
        0x11: function () {
            this.cycles = 5;
            let targetAddress = this.getIndirectIndexedAddress(this.pc + 1);
            let first = this.getAbsoluteAddress(this.mem.get(this.pc + 1), true)
            if(this.pageCrossed(first, targetAddress)) {
                this.cycles = 6;
            }
            this.instruction = () => {
               let targetAddress = this.getIndirectIndexedAddress(this.pc + 1);
               if(this.inDebug) this.debugger(2, () => `ORA ($${fh(this.mem.get(this.pc + 1))}),Y = ${fh(this.getAbsoluteAddress(this.mem.get(this.pc + 1), true),4)} @ ${fh(targetAddress,4)} = ${fh(this.mem.get(targetAddress))}`);
                this.ora(targetAddress);
                this.pc = this.pc + 2;
            }
        },
 
        // Absolute
        0x0D: function() {
            this.cycles = 4;
            this.instruction = () => {
                let targetAddress = this.getAbsoluteAddress(this.pc + 1);
                if(this.inDebug) this.debugger(3, () => `ORA $${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.ora(targetAddress);
                this.pc = this.pc + 3;
            }
        },

        // Absolute, Y
        0x19: function() {
            this.cycles = 4;
            let targetAddress = this.getAbsoluteYAddress(this.pc + 1);
            let first = this.getAbsoluteAddress(this.pc + 1);
            if(this.pageCrossed(first, targetAddress)) {
                this.cycles = 5;
            }
            this.instruction = () => {
                let targetAddress = this.getAbsoluteYAddress(this.pc + 1);
                if(this.inDebug) this.debugger(3, () => `ORA $${fh(this.getAbsoluteAddress(this.pc + 1), 4)},Y @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.ora(targetAddress);
                this.pc = this.pc + 3;
            }
        },
        // Absolute, X
        0x1D: function() {
            this.cycles = 4;
            let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
            let first = this.getAbsoluteAddress(this.pc + 1);
            if(this.pageCrossed(first, targetAddress)) {
                this.cycles = 5;
            }
            this.instruction = () => {
                let targetAddress = this.getAbsoluteXAddress(this.pc + 1);
                if(this.inDebug) this.debugger(3, () => `ORA $${fh(this.getAbsoluteAddress(this.pc + 1), 4)},X @ ${fh(targetAddress, 4)} = ${fh(this.mem.get(targetAddress))}`);
                this.ora(targetAddress);
                this.pc = this.pc + 3;
            }
        },
 
 
 
    }
}