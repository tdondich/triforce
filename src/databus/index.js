
function Databus(size, sections) {
    for (let count = 0; count < sections.length; count++) {
        let node = sections[count];
        for (let address = node.min; address <= node.max; address++) {
            this[address] = {
                min: node.min,
                max: node.max,
                size: node.size,
                bus: node.bus ? node.bus : undefined,
                target: node.ref
            };
        }
    }

}
Databus.prototype.get = function (address) {
    /*
    let { min, size, bus, target } = this[address];
    // We found the memory module we need to reference, plus dealing with memory that repeats
    return target.get((address - min) % size, bus);
    */
    return this[address].target.get(
        (address - this[address].min) % this[address].size,
        this[address].bus
    );
}

// Get's a value for a requested address, calling the target's get value, but translated from that target's
// base address range
Databus.prototype.getRange = function (address, length) {
    let { bus, target } = this[address];

    /*
    // Disable boundry checking for performance reasons
    let endNode = this.configuration[address + (length - 1)];
    if (node.target != endNode.target) {
      throw "Databus does not support fetching range across different targets";
    }
    */
    return target.getRange(address, length, bus);
}

// Fill a memory range with a specific value
Databus.prototype.fill = function (value = 0x00, start = 0, end = this.memory.length) {
    for (let idx = start; idx <= end; idx++) {
        this.set(idx, value);
    }
}
Databus.prototype.set = function (address, value) {
    let { min, size, bus, target } = this[address];
    /** Disable if check for performance reasons */
    /*
    if (!node) {
      throw ("Invalid address:" + address.toString(16) + " in " + this.name);
    }
    */
    // We found the memory module we need to reference, plus dealing with memory that repeats
    target.set((address - min) % size, value, bus);
    return;
}

export default Databus