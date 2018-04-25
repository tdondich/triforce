<template>
    <div>
        <!-- Represent our banks -->
        <memory size="8192" ref="prgram" title="PRG-RAM" />
        <memory size="16384" ref="prgrom1" title="PRG-ROM-1" />
        <memory size="16384" ref="prgrom2" title="PRG-ROM-2" />

        <memory size="8160" ref="expansion" title="EXPANSION" />

        <!-- Our CHR doesn't need a data bus because it's just one entity and not bank swapped -->
        <chr size="8192" ref="chrmem" title="Mapper 0 CHR" />

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
        ref: 'chrmem',
        min: 0x0000,
        max: 0x1FFF,
        size: 8192
    }
    ]" />
    </div>
</template>

<script>
import memory from "../memory.vue";
import databus from "../databus.vue";
import chr from "../chr.vue";

export default {
  components: {
    memory,
    chr,
    databus
  },
  created() {
      this.$_memory = new Uint8Array(49120);
  },
  methods: {
    resolveRead(address, bus = "prg") {
        if(bus == 'prg') {
            return () => {
                return this.$_memory[address];
            }
        }
        return this.$refs[bus].resolveRead(address, bus);
    },
    resolveWrite(address, bus = "prg") {
        if(bus == 'prg') {
            return (value) => {
                this.$_memory[address] = value;
            }
        }
        return this.$refs[bus].resolveWrite(address, bus);
    },
    get(address, bus = "prg") {
      // Pass it on to one of our data buses
      if(bus == 'prg') {
          return this.$_memory[address];
      }
      return this.$refs[bus].get(address, bus);
    },
    getRange(address, length, bus = "prg") {
        if(bus == 'prg') {
            return this.$_memory.slice(address, (address + length));
        }
      return this.$refs[bus].getRange(address, length);
    },
    set(address, value, bus = "prg") {
        if(bus == 'prg') {
            this.$_memory[address] = value;
        }
      // Pass it on to one of our data buses
      return this.$refs[bus].set(address, value, bus);
    }
  }
};
</script>

