<script>
export default {
  methods: {
    // These are now the opcodes we handle
    // JMP
    0x4c: function() {
        let mem = this.$parent.$refs.memory;
        // Assign PC to the address specified by next two operands
        let targetAddress = mem.getAddressValue(this.pc + 1);
        let debug = `${this.pc.toString(16)} ${mem.get(this.pc).toString(16)} ${mem.get(this.pc + 1).toString(16)} ${mem.get(this.pc +2).toString(16)} JMP $${targetAddress.toString(16)}`;
        console.log(debug);
        this.debug = debug;
        this.pc = targetAddress;
    }
}
}
</script>
