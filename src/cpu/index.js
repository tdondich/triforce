import Memory from '../memory'
import { saveAs } from 'file-saver';
// Import opcodes
import instructions from './opcodes/instructions.js';
import adc from './opcodes/adc.js';
import ldx from './opcodes/ldx.js';
import stx from './opcodes/stx.js';
import nop from './opcodes/nop.js';
import lda from './opcodes/lda.js';
import sta from './opcodes/sta.js';
import bit from './opcodes/bit.js';
import and from './opcodes/and.js';
import cmp from './opcodes/cmp.js';
import ora from './opcodes/ora.js';
import eor from './opcodes/eor.js';
import ldy from './opcodes/ldy.js';
import cpy from './opcodes/cpy.js';
import cpx from './opcodes/cpx.js';
import sbc from './opcodes/sbc.js';
import lsr from './opcodes/lsr.js';
import asl from './opcodes/asl.js';
import ror from './opcodes/ror.js';
import rol from './opcodes/rol.js';
import sty from './opcodes/sty.js';
import inc from './opcodes/inc.js';
import dec from './opcodes/dec.js';
import lax from './opcodes/lax.js';

function Cpu() {

    // Create internal memory
    this.registers = new Memory(2048);


    // Set initial breakpoint to nothing
    this.breakpoint = null;
    // Empty handler
    this.breakpointHandler = () => { };

    this.debugDownloadLog = "";

    // For registers, see: http://wiki.nesdev.com/w/index.php/CPU_registers
    // Accumulator (Single Byte Wide)
    this.a = 0;
    // Index registers X and Y. (Single Byte Wide)
    this.x = 0;
    this.y = 0;
    // Program counter, supports 65536 adress locations, is 2 bytes wide)
    this.pc = 0;
    // The stack pointer (Single Byte Wide)
    this.sp = 0;
    // Status Register. Sets the status of various cpu flags (Single Byte Wide)
    // Note, computed properties help gather certain flag states easily than constant
    // bitwise operation checks
    // See: http://wiki.nesdev.com/w/index.php/Status_flags
    // See: http://wiki.nesdev.com/w/index.php/CPU_status_flag_behavior
    this.p = 0;

    // Cycle count.  When the cycle count hits 0, apply the actual operation
    this.cycles = 0;

    // This instruction points to what code should run once cycles count is 0
    this.instruction = null;

    // Determines if we wrote to the OAMDMA Memory mapped register, if so, we need
    // to do a memory transfer, and this halts the cpu for a number of cycles
    this.OAMDMAWritten = false;

    // Even/odd CPU cycle
    this.odd = false;
    // Interrupt flags
    // Non-Maskable Interrupt.
    // If value is 0, no nmi has occurred
    // If value is 1, nmi has been fired, but waiting for next instruction to run
    // If value is 2, nmi takes priority and needs to be handled
    this.nmi = 0;
    // Normal Interrupt.  If this happens, since it's line based, it'll be a counter
    this.irq = 0;
    this.inDebug = false;

    this.debugger = this.disabledDebugger;
}

// Connect resources
Cpu.prototype.connectMemory = function(memory) {
    this.mem = memory;
}

Cpu.prototype.connectPpu = function(ppu) {
    this.ppu = ppu;
}

Cpu.prototype.getRegisterMemory = function() {
    return this.registers;
}

Cpu.prototype.isCarry = function() {
    return (this.p & 0b0001) == 0b0001;
};
Cpu.prototype.isZero = function() {
    return (this.p & 0b0010) == 0b0010;
};
Cpu.prototype.isInterruptDisabled = function() {
    return (this.p & 0b0100) == 0b0100;
};
Cpu.prototype.isDecimal = function() {
    return (this.p & 0b1000) == 0b1000;
};
Cpu.prototype.isOverflow = function() {
    return (this.p & 0b1000000) == 0b1000000;
};
Cpu.prototype.isNegative = function() {
    return (this.p & 0b10000000) == 0b10000000;
};
Cpu.prototype.copyOAM = function () {
    // Copy all data from $XX00-$XXFF to ppu OAM
    let base = this.mem.get(0x4014);
    // Now, let's create the base address
    base = base << 8;
    for (let i = 0; i < 256; i++) {
        let value = this.mem.get(base + i);
        // Copy over to address
        this.ppu.copyToOAM(i, value);
    }
    this.OAMDMAWritten = false;
};
Cpu.prototype.handleNMI = function () {
    // First push return address high byte onto stack
    this.stackPush(this.pc >> 8);
    // Now push return address low byte onto stack
    this.stackPush(this.pc & 0xff);
    // Finally, push status register onto stack
    this.stackPush(this.p);
    // Get NMI vector and place it into this.pc
    this.pc = this.getNMIVector();
    // We set nmi to false here to ensure nothing else takes priority over this
    this.nmi = 0;
};
Cpu.prototype.handleIRQ = function () {
    // First push return address high byte onto stack
    this.stackPush(this.pc >> 8);
    // Now push return address low byte onto stack
    this.stackPush(this.pc & 0xff);
    // Finally, push status register onto stack
    this.stackPush(this.p);
    // Get NMI vector and place it into this.pc
    this.pc = this.getIRQVector();
    // Decrement IRQ by one.  We've handled the Interrupt
    this.irq = this.irq - 1;
};

