/**
 * Nametable databus is about the same as a regular databus, but it will
 * provide rendering of its segments of memory.
 */
let nameTableDatabusUid = 0;
Vue.component('nametable-databus', {
    props: ["name", "size"],
    data: function () {
        nameTableDatabusUid++;
        return {
            // Memory represents our memory sized by the size property
            uid: `memorybus-${nameTableDatabusUid}`,
            mirroring: 'horizontal',
            base2000InspectAddress: '',
            base2400InspectAddress: '',
            base2800InspectAddress: '',
            base2C00InspectAddress: '',
            base2000: 0x0000,
            base2400: 0x0000,
            base2800: 0x0000,
            base2C00: 0x0000,
            sections: [
                {
                    ref: 'nametable0',
                    min: 0x0000,
                    max: 0x03FF,
                    size: 1024
                },
                {
                    ref: 'nametable0',
                    min: 0x0400,
                    max: 0x07FF,
                    size: 1024
                },
                {
                    ref: 'nametable1',
                    min: 0x0800,
                    max: 0x0BFF,
                    size: 1024,
                },
                {
                    ref: 'nametable1',
                    min: 0x0C00,
                    max: 0x0FFF,
                    size: 1024
                }
            ]
        };
    },

    created() {
        this.initMemoryMap();

        this.get = function (address) {
            let { min, size, bus, target } = this[address];
            // We found the memory module we need to reference, plus dealing with memory that repeats
            return target.get((address - min) % size, bus);
        };

        // Get's a value for a requested address, calling the target's get value, but translated from that target's
        // base address range
        this.getRange = (address, length) => {
            let { bus, target } = this[address];

            /*
            // Disable boundry checking for performance reasons
            let endNode = this.configuration[address + (length - 1)];
            if (node.target != endNode.target) {
              throw "Databus does not support fetching range across different targets";
            }
            */
            return target.getRange(address, length, bus);
        };
    },

    mounted() {
        // Copy sections prop to a property of this object, avoiding proxyGet cost
        //this.configuration = this.sections;
        // Populate the targets
    },
    methods: {
        hoverAddress(event, segment) {
            let c = document.getElementById("nametable-" + segment);
            let canvasCoords = c.getBoundingClientRect();
            // The plus 1 handles the border
            let x = Math.floor(event.clientX) - (Math.floor(canvasCoords.x) + 1); 
            let y = Math.floor(event.clientY) - (Math.floor(canvasCoords.y) + 1); 
            this['base' + segment + 'InspectAddress'] = x + ':' + y
        },
        initMemoryMap() {
        this.read = [];
        this.write = [];
        for (let count = 0; count < this.sections.length; count++) {
            let node = this.sections[count];
            for (let address = node.min; address <= node.max; address++) {
                this[address] = {
                    min: node.min,
                    max: node.max,
                    size: node.size,
                    bus: node.bus ? node.bus : undefined,
                    target: this.$parent.$refs[node.ref]
                };
                this.read[address] = this.resolveRead(address);
                this.write[address] = this.resolveWrite(address);
            }
        }


        },
        setMirroring(type) {
            this.mirroring = type;
            if (type == 'horizontal') {
                this.sections[0].ref = 'nametable0';
                this.sections[1].ref = 'nametable0';
                this.sections[2].ref = 'nametable1';
                this.sections[3].ref = 'nametable1';
            } else if (type == 'vertical') {
                this.sections[0].ref = 'nametable0';
                this.sections[1].ref = 'nametable1';
                this.sections[2].ref = 'nametable0';
                this.sections[3].ref = 'nametable1';
            }
            // Re-initialize memory mapping
            this.initMemoryMap();
        },
        resolveRead(address) {
            // Go to the end and resolve immediate function to read from memory
            let { min, size, bus, target } = this[address];
            return target.resolveRead((address - min) % size, bus);
        },
        resolveWrite(address) {
            // Go to the end and resolve immediate function to write to memory
            let { min, size, bus, target } = this[address];
            return target.resolveWrite((address - min) % size, bus);
        },
        // Fill a memory range with a specific value
        fill(value = 0x00, start = 0, end = this.memory.length) {
            for (let idx = start; idx <= end; idx++) {
                this.set(idx, value);
            }
        },
        set(address, value) {
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
        },
        redraw(segment) {
            let c = document.getElementById("nametable-" + segment);
            let ctx = c.getContext("2d");
            let r = 0;
            let g = 0;
            let b = 0;
            let a = 255;

            // Draw the patterns in this nametable
            // We are doing a 32x30 grid
            let xBase = 0;
            let yBase = 0;
            let start = parseInt(segment, 16);
            start = start - 0x2000;
            let end = start + 960;
            for (let count = start; count < end; count++) {
                let tileNumber = this.get(count);
                let base = tileNumber << 4;
                // Point our base address to the requested pattern table
                base = base | this['base' + segment];
                for (let y = 0; y < 8; y++) {
                    // Get first plane
                    let first = this.$parent.$refs.ppumainbus.get(base + y);
                    // Get second plane
                    let second = this.$parent.$refs.ppumainbus.get(base + y + 8);

                    for (let x = 0; x < 8; x++) {
                        if (!isBitSet(first, x) && !isBitSet(second, x)) {
                            // Color value is 0
                            r = g = b = 255;
                        } else if (isBitSet(first, x) && isBitSet(second, x)) {
                            // color value is 3
                            r = g = b = 0;
                        } else if (isBitSet(first, x)) {
                            // Color value is 1
                            r = g = b = 125;
                        } else {
                            // Color value is 2
                            r = g = b = 65;
                        }
                        ctx.fillStyle =
                            "rgba(" + r + "," + g + "," + b + "," + a / 255 + ")";
                        ctx.fillRect(xBase + (7 - x), yBase + y, 1, 1);
                    }
                }
                xBase = xBase + 8;
                // 128 = 8 bits * 16
                if (xBase >= 256) {
                    xBase = 0;
                    yBase = yBase + 8;
                }
            }
        },


    },
    template: `
    <div class="nametable row">
    <div class="col-sm-12">
    <table class="table">
    <tr>
    <td>
            <h2>Nametable $2000</h2>
        Pattern Table: <select v-model="base2000">
            <option :value="0x0000">0x0000</option>
            <option :value="0x1000">0x1000</option>
        </select> <button @click="redraw('2000')">Render</button><br>
        <canvas @mousemove="hoverAddress($event, '2000')" id="nametable-2000" width="256" height="240" /><br>
        <strong>Nametable:</strong> {{base2000InspectAddress}}
    </td>
    <td>
         <h2>Nametable $2400</h2>
        Pattern Table: <select v-model="base2400">
            <option :value="0x0000">0x0000</option>
            <option :value="0x1000">0x1000</option>
        </select> <button @click="redraw('2400')">Render</button><br>
        <canvas id="nametable-2400" width="256" height="240" />
    </td>
    </tr>
    <tr>
    <td>
         <h2>Nametable $2800</h2>
        Pattern Table: <select v-model="base2800">
            <option :value="0x0000">0x0000</option>
            <option :value="0x1000">0x1000</option>
        </select> <button @click="redraw('2800')">Render</button><br>
        <canvas id="nametable-2800" width="256" height="240" />
    </td>
    <td>
         <h2>Nametable $2C00</h2>
        Pattern Table: <select v-model="base2C00">
            <option :value="0x0000">0x0000</option>
            <option :value="0x1000">0x1000</option>
        </select> <button @click="redraw('2C00')">Render</button><br>
        <canvas id="nametable-2C00" width="256" height="240" />
    </td>
    </tr>
    </table>
 
    </div>
  </div>
  `

});