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
    // JSR
    0x20: function() {

    }
  }
}
</script>