// Programatically set the force vector to a set memory address
Cpu.prototype.setForceVector = function(addr) {
    this.forceResetVector = addr;
};
// Programatically set the breakpoint to a set memory address
Cpu.prototype.setBreakpoint = function(addr, cb) {
    this.breakpoint = addr;
    this.breakpointHandler = cb;
};
Cpu.prototype.toggleDebug = function() {
    this.debugEnabled = !this.debugEnabled;
    if (this.debugEnabled) {
        this.debugger = this.enabledDebugger;
    } else {
        this.debugger = this.disabledDebugger;
    }
};

Cpu.prototype.toggleDownloadEnable = function() {
    if ((this.debugDownloadEnable = !this.debugDownloadEnable)) {
        // Download enabled
        // Clear our current log
        this.debugDownloadLog = "";
    } else {
        // Download disabled
        // @todo Anything to do here?
    }
};
Cpu.prototype.downloadDebugLog = function() {
    // Use FileSaver.js to send the blob as a file to the user
    let blob = new Blob([this.debugDownloadLog], {
        type: "text/plain;charset=utf-8"
    });
    saveAs(blob, "debug.txt");
};
// These are sets and gets for our memory mapped registers
Cpu.prototype.set = function(address, value) {
    this.registers.set(address, value);
    // Check if we wrote to OAMDMA
    // That would map to our 0x0014
    if (!this.inDebug && address == 0x0014) {
        this.OAMDMAWritten = true;
    }
};
Cpu.prototype.get = function(address) {
    return this.registers.get(address);
};
Cpu.prototype.setCarry = function(val) {
    if (val) {
        // Set carry flag
        this.p = this.p | 0b00000001;
    } else {
        // Reset carry flag
        this.p = this.p & 0b11111110;
    }
};
Cpu.prototype.setOverflow = function(val) {
    if (val) {
        // Set overflow
        this.p = this.p | 0b01000000;
    } else {
        this.p = this.p & 0b10111111;
    }
};
Cpu.prototype.setZero = function(val) {
    if (val) {
        this.p = this.p | 0b00000010;
    } else {
        this.p = this.p & 0b11111101;
    }
};
Cpu.prototype.setNegative = function(val) {
    if (val) {
        this.p = this.p | 0b10000000;
    } else {
        this.p = this.p & 0b01111111;
    }
};
// Our Interrupt Handling
Cpu.prototype.fireNMI = function() {
    this.nmi = 1;
};
Cpu.prototype.fireIRQ = function() {
    if (!this.isInterruptDisabled) {
        this.irq = this.irq + 1;
    }
};

