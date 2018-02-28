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
        debug = debug + (operation.padEnd(16, ' '));
        console.log(this.debug = debug);
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
        if(this.isCarry) {
            this.debugger(2, `BCS $${fh(this.getRelativeAddress(this.pc + 1))}`);
            this.pc = this.getRelativeAddress(this.pc + 1) + 2;
        } else {
            this.debugger(2, `BCS $${fh(this.pc + 2)}`);
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
        this.debugger(1, `BCC $${fh(this.getRelativeAddress(this.pc + 1))}`);
        if(!this.isCarry) {
            this.debugger(1, `BCC $${fh(this.getRelativeAddress(this.pc + 1))}`);
            this.pc = this.getRelativeAddress(this.pc + 1) + 2;
        } else {
            this.debugger(2, `BCC $${fh(this.pc + 2)}`);
            this.pc = this.pc + 2;
        }
    },
    // Load Accumulator with direct value
    0xA9: function() {
        this.debugger(2, `LDA #$${fh(this.mem.get(this.pc + 1))}`);
        this.a = this.mem.get(this.pc + 1);
        this.pc = this.pc + 2;
    },
    // BEQ - Branch if equal, checks zero flag, and if so relative branch
    0xF0: function() {
        if(this.isZero) {
            console.log("Totally zero");
            this.debugger(1, `BEQ $${fh(this.getRelativeAddress(this.pc + 1))}`);
            this.pc = this.getRelativeAddress(this.pc + 1) + 2;
        } else {
            this.debugger(2, `BEQ $${fh(this.pc + 1)}`);
            this.pc = this.pc + 2;
        }
    },
    // Branch if not equal, if zero flag is not set, relative branch
    0xD0: function() {
        if(!this.isZero) {
            this.debugger(1, `BEQ $${fh(this.getRelativeAddress(this.pc + 1))}`);
            this.pc = this.getRelativeAddress(this.pc + 1) + 2;
        } else {
            this.debugger(2, `BEQ $${fh(this.pc + 1)}`);
            this.pc = this.pc + 2;
        }
    },
    // STA - Zero Page Addressing
    0x85: function() {
        this.debugger(2, `STA $${fh(this.mem.get(this.pc + 1))} = ${fh(this.mem.get(this.getZeroPageAddress(this.pc + 1)))}`);
        this.mem.set(this.getZeroPageAddress(this.pc + 1), this.a);
        this.pc = this.pc + 2;
    }
    /*
    0x24: function() {

    }
    */
  }
}
</script>
