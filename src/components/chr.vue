<template>
    <div>
        <h2>CHR Data</h2>
        <canvas id="chr-left" width="128" height="128" />
        <canvas id="chr-right" width="128" height="128" />
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
           memory: new Uint8Array(this.size),
       }
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
                console.log(address + " : " + this.size + " : " + address.toString(16));
                // Should never happen
                throw "Address exceeds memory size";
            }
           this.memory[address] = value;
        },
        get(address) {
            if(address >= this.size) {
                console.log(address + " : " + this.size);
                // Should never happen
                throw "Address exceeds memory size";
            }
           return this.memory[address];
        },
        getTile(index, side = 0) {

        },
        redraw() {
            // Draw the patterns
            // We are doing a 16x16 grid
            for(let x = 0; x < 256; x++) {
                let base = x << 4;
                for(let y = 0; y < 16; y++) {

                }
            }
        }
   }
}
</script>

<style lang="scss" scoped>
canvas {
    border: 1px solid red;
}
</style>
