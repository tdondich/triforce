<template>
    <div>
    </div>
</template>

<script>
export default {
    props: [
        'size',
        'addressible',
        'title'
    ],
    data: function() {

        return {
           memory: new Uint8Array(this.size),
       }
    },
    computed: {
        mirrored() {
            return (Math.floor(this.addressible / this.size) * this.size);
        },
    },
    methods: {
        reset: function() {
            this.memory.fill(0);
        },
        // Fill a memory range with a specific value
        fill(value = 0x00, start = 0, end = this.memory.length) {
            this.memory.fill(value, start, end + 1);
        },
        set(address, value) {
            if(address >= this.size) {
                address = address - this.mirrored;
            }
           this.memory[address] = value;
        },
        get(address) {
            if(address >= this.size) {
                address = address - this.mirrored;
            }
           return this.memory[address];
        },
   }
}
</script>