// See: http://wiki.nesdev.com/w/index.php/CPU_power_up_state#After_reset
Cpu.prototype.reset = function() {
    this.error = "";
    // Do not touch the A,X,Y registers
    // subtract 3 from sp, wrapping if necessary
    for (let count = 0; count < 3; count++) {
        if (this.sp == 0x00) {
            this.sp = 0xff;
        } else {
            this.sp--;
        }
    }
    this.p = 0x24;
    this.a = this.x = this.y = 0;
    this.pc = this.getResetVector();
};
// This is the initial power on state
// See: http://wiki.nesdev.com/w/index.php/CPU_power_up_state#At_power-up
Cpu.prototype.power = function() {
    // P i set to interrupt disable
    this.p = 0x24;
    this.a = this.x = this.y = 0;
    this.sp = 0xfd;
    // Frame IRQ enabled
    this.mem.set(0x4017, 0x00);
    // All channels enabled
    this.mem.set(0x4015, 0x00);
    this.mem.fill(0x00, 0x4000, 0x400f);
    // Begin to execute
    this.pc = this.getResetVector();
};
// Determines if two addresses would be crossing memory pages.
// A page from our CPU perspective is a 256 byte region.
Cpu.prototype.pageCrossed = function(source, target) {
    return (source & 0xff00) != (target & 0xff00);
};
// Vectors
// See: https://en.wikibooks.org/wiki/NES_Programming/Initializing_the_NES#Interrupt_Vectors
// Reset address value is located at 0xfffc and 0xfffd (reversed)
Cpu.prototype.getResetVector = function() {
    if (this.forceResetVector) {
        return parseInt(this.forceResetVector);
    }
    return this.getAbsoluteAddress(0xfffc);
};
Cpu.prototype.getIRQVector = function() {
    return this.getAbsoluteAddress(0xfffe);
};
Cpu.prototype.getNMIVector = function() {
    return this.getAbsoluteAddress(0xfffa);
};
// Handling various addressing modes the cpu supports
Cpu.prototype.getZeroPageAddress = function(address) {
    return this.mem.get(address);
};
Cpu.prototype.getZeroPageXAddress = function(address) {
    return (this.getZeroPageAddress(address) + this.x) & 0x00ff;
};
Cpu.prototype.getZeroPageYAddress = function(address) {
    return (this.getZeroPageAddress(address) + this.y) & 0x00ff;
};
Cpu.prototype.getRelativeAddress = function(address) {
    // Get the signed integer value
    // See: http://blog.vjeux.com/2013/javascript/conversion-from-uint8-to-int8-x-24.html
    return this.pc + ((this.mem.get(address) << 24) >> 24);
};
Cpu.prototype.getAbsoluteAddress = function(address, zeroPage = false) {
    // Will fetch an address value from address and address + 1, but flip it so you get the true 2 byte address location
    let first = this.mem.get(address);
    let second = 0x00;
    // Check to see if we're meant to be pulling from zero page.  If so, we need to wrap
    if (zeroPage && address == 0xff) {
        second = this.mem.get(0x00);
    } else {
        second = this.mem.get(address + 1);
    }
    // Now, we need to return the number that is second + first
    return (second << 8) | first;
};
// Sets an absolute address at memory location
Cpu.prototype.setAbsoluteAddress = function(address, value) {
    this.mem.set(address, value & 0xff);
    this.mem.set(address + 1, value >> 8);
};
Cpu.prototype.getAbsoluteXAddress = function(address) {
    return (this.getAbsoluteAddress(address) + this.x) & 0xffff;
};
Cpu.prototype.getAbsoluteYAddress = function(address) {
    return (this.getAbsoluteAddress(address) + this.y) & 0xffff;
};
Cpu.prototype.getIndirectAddress = function(address) {
    return this.getAbsoluteAddress(this.getAbsoluteAddress(address));
};
Cpu.prototype.getIndexedIndirectXAddress = function(address) {
    let first = this.getZeroPageXAddress(address);
    return this.getAbsoluteAddress(first, true);
};
Cpu.prototype.getIndexedIndirectYAddress = function(address) {
    let first = this.getZeroPageYAddress(address);
    return this.getAbsoluteAddress(first, true);
};
Cpu.prototype.getIndirectIndexedAddress = function(address) {
    // First, get the absolute address
    let first = this.getAbsoluteAddress(this.mem.get(address), true);
    return (first + this.y) & 0xffff;
};
// Performs a CPU tick, going through an operation
Cpu.prototype.tick = function() {
    this.odd = !this.odd;

    // Run queued instruction
    if (this.cycles == 0 && this.instruction != null) {
        // Run the instruction
        this.instruction();
        this.instruction = null;
        // Check for OAMDMA being written to
        if (this.OAMDMAWritten) {
            this.cycles = this.odd ? 514 : 513;
            this.instruction = this.copyOAM;
        }
        // Check if NMI is pending, if it is, set it to ready to execute
        if (this.nmi == 1) {
            this.nmi = 2;
        }
    }
    // Check to see if we actually need to fetch an operation
    if (this.nmi < 2 && this.cycles == 0 && this.instruction == null) {
        // @Note: This checks for a position in code and set console to debug (BREAKPOINT)

        if (this.breakpoint && this.pc == this.breakpoint) {
            // Halt before the next cycle
            (this.breakpointHandler)();
        }

        let instr = this.mem.get(this.pc);
        if (typeof this[instr] == "undefined") {
            this.error =
                "Failed to find instruction handler for " + instr.toString(16);
            throw this.error;
        } else {



            // Run the opcode. This will set the cycles counter and the instruction handler
            this[instr]();
        }
    }
    // Check for NMI (this takes priority over regular IRQs)
    if (this.nmi == 2 && this.cycles == 0) {
        this.cycles = 7;
        this.instruction = this.handleNMI;
    }
    // Check to determine if we need to handle IRQ
    // If cycles is greater than 0, then we need to allow the current opcode to complete
    if (!this.nmi && this.cycles == 0 && this.irq > 0) {
        this.cycles = 7;
        this.instruction = this.handleIRQ;
    }
    if (this.cycles > 0) {
        // consume a cycle
        this.cycles = this.cycles - 1;
    }

};

// Pushes to the top of the stack then modified the stack pointer
Cpu.prototype.stackPush = function(val) {
    this.mem.set(0x0100 | this.sp, val);
    // Go 'up' a stack
    this.sp = (this.sp - 1) & 0xff;
    return true;
};
// Pops off the stack, returning the address
Cpu.prototype.stackPop = function() {
    this.sp = (this.sp + 1) & 0xff;
    return this.mem.get(0x0100 | this.sp);
}


// Assign our opcodes
instructions(Cpu);
adc(Cpu);
ldx(Cpu);
stx(Cpu);
nop(Cpu);
lda(Cpu);
sta(Cpu);
bit(Cpu);
and(Cpu);
cmp(Cpu);
ora(Cpu);
eor(Cpu);
ldy(Cpu);
cpy(Cpu);
cpx(Cpu);
sbc(Cpu);
lsr(Cpu);
asl(Cpu);
ror(Cpu);
rol(Cpu);
sty(Cpu);
inc(Cpu);
dec(Cpu);
lax(Cpu);

export default Cpu