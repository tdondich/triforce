Vue.component('memory', {
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
        this.realSize = this.size;
        this.$_memory = new Uint8Array(this.size)
        this.set = (address, value) => {
            // Disabled check for performance reasons
            /*
            if(address >= this.realSize) {
                // Should never happen
                throw "Address exceeds memory size";
            }
            */
           this.$_memory[address] = value;
        }
       this.get = (address) => {
            // Disabled check for performance reasons
            /*
            if(address >= this.realSize) {
                // Should never happen
                throw "Address exceeds memory size";
            }
            */
           return this.$_memory[address];
        }
        this.getRange = (address, length) => {
            // Disable check for performance reasons
            /*
            if((address + (length - 1)) >= this.realSize) {
                throw "Address range exceeds memory size";
            }
            */
            return this.$_memory.slice(address, (address + length));
        }


    },
   methods: {
       reset: function() {
            this.$_memory.fill(0);
        },
        // Fill a memory range with a specific value
        fill(value = 0x00, start = 0, end = this.$_memory.length) {
            this.$_memory.fill(value, start, end + 1);
        }
  },
  template: `
      <div>
    </div>
  `
})
