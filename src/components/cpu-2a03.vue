<template>
  <div class="row">
    <div class="col-sm-12">
      <button class="btn btn-primary" v-if="!debugEnabled" @click="debugEnabled = !debugEnabled">Enable CPU Debug View</button>
      <button class="btn btn-primary" v-else @click="debugEnabled = !debugEnabled">Disable CPU Debug View</button>
    </div>
    <div v-if="debugEnabled" class="col-sm-12">
      <div class="form-group">
        <label>Force Reset Vector</label>
        <input v-model="forceResetVector" class="form-control col-sm-1">
      </div>
    </div>

    <div v-if="debugEnabled" class="col-sm-12">
      <h4>Registers</h4>
      <table class="table table-dark table-sm table-bordered">
        <tbody>
          <tr>
            <th>A</th>
            <td>{{a.toString(16).padStart(2, '0')}}</td>
            <th>X</th>
            <td>{{x.toString(16).padStart(2, '0')}}</td>
            <th>Y</th>
            <td>{{y.toString(16).padStart(2, '0')}}</td>
            <th>PC</th>
            <td>{{pc.toString(16).padStart(2, '0')}}</td>
            <th>SP</th>
            <td>{{sp.toString(16).padStart(2, '0')}}</td>
            <th>P</th>
            <td>{{p.toString(16).padStart(2, '0')}}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="alert alert-danger" v-if="error">
      {{error}}
    </div>
    <div v-if="debugEnabled" class="col-sm-12 debug">
      <textarea rows="5" class="form-control" v-model="debug"></textarea>
    </div>

    <!-- These are memory mapped registers -->
    <!-- See: https://wiki.nesdev.com/w/index.php/2A03 -->
    <memory ref="registers" size="32" />

  </div>

</template>

<script>
import memory from "./memory.vue";
import instructions from "../mixins/instructions";
import stx from "../mixins/opcodes/stx";
import ldx from "../mixins/opcodes/ldx";
import lda from "../mixins/opcodes/lda";
import lsr from "../mixins/opcodes/lsr";
import asl from "../mixins/opcodes/asl";
import ror from "../mixins/opcodes/ror";
import rol from "../mixins/opcodes/rol";
import sta from "../mixins/opcodes/sta";
import ora from "../mixins/opcodes/ora";
import and from "../mixins/opcodes/and";
import eor from "../mixins/opcodes/eor";
import adc from "../mixins/opcodes/adc";
import cmp from "../mixins/opcodes/cmp";
import sbc from "../mixins/opcodes/sbc";
import ldy from "../mixins/opcodes/ldy";
import sty from "../mixins/opcodes/sty";
import cpx from "../mixins/opcodes/cpx";
import cpy from "../mixins/opcodes/cpy";
import inc from "../mixins/opcodes/inc";
import dec from "../mixins/opcodes/dec";
import bit from "../mixins/opcodes/bit";
import nop from "../mixins/opcodes/nop";
import lax from "../mixins/opcodes/lax";

