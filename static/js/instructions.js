var instructions = {
        enabledDebugger(numberOfOperands, operation) {
            if(typeof operation != 'function') {
                return;
            }
            if(!this.debugEnabled) {
                return false;
            }
            this.inDebug = true;
            this.debugX = this.x;
            this.debugY = this.y;
            this.debugA = this.a;
            this.debugP = this.p;
            this.debugSP = this.sp;
            let debug = [fh(this.pc, 4)] + "  ";
            let data = [];
            for (let count = 0; count < numberOfOperands; count++) {
                data[data.length] = fh(this.mem.get(this.pc + count));
            }
            debug = (debug + data.join(" ")).padEnd(16, " ");
            debug = debug + (operation().padEnd(32, ' '));
            // Now add register info
            debug = debug + `A:${fh(this.a)} X:${fh(this.x)} Y:${fh(this.y)} P:${fh(this.p)} SP:${fh(this.sp)} CYC:${this.$parent.$refs.ppu.previousCycleCount().toString().padStart(3)} SL:${this.$parent.$refs.ppu.previousScanline().toString().padStart(3)}\n`;
            //this.debug = this.debug + debug;
            this.debug = debug;
            this.inDebug = false;
        },
        // Disabled debugger
        disabledDebugger() {},
        // These are now the opcodes we handle
        // JMP with absoute addressing
        0x4C: function () {
            this.cycles = 3;
            this.instruction = () => {
                let targetAddress = this.getAbsoluteAddress(this.pc + 1);
                this.debugger(3, () => `JMP $${fh(targetAddress, 4)}`);
                this.pc = targetAddress;
            }
        },
        // JMP with indirect 
        0x6C: function () {
            this.cycles = 5;
            this.instruction = () => {
                let sourceAddress = this.getAbsoluteAddress(this.pc + 1);
                let targetAddress = null;
                /**
                 * @bug The following emulates the early 6502 revision JMP bug found in the nes
                 */
                if(sourceAddress & 0xFF === 0xFF) {
                    // This is falling on a page boundry!
                    let lsb = this.mem.get(sourceAddress);
                    let msb = this.mem.get(sourceAddress & 0xFF00);
                    targetAddress = (msb << 8) + lsb;
                } else {
                    // Doesn't fall on a page boundry, so let's go ahead and get the address normally
                    targetAddress = this.getIndirectAddress(this.pc + 1);
                }
                this.debugger(3, () => `JMP ($${fh(this.getAbsoluteAddress(this.pc + 1), 4)}) = ${fh(targetAddress, 4)}`);
                this.pc = targetAddress;
            }
        },
        // JSR, note, the target return is the PC address + 2, not three.
        // See: http://obelisk.me.uk/6502/reference.html#JSR
        0x20: function () {
            this.cycles = 6;
            this.instruction = () => {
                this.debugger(3, () => `JSR $${fh(this.getAbsoluteAddress(this.pc + 1))}`);

                let target = this.pc + 2;
                // First pass the first half of target
                this.stackPush(target >> 8);
                // Now pass the second half
                this.stackPush(target & 0xFF);
                // Now, let's head to the address
                this.pc = this.getAbsoluteAddress(this.pc + 1);
            }
        },
        // RTS - Return to stack
        0x60: function () {
            this.cycles = 6;
            this.instruction = () => {
                this.debugger(1, () => `RTS`);
                // First pop the second half
                let second = this.stackPop();
                // Now the first part
                let first = this.stackPop();
                this.pc = ((first << 8) | second) + 1;
            }
        },
       // SEC Set carry 
        0x38: function () {
            this.cycles = 2;
            this.instruction = () => {
                this.debugger(1, () => 'SEC');
                this.p = this.p | 0b0001;
                this.pc = this.pc + 1;
            }
        },
        // BCS - branch if carry set
        0xb0: function () {
            this.cycles = 2;
            if (this.isCarry()) {
                this.cycles = 3;
                if(this.pageCrossed(this.pc, this.getRelativeAddress(this.pc + 1))) {
                    this.cycles = 4;
                }
            }
            this.instruction = () => {
                this.debugger(2, () => `BCS $${fh(this.getRelativeAddress(this.pc + 1) + 2)}`);
                if (this.isCarry()) {
                    this.pc = this.getRelativeAddress(this.pc + 1) + 2;
                } else {
                    this.pc = this.pc + 2;
                }
            }
        },
        // CLC - Clear carry flag
        0x18: function () {
            this.cycles = 2;
            this.instruction = () => {
                this.debugger(1, () => 'CLC');
                this.p = this.p & 0b11111110;
                this.pc = this.pc + 1;
            }
        },
        // BCC - Branch if carry clear
        0x90: function () {
            this.cycles = 2;
            if (!this.isCarry()) {
                this.cycles = 3;
                if(this.pageCrossed(this.pc, this.getRelativeAddress(this.pc + 1))) {
                    this.cycles = 4;
                }
            }
            this.instruction = () => {
                this.debugger(2, () => `BCC $${fh(this.getRelativeAddress(this.pc + 1) + 2)}`);
                if (!this.isCarry()) {
                    this.pc = this.getRelativeAddress(this.pc + 1) + 2;
                } else {
                    this.pc = this.pc + 2;
                }
            }
        },
        // BEQ - Branch if equal, checks zero flag, and if so relative branch
        0xF0: function () {
            this.cycles = 2;
            if (this.isZero()) {
                this.cycles = 3;
                // See: http://forums.nesdev.com/viewtopic.php?t=8243
                if(this.pageCrossed(this.pc+2, this.getRelativeAddress(this.pc + 1))) {
                    this.cycles = 4;
                }
            }
            this.instruction = () => {
                this.debugger(2, () => `BEQ $${fh(this.getRelativeAddress(this.pc + 1) + 2)}`);
                if (this.isZero()) {
                    this.pc = this.getRelativeAddress(this.pc + 1) + 2;
                } else {
                    this.pc = this.pc + 2;
                }
            }
        },
        // Branch if not equal, if zero flag is not set, relative branch
        0xD0: function () {
            this.cycles = 2;
            if (!this.isZero()) {
                this.cycles = 3;
                if(this.pageCrossed(this.pc, this.getRelativeAddress(this.pc + 1))) {
                    this.cycles = 4;
                }
            }
            this.instruction = () => {
                this.debugger(2, () => `BNE $${fh(this.getRelativeAddress(this.pc + 1) + 2)}`);
                if (!this.isZero()) {
                    this.pc = this.getRelativeAddress(this.pc + 1) + 2;
                } else {
                    this.pc = this.pc + 2;
                }
            }
        },
        // BVS - Branch if Overflow set
        0x70: function () {
            this.cycles = 2;
            if (this.isOverflow()) {
                this.cycles = 3;
                if(this.pageCrossed(this.pc, this.getRelativeAddress(this.pc + 1))) {
                    this.cycles = 4;
                }
            }
            this.instruction = () => {
                this.debugger(2, () => `BVS $${fh(this.getRelativeAddress(this.pc + 1) + 2)}`);
                if (this.isOverflow()) {
                    this.pc = this.getRelativeAddress(this.pc + 1) + 2;
                } else {
                    this.pc = this.pc + 2;
                }
            }
        },
        // BVC - Branch if Overflow clear
        0x50: function () {
            this.cycles = 2;
            if (!this.isOverflow()) {
                this.cycles = 3;
                if(this.pageCrossed(this.pc, this.getRelativeAddress(this.pc + 1))) {
                    this.cycles = 4;
                }
            }
            this.instruction = () => {
                this.debugger(2, () => `BVC $${fh(this.getRelativeAddress(this.pc + 1) + 2)}`);
                if (!this.isOverflow()) {
                    this.pc = this.getRelativeAddress(this.pc + 1) + 2;
                } else {
                    this.pc = this.pc + 2;
                }
            }
        },
        // BPL - Branch if positive
        0x10: function () {
            this.cycles = 2;
            if (!this.isNegative()) {
                this.cycles = 3;
                if(this.pageCrossed(this.pc, this.getRelativeAddress(this.pc + 1))) {
                    this.cycles = 4;
                }
            }
            this.instruction = () => {
                this.debugger(2, () => `BPL $${fh(this.getRelativeAddress(this.pc + 1) + 2)}`);
                if (!this.isNegative()) {
                    this.pc = this.getRelativeAddress(this.pc + 1) + 2;
                } else {
                    this.pc = this.pc + 2;
                }
            }
        },
        // SEI - Set Interrupt Flag
        0x78: function () {
            this.cycles = 2;
            this.instruction = () => {
                this.debugger(1, () => 'SEI');
                this.p = this.p | 0b0100;
                this.pc = this.pc + 1;
            }
        },
        // SED - Set Decimal Flag
        0xF8: function () {
            this.cycles = 2;
            this.instruction = () => {
                this.debugger(1, () => 'SED');
                this.p = this.p | 0b1000;
                this.pc = this.pc + 1;
            }
        },
        // PHP - Push P onto Stack
        // Note, bit 4 and 5 changes.
        // See: https://wiki.nesdev.com/w/index.php/Status_flags
        0x08: function () {
            this.cycles = 3;
            this.instruction = () => {
                this.debugger(1, () => 'PHP');
                // Always make sure that bit 5 and 4 is set
                this.stackPush(this.p | 0b00110000);
                this.pc = this.pc + 1;
            }
        },
        // PLA - Pop stack into Accumulator
        // Set Zero and Negative flag appropriately
        0x68: function () {
            this.cycles = 4;
            this.instruction = () => {
                this.debugger(1, () => 'PLA');
                this.a = this.stackPop();
                // Now set the zero flag if A is 0
                if (this.a === 0x00) {
                    this.p = this.p | 0b10;
                } else {
                    this.p = this.p & 0b11111101;
                }
                // Now set negative
                this.p = (this.p & 0b01111111) | (this.a & 0b10000000);
                this.pc = this.pc + 1;
            }
        },
        // CLD Clear decimal mode
        0xD8: function () {
            this.cycles = 2;
            this.instruction = () => {
                this.debugger(1, () => 'CLD');
                this.p = this.p & 0b11110111;
                this.pc = this.pc + 1;
            }
        },
        // PHA - Push to stack the accumulator value
        0x48: function () {
            this.cycles = 3;
            this.instruction = () => {
                this.debugger(1, () => 'PHA');
                this.stackPush(this.a);
                this.pc = this.pc + 1;
            }
        },
        // PLP - Pop from stack and store in flags
        0x28: function () {
            this.cycles = 4;
            this.instruction = () => {
                this.debugger(1, () => 'PLP');
                // Be sure to ignore bits 4 and always set 5 
                this.p = (this.stackPop() & 0b11101111) | 0b00100000;
                this.pc = this.pc + 1;
            }
        },
        // BMI - Branch if minus flag is set with relative address
        0x30: function () {
            this.cycles = 2;
            if (this.isNegative()) {
                this.cycles = 3;
                if(this.pageCrossed(this.pc, this.getRelativeAddress(this.pc + 1))) {
                    this.cycles = 4;
                }
            }
            this.instruction = () => {
                this.debugger(2, () => `BMI $${fh(this.getRelativeAddress(this.pc + 1) + 2)}`);
                if (this.isNegative()) {
                    this.pc = this.getRelativeAddress(this.pc + 1) + 2;
                } else {
                    this.pc = this.pc + 2;
                }
            }
        },
        // CLV - Clear Overflow flag
        0xb8: function () {
            this.cycles = 2;
            this.instruction = () => {
                this.debugger(1, () => 'CLV');
                this.p = this.p & 0b10111111;
                this.pc = this.pc + 1;
            }
        },
        // INY - Increment Y Register
        0xC8: function () {
            this.cycles = 2;
            this.instruction = () => {
                this.debugger(1, () => 'INY');

                // Increment, but mask to a 8 bit value
                this.y = (this.y + 1) & 0xFF;

                this.setZero((this.y === 0x00));

                // Set Negative
                this.p = (this.p & 0b01111111) | (this.y & 0b10000000);
                this.pc = this.pc + 1;
            }
        },
        // INX - Increment X Register
        0xE8: function () {
            this.cycles = 2;
            this.instruction = () => {
                this.debugger(1, () => 'INX');

                // Increment, but mask to a 8 bit value
                this.x = (this.x + 1) & 0xFF;

                this.setZero((this.x === 0));

                // Set Negative
                this.p = (this.p & 0b01111111) | (this.x & 0b10000000);
                this.pc = this.pc + 1;
            }
        },
        // DEX - Decrement one from X register
        0xCA: function () {
            this.cycles = 2;
            this.instruction = () => {
                this.debugger(1, () => 'DEX');

                // Increment, but mask to a 8 bit value
                this.x = (this.x - 1) & 0xFF;

                this.setZero((this.x === 0));

                // Set Negative
                this.p = (this.p & 0b01111111) | (this.x & 0b10000000);
                this.pc = this.pc + 1;
            }
        },
        // DEY - Decrement one from Y register
        0x88: function () {
            this.cycles = 2;
            this.instruction = () => {
                this.debugger(1, () => 'DEY');

                // Increment, but mask to a 8 bit value
                this.y = (this.y - 1) & 0xFF;

                this.setZero((this.y === 0x00));

                // Set Negative
                this.p = (this.p & 0b01111111) | (this.y & 0b10000000);
                this.pc = this.pc + 1;
            }
        },
        // TAY - Transfer Accumulator to Y
        0xA8: function () {
            this.cycles = 2;
            this.instruction = () => {
                this.debugger(1, () => 'TAY');

                this.y = this.a;

                this.setZero((this.y === 0x00));

                // Set Negative
                this.p = (this.p & 0b01111111) | (this.y & 0b10000000);
                this.pc = this.pc + 1;
            }
        },
        // TAX - Transfer Accumulator to X
        0xAA: function () {
            this.cycles = 2;
            this.instruction = () => {
                this.debugger(1, () => 'TAX');

                this.x = this.a;

                this.setZero((this.x === 0x00));

                // Set Negative
                this.p = (this.p & 0b01111111) | (this.x & 0b10000000);
                this.pc = this.pc + 1;
            }
        },
        // TYA - Transfer Y to Accumulator
        0x98: function () {
            this.cycles = 2;
            this.instruction = () => {
                this.debugger(1, () => 'TYA');

                this.a = this.y;

                this.setZero((this.a === 0x00));

                // Set Negative
                this.p = (this.p & 0b01111111) | (this.a & 0b10000000);
                this.pc = this.pc + 1;
            }
        },
        // TXA - Transfer X to Accumulator
        0x8A: function () {
            this.cycles = 2;
            this.instruction = () => {
                this.debugger(1, () => 'TXA');

                this.a = this.x;

                this.setZero((this.a === 0x00));

                // Set Negative
                this.p = (this.p & 0b01111111) | (this.a & 0b10000000);
                this.pc = this.pc + 1;
            }
        },
        // TSX - Transfer Stack Pointer to X
        0xBA: function () {
            this.cycles = 2;
            this.instruction = () => {
                this.debugger(1, () => 'TSX');

                this.x = this.sp;

                this.setZero((this.x === 0x00));

                // Set Negative
                this.p = (this.p & 0b01111111) | (this.x & 0b10000000);
                this.pc = this.pc + 1;
            }
        },
        // TXS - Transfer X to Stack Pointer
        0x9A: function () {
            this.cycles = 2;
            this.instruction = () => {
                this.debugger(1, () => 'TXS');

                this.sp = this.x;

                this.pc = this.pc + 1;
            }
        },
        // RTI - Return from Interrupt
        0x40: function () {
            this.cycles = 6;
            this.instruction = () => {
                this.debugger(1, () => 'RTI');

                // Be sure to ignore bits 4 and 5
                this.p = (this.stackPop() & 0b11101111) | 0b00100000;


                // First pop the second half
                let second = this.stackPop();
                // Now the first part
                let first = this.stackPop();
                this.pc = ((first << 8) | second);
            }

        }
}