<template>
    <div>
    </div>
</template>

<script>
export default {
    props: [
        'size',
        'title'
    ],
    data: function() {
        return {
            // Empty. Memory is now a non-reactive data element
       }
    },
    created() {
        this.$_memory = new Uint8Array(this.size)
    },
   methods: {
        reset: function() {
            this.$_memory.fill(0);
        },
        // Fill a memory range with a specific value
        fill(value = 0x00, start = 0, end = this.$_memory.length) {
            this.$_memory.fill(value, start, end + 1);
        },
        set(address, value) {
            if(address >= this.size) {
                // Should never happen
                throw "Address exceeds memory size";
            }
           this.$_memory[address] = value;
        },
        get(address) {
            if(address >= this.size) {
                // Should never happen
                throw "Address exceeds memory size";
            }
           return this.$_memory[address];
        },
   }
}
</script>