export default {
  components: {
    memory
  },
  mixins: [
    //instructions,
    stx,
    ldx,
    lda,
    lsr,
    asl,
    ror,
    rol,
    sta,
    ora,
    and,
    eor,
    adc,
    cmp,
    sbc,
    ldy,
    sty,
    cpx,
    cpy,
    inc,
    dec,
    bit,
    nop,
    lax
  ],
  data: function() {
    // Our data represents our internal registers and processor flag
    return {
      debugX: 0,
      debugY: 0,
      debugA: 0,
      debugPC: 0,
      debugSP: 0,
      debugP: 0,

      // How the CPU should operate
      // Stepping means that the CPU should step through each operation instead of continuous run
      // This flag will show the CPU and debugged instructions
      debugEnabled: false,
      forceResetVector: "",
      debug: "",
      // If the CPU encountered a critical error
      error: "",
    };
  },
  created() {
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

    // @todo Move the rest of the opcodes into this component via assign instead of the mixins vue behavior
    Object.assign(this, instructions);

    this.isCarry = () => {
      return (this.p & 0b0001) == 0b0001;
    };
    this.isZero = () => {
      return (this.p & 0b0010) == 0b0010;
    };
    this.isInterruptDisabled = () => {
      return (this.p & 0b0100) == 0b0100;
    };
    this.isDecimal = () => {
      return (this.p & 0b1000) == 0b1000;
    };
    this.isOverflow = () => {
      return (this.p & 0b1000000) == 0b1000000;
    };
    this.isNegative = () => {
      return (this.p & 0b10000000) == 0b10000000;
    };

    this.copyOAM = function() {
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

    this.handleNMI = function() {
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

    this.handleIRQ = function() {
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
  },
  mounted() {
    this.mainbus = this.$parent.$refs.mainbus;
    this.ppu = this.$parent.$refs.ppu;
    this.mem = this.mainbus;
  },
  computed: {
    debugOutput() {
      return this.debug.join("\n");
    }
  },

  methods: {
    // These are sets and gets for our memory mapped registers
    set(address, value) {
      this.$refs.registers.set(address, value);
      // Check if we wrote to OAMDMA
      // That would map to our 0x0014
      if (!this.inDebug && address == 0x0014) {
        this.OAMDMAWritten = true;
      }
    },
    get(address) {
      return this.$refs.registers.get(address);
    },

    setCarry(val) {
      if (val) {
        // Set carry flag
        this.p = this.p | 0b00000001;
      } else {
        // Reset carry flag
        this.p = this.p & 0b11111110;
      }
    },
    setOverflow(val) {
      if (val) {
        // Set overflow
        this.p = this.p | 0b01000000;
      } else {
        this.p = this.p & 0b10111111;
      }
    },
    setZero(val) {
      if (val) {
        this.p = this.p | 0b00000010;
      } else {
        this.p = this.p & 0b11111101;
      }
    },
    setNegative(val) {
      if (val) {
        this.p = this.p | 0b10000000;
      } else {
        this.p = this.p & 0b01111111;
      }
    },
    // Our Interrupt Handling
    fireNMI() {
      this.nmi = 1;
    },
    fireIRQ() {
      if (!this.isInterruptDisabled) {
        this.irq = this.irq + 1;
      }
    },

    // See: http://wiki.nesdev.com/w/index.php/CPU_power_up_state#After_reset
    reset() {
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
    },
    // This is the initial power on state
    // See: http://wiki.nesdev.com/w/index.php/CPU_power_up_state#At_power-up
    power() {
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
    },
    // Determines if two addresses would be crossing memory pages.
    // A page from our CPU perspective is a 256 byte region.
    pageCrossed(source, target) {
      return (source & 0xff00) != (target & 0xff00);
    },
    // Vectors
    // See: https://en.wikibooks.org/wiki/NES_Programming/Initializing_the_NES#Interrupt_Vectors
    // Reset address value is located at 0xfffc and 0xfffd (reversed)
    getResetVector() {
      if (this.forceResetVector) {
        return parseInt(this.forceResetVector);
      }
      return this.getAbsoluteAddress(0xfffc);
    },
    getIRQVector() {
      return this.getAbsoluteAddress(0xfffe);
    },
    getNMIVector() {
      return this.getAbsoluteAddress(0xfffa);
    },
    // Handling various addressing modes the cpu supports
    getZeroPageAddress(address) {
      return this.mem.get(address);
    },
    getZeroPageXAddress(address) {
      return (this.getZeroPageAddress(address) + this.x) & 0x00ff;
    },
    getZeroPageYAddress(address) {
      return (this.getZeroPageAddress(address) + this.y) & 0x00ff;
    },
    getRelativeAddress(address) {
      // Get the signed integer value
      // See: http://blog.vjeux.com/2013/javascript/conversion-from-uint8-to-int8-x-24.html
      return this.pc + ((this.mem.get(address) << 24) >> 24);
    },
    getAbsoluteAddress(address, zeroPage = false) {
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
    },
    // Sets an absolute address at memory location
    setAbsoluteAddress(address, value) {
      this.mem.set(address, value & 0xff);
      this.mem.set(address + 1, value >> 8);
    },
    getAbsoluteXAddress(address) {
      return (this.getAbsoluteAddress(address) + this.x) & 0xffff;
    },
    getAbsoluteYAddress(address) {
      return (this.getAbsoluteAddress(address) + this.y) & 0xffff;
    },
    getIndirectAddress(address) {
      return this.getAbsoluteAddress(this.getAbsoluteAddress(address));
    },
    getIndexedIndirectXAddress(address) {
      let first = this.getZeroPageXAddress(address);
      return this.getAbsoluteAddress(first, true);
    },
    getIndexedIndirectYAddress(address) {
      let first = this.getZeroPageYAddress(address);
      return this.getAbsoluteAddress(first, true);
    },
    getIndirectIndexedAddress(address) {
      // First, get the absolute address
      let first = this.getAbsoluteAddress(this.mem.get(address), true);
      return (first + this.y) & 0xffff;
    },
    // Performs a CPU tick, going through an operation
    tick() {
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
        if(this.nmi == 1) {
          this.nmi = 2;
        }
      }
      // Check to see if we actually need to fetch an operation
      if (this.nmi < 2 && this.cycles == 0 && this.instruction == null) {
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


      /*

    // Now check to see if we really need to run the instruction because all the cycles have been met
     */
    },
    // Pushes to the top of the stack then modified the stack pointer
    stackPush(val) {
      this.mem.set(0x0100 | this.sp, val);
      // Go 'up' a stack
      this.sp = (this.sp - 1) & 0xff;
      return true;
    },
    // Pops off the stack, returning the address
    stackPop() {
      this.sp = (this.sp + 1) & 0xff;
      return this.mem.get(0x0100 | this.sp);
    }
  }
};
</script>

<style lang="css" scoped>
.debug {
  font-family: "Courier New", Courier, monospace;
}
</style>

