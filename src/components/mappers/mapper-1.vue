Vue.component('mapper-1', {
    created() {
        this.$_memory = new Uint8Array(49120);
    },
    data() {
        return {
            chr: [],
            prgROM: [],
        }
    },
    methods: {
        get(address, bus = "prg") {
            return this.$refs[bus].get(address, bus);
        },
        getRange(address, length, bus = "prg") {
            return this.$refs[bus].getRange(address, length);
        },
        set(address, value, bus = "prg") {
            if (bus == 'prg') {
                this.$_memory[address] = value;
            }
            // Pass it on to one of our data buses
            return this.$refs[bus].set(address, value, bus);
        },
        copyToPRGROM(data) {
            this.prgROM = data;
            // Set the first 16KB to prgrom1
            this.$refs.prgrom1.$_memory.set(data.slice(0, 16384));
            // Set the second 16KB to prgrom2, or mirror
            this.$refs.prgrom2.$_memory.set(data.slice(16384, 16384 * 2));

        },
        copyToCHR(data) {
            this.chr = data;
            // Go ahead and copy to our chr memory bank
            //this.$refs.chrmem.$_memory.set(data);
            this.$refs.chrmem.$_memory.set(data);
        }

    },
    template: `
       <div>
           <!-- Represent our banks -->
           <memory size="8192" ref="prgram" title="PRG-RAM" />
           <memory size="16384" ref="prgrom1" title="PRG-ROM-1" />
           <memory size="16384" ref="prgrom2" title="PRG-ROM-2" />
   
           <memory size="8160" ref="expansion" title="EXPANSION" />
   
           <!-- Our CHR doesn't need a data bus because it's just one entity and not bank swapped -->
           <chr size="4096" ref="chr1" title="Mapper 1 CHR-1" />
           <chr size="4096" ref="chr2" title="Mapper 1 CHR-2" />

   
           <!-- Our data bus which resides in the CPU memory space -->
           <databus ref="prg" name="Mapper 0 Expansion + SRAM + ROM" size="49120" :sections="[
               {
                   ref: 'expansion',
                   min: 0x0000,
                   max: 0x1FDF,
                   size: 8160,
               },
               {
                   ref: 'prgram',
                   min: 0x1FE0,
                   max: 0x3FDF,
                   size: 8192,
               },
               {
                   ref: 'prgrom1',
                   min: 0x3FE0,
                   max: 0x7FDF,
                   size: 16384
               },
               {
                   ref: 'prgrom2',
                   min: 0x7FE0,
                   max: 0xBFDF,
                   size: 16384
               }
           ]" />
   
           <databus ref="chr" name="CHR" size="8192" :sections="[
               {
                   ref: 'chr1',
                   min: 0x0000,
                   max: 0x0fff,
                   size: 4096
               },
               {
                   ref: 'chr2',
                   min: 0x0000,
                   max: 0x1FFF,
                   size: 4096
               }
       ]" />
       </div>
   
     `
});