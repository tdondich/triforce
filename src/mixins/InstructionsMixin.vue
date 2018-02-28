<template>
 <div></div> 
</template>

<script>

// Format a value as visual hex
function fh(value) {
    return value.toString(16).padStart(2, '0').toUpperCase();
}

export default {
  methods: {
    debugger(numberOfOperands, operation) {
        let debug = [fh(this.pc)] + "  ";
        let data = [];
        for(let count = 0; count < numberOfOperands; count++) {
            data[data.length] = fh(this.mem.get(this.pc + count));
        }
        debug = (debug + data.join(" ")).padEnd(16, " ");
        debug = debug + (operation.padEnd(32, ' '));
        // Now add register info
        debug = debug + `A:${fh(this.a)} X:${fh(this.x)} Y:${fh(this.y)} P:${fh(this.p)} SP:${fh(this.sp)}`;
        this.debug = this.debug + debug + "\n";
        console.log(debug);
    },
    // These are now the opcodes we handle
    // JMP with absoute addressing
    0x4c: function() {
        let targetAddress = this.getAbsoluteAddress(this.pc + 1);
        this.debugger(3, `JMP $${fh(targetAddress)}`);
        this.pc = targetAddress;
    },
    // JMP with indirect addressing
    0x6c: function() {
        this.pc = this.getIndirectAddress(this.pc + 1);
    },
    // LDX with Immediate Addressing
    0xA2: function() {
        this.debugger(2, `LDX #$${fh(this.mem.get(this.pc +1))}`);
        this.x = this.mem.get(this.pc + 1);
        // Now set the zero flag if X is 0
        if(this.x == 0x00) {
            this.p = this.p | 0b10;
        } else {
            this.p = this.p & 0b11111101;
        }
        // Now set negative
        this.p = (this.p & 0b01111111) | (this.x & 0b10000000);
        this.pc = this.pc + 2;
    },
    // LDX with Zero Page
    0xA6: function() {
        this.x = this.mem.get(this.mem.getAddressValue(this.pc + 1 >>> 4));
        this.pc = this.pc + 2;
    },
    // STX with Zero Page
    0x86: function() {
        this.debugger(2, `STX $${fh(this.mem.get(this.pc + 1))} = ${fh(this.x)}`);
        this.mem.set(this.getZeroPageAddress(this.pc + 1), this.x);
        this.pc  = this.pc + 2;
    },
    // JSR, note, the target return is the PC address + 2, not three.
    // See: http://obelisk.me.uk/6502/reference.html#JSR
    0x20: function() {
        this.debugger(3, `JSR $${fh(this.getAbsoluteAddress(this.pc + 1))}`);

        let target = this.pc + 2;
        // First pass the first half of target
        this.stackPush(target >> 8);
        // Now pass the second half
        this.stackPush(target & 0xFF);
        // Now, let's head to the address
        this.pc = this.getAbsoluteAddress(this.pc + 1);
    },
    // RTS - Return to stack
    0x60: function() {
        this.debugger(1, `RTS`);
        // First pop the second half
        let second = this.stackPop();
        // Now the first part
        let first = this.stackPop();
        this.pc = ((first << 8) | second) + 1;
    },

    // NOP, no operation, just increment the pc
    0xEA: function() {
        this.debugger(1, 'NOP');
        this.pc = this.pc + 1;
    },
    // SEC Set carry 
    0x38: function() {
        this.debugger(1, 'SEC');
        this.p = this.p | 0b0001;
        this.pc = this.pc + 1;
    },
    // BCS - branch if carry set
    0xb0: function() {
        this.debugger(2, `BCS $${fh(this.getRelativeAddress(this.pc + 1) + 2)}`);
        if(this.isCarry) {
            this.pc = this.getRelativeAddress(this.pc + 1) + 2;
        } else {
            this.pc = this.pc + 2;
        }
    },
    // CLC - Clear carry flag
    0x18: function() {
        this.debugger(1, 'CLC');
        this.p = this.p & 0b11111110;
        this.pc = this.pc + 1;
    },
    // BCC - Branch if carry clear
    0x90: function() {
        this.debugger(2, `BCC $${fh(this.getRelativeAddress(this.pc + 1) + 2)}`);
        if(!this.isCarry) {
            this.pc = this.getRelativeAddress(this.pc + 1) + 2;
        } else {
            this.pc = this.pc + 2;
        }
    },
    // Load Accumulator with direct value
    0xA9: function() {
        this.debugger(2, `LDA #$${fh(this.mem.get(this.pc + 1))}`);
        this.a = this.mem.get(this.pc + 1);
        // Now set the zero flag if A is 0
        if(this.a == 0x00) {
            this.p = this.p | 0b10;
        } else {
            this.p = this.p & 0b11111101;
        }
        // Now set negative
        this.p = (this.p & 0b01111111) | (this.a & 0b10000000);
        this.pc = this.pc + 2;
    },
    // BEQ - Branch if equal, checks zero flag, and if so relative branch
    0xF0: function() {
        this.debugger(2, `BEQ $${fh(this.getRelativeAddress(this.pc + 1) + 2)}`);
        if(this.isZero) {
            this.pc = this.getRelativeAddress(this.pc + 1) + 2;
        } else {
            this.pc = this.pc + 2;
        }
    },
    // Branch if not equal, if zero flag is not set, relative branch
    0xD0: function() {
        this.debugger(2, `BNE $${fh(this.getRelativeAddress(this.pc + 1) + 2)}`);
        if(!this.isZero) {
            this.pc = this.getRelativeAddress(this.pc + 1) + 2;
        } else {
            this.pc = this.pc + 2;
        }
    },
    // STA - Zero Page Addressing
    0x85: function() {
        this.debugger(2, `STA $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
        this.mem.set(this.getZeroPageAddress(this.pc + 1), this.a);
        this.pc = this.pc + 2;
    },
    // BIT - Bit Test with zero page addressing
    // This instructions is used to test if one or more bits are set in a target memory location. 
    // The mask pattern in A is ANDed with the value in memory to set or clear the zero flag, but 
    // the result is not kept. Bits 7 and 6 of the value from memory are copied into the N and V flags.
    0x24: function() {
        this.debugger(2, `BIT $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
        let value = this.mem.get(this.getZeroPageAddress(this.pc + 1));
        // First, let's AND with the accumulator
        if((this.a & value) == 0x00) {
            this.p = this.p | 0b0010;
        } else {
            this.p = this.p & 0b11111101;
        }
        // Now, let's copy to the N flag
        this.p = (this.p & 0b01111111) | (value & 0b10000000);
        // Now the V flag
        this.p = (this.p & 0b10111111) | (value & 0b01000000);
        this.pc = this.pc + 2;
    },
    // BVS - Branch if Overflow set
    0x70: function() {
        this.debugger(2, `BVS $${fh(this.getRelativeAddress(this.pc + 1) + 2)}`);
        if(this.isOverflow) {
            this.pc = this.getRelativeAddress(this.pc + 1) + 2;
        } else {
            this.pc = this.pc + 2;
        }
    },
    // BVC - Branch if Overflow clear
    0x50: function() {
        this.debugger(2, `BVC $${fh(this.getRelativeAddress(this.pc + 1) + 2)}`);
        if(!this.isOverflow) {
            this.pc = this.getRelativeAddress(this.pc + 1) + 2;
        } else {
            this.pc = this.pc + 2;
        }
    },
    // BPL - Branch if positive
    0x10: function() {
        this.debugger(2, `BPL $${fh(this.getRelativeAddress(this.pc + 1) + 2)}`);
        if(!this.isNegative) {
            this.pc = this.getRelativeAddress(this.pc + 1) + 2;
        } else {
            this.pc = this.pc + 2;
        }
    },
    // SEI - Set Interrupt Flag
    0x78: function() {
        this.debugger(1, 'SEI');
        this.p = this.p | 0b0100;
        this.pc = this.pc + 1;
    },
    // SED - Set Decimal Flag
    0xF8: function() {
        this.debugger(1, 'SEI');
        this.p = this.p | 0b1000;
        this.pc = this.pc + 1;
    },
    // PHP - Push P onto Stack
    0x08: function() {
        this.debugger(1, 'PHP');
        this.stackPush(this.p);
        this.pc = this.pc + 1;
    },
    // PLA - Pop stack into Accumulator
    // Set Zero and Negative flag appropriately
    0x68: function() {
        this.debugger(1, 'PLA');
        this.a = this.stackPop();
        // Now set the zero flag if A is 0
        if(this.a == 0x00) {
            this.p = this.p | 0b10;
        } else {
            this.p = this.p & 0b11111101;
        }
        // Now set negative
        this.p = (this.p & 0b01111111) | (this.a & 0b10000000);
        this.pc = this.pc + 1;
    },
    // AND - Logical AND with accumulator
    0x29: function() {
        this.debugger(2, `AND $#${fh(this.mem.get(this.pc + 1))}`);
        let result = this.a & this.mem.get(this.pc + 1);
        // Now set the zero flag if A is 0
        if(result == 0x00) {
            this.p = this.p | 0b10;
        } else {
            this.p = this.p & 0b11111101;
        }
        // Now set negative
        this.p = (this.p & 0b01111111) | (result & 0b10000000);
        this.pc = this.pc + 2;
    },
    // CMP - Compare contents of accumulator with immediate memory value
    0xc9: function() {
        this.debugger(2, `CMP $#${fh(this.mem.get(this.pc + 1))}`);
        let value = this.mem.get(this.pc + 1);
        // Set the carry flag
        if(this.a >= value) {
            this.p = this.p | 0b1;
        } else {
            this.p = this.p & 0b11111110;
        }
        // Set zero
        if(this.a == value) {
            this.p = this.p | 0b10;
        } else {
            this.p = this.p & 0b11111101;
        }
        // Set Negative
        // @todo: Check if this is calculated correct. It says if bit 7 is set.
        this.p = (this.p & 0b01111111) | (value & 0b10000000);
        this.pc = this.pc + 2;
    },
    // CLD Clear decimal mode
    0xD8: function() {
        this.debugger(1, 'CLD');
        this.p = this.p & 0b11110111;
        this.pc = this.pc + 1;
    },
    // PHA - Push to stack the accumulator value
    0x48: function() {
        this.debugger(1, 'PHA');
        this.stackPush(this.a);
        this.pc = this.pc + 1;
    },
    // PLP - Pop from stack and store in flags
    0x28: function() {
        this.debugger(1, 'PHA');
        this.p = this.stackPop();
        this.pc = this.pc + 1;

    }

  }
}
</script>
