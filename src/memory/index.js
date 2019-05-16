function Memory(size) {
    this.realSize = size;
    this.$_memory = new Uint8Array(this.realSize);
}

Memory.prototype.reset = function () {
    this.$_memory.fill(0);
}

// Fill a memory range with a specific value
Memory.prototype.fill = function (value = 0x00, start = 0, end = this.$_memory.length) {
    this.$_memory.fill(value, start, end + 1);
}

Memory.prototype.set = function (address, value) {
    // Disabled check for performance reasons
    /*
          if(address >= this.realSize) {
              // Should never happen
              throw "Address exceeds memory size";
          }
          */
    this.$_memory[address] = value;
}

Memory.prototype.get = function(address)  {
    // Disabled check for performance reasons
    /*
          if(address >= this.realSize) {
              // Should never happen
              throw "Address exceeds memory size";
          }
          */
    return this.$_memory[address];
}

Memory.prototype.getRange = function(address, length) {
    // Disable check for performance reasons
    /*
          if((address + (length - 1)) >= this.realSize) {
              throw "Address range exceeds memory size";
          }
          */
    return this.$_memory.slice(address, address + length);
}

export default Memory