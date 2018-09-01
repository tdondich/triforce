let databusUid = 0;
Vue.component('databus', {
  props: ["name", "size", "sections"],
  data: function() {
    databusUid++;
    return {
      // Memory represents our memory sized by the size property
      uid: `memorybus-${databusUid}`,
      // Start at the very beginning
      inspectAddress: "0x0000",
      // Debugger fill values
      inspectFillStart: "0x0000",
      inspectFillEnd: "0x0000",
      inspectFillValue: "0x00",
      inspectFillError: false,
      inspectFillSuccess: false,
      inspectCharCodeEnabled: false
    };
  },

  created() {
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
      }
    }

    this.get = function(address) {
      /*
      let { min, size, bus, target } = this[address];
      // We found the memory module we need to reference, plus dealing with memory that repeats
      return target.get((address - min) % size, bus);
      */
     return this[address].target.get((address - this[address].min) % this[address].size, this[address].bus);
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
  computed: {
    // This returns the decimal representation of inspectAddress.  If it's not a number, reset to 0.
    // If we're greater than our length, set to length
    inspectAddressCalculated() {
      let address = parseInt(this.inspectAddress, 16);
      if (!address) {
        address = 0;
      }
      if (address >= this.size) {
        address = this.size - 1;
      }
      return address;
    },
    inspectStartCalculated() {
      // We want to represent a "window" around the inspectAddress when possible
      let lower = this.inspectAddressCalculated - 128;
      if (lower <= 16) {
        return 0;
      }
      let val = Math.floor(lower / 16);
      let value = val * 16;
      if (value >= 65280) {
        // This is to ensure we always stick to a lower page;
        value = 65280;
      }
      return value;
    },
    inspectMemorySlice() {
      // Grab an array copy
      let result = [];
      let end = this.inspectStartCalculated + 256;
      for (let idx = this.inspectStartCalculated; idx < end; idx++) {
        result[result.length] = this.get(idx);
      }
      return result;
    }
  },
  methods: {
   inspectFill() {
      this.inspectFillError = this.inspectFillSuccess = false;
      let start = parseInt(this.inspectFillStart, 16);
      if (isNaN(start)) {
        this.inspectFillError = "Invalid Fill Start Address";
      }
      let end = parseInt(this.inspectFillEnd, 16);
      if (isNaN(end)) {
        this.inspectFillError = "Invalid Fill End Address";
      }
      let value = parseInt(this.inspectFillValue, 16);
      if (isNaN(value) || value < 0 || value > 0xff) {
        this.inspectFillError = "Invalid Fill Value or out of range";
      }
      this.fill(value, start, end);
      this.inspectFillSuccess = `Filled ${this.inspectFillStart} to ${
        this.inspectFillEnd
      } with ${this.inspectFillValue}`;
      // Going to force updating the value
      let old = this.inspectAddress;
      this.inspectAddress = 0;
      this.inspectAddress = old;
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
    }
  },
  template: `
    <div class="databus row memory">
    <div class="col-sm-12">
      <p>
        <a class="btn btn-primary" data-toggle="collapse" :href="'#' + uid">{{name}}</a>
      </p>
      <div :id="uid" class="collapse">
        <div class="row">
          <div class="col-sm-8">
            <table class="debugger table table-bordered table-dark">
              <tbody>
                <tr v-for="(index, count) in inspectMemorySlice.length / 16" :key="count">
                  <th>0x{{(inspectStartCalculated + (16 * count)).toString(16).padStart(4, '0')}}</th>
                  <td v-bind:data-address="(inspectStartCalculated + (16 * count) + parseInt(idx))" v-bind:class="{target: (inspectStartCalculated + (16 * count) + parseInt(idx)) == inspectAddressCalculated }" v-for="(value, idx) in inspectMemorySlice.slice(16 * count, (16 * count) + 16)" :key="idx">
                    <span v-if="inspectCharCodeEnabled">
                      {{String.fromCharCode(value)}}
                    </span>
                    <span v-else>
                      <span v-if="typeof value != 'undefined'">
                        {{value.toString(16).padStart(2, '0)').toUpperCase()}}
                      </span>
                    </span>
                  </td>
                </tr>
              </tbody>

            </table>
          </div>
          <div class="col-sm-4">
            <h4>Browse Memory</h4>
            <div class="form-group">
              <label>Memory Location:</label>
              <input class="form-control" v-model="inspectAddress">
            </div>
            <button @click="inspectCharCodeEnabled = !inspectCharCodeEnabled" v-if="inspectCharCodeEnabled">Switch To Hex View</button>
            <button @click="inspectCharCodeEnabled = !inspectCharCodeEnabled" v-else>Switch To ASCII View</button>

            <hr>
            <h4>Memory Fill</h4>
            <div class="alert alert-danger" v-if="inspectFillError">
              {{inspectFillError}}
            </div>
            <div class="alert alert-success" v-if="inspectFillSuccess">
              {{inspectFillSuccess}}
            </div>
            <div class="form-group">
              <label>Fill Start</label>
              <input class="form-control" v-model="inspectFillStart">
            </div>
            <div class="form-group">
              <label>Fill End</label>
              <input v-model="inspectFillEnd" class="form-control">
            </div>
            <div class="form-group">
              <label>Fill Value</label>
              <input class="form-control" v-model="inspectFillValue">
            </div>
            <button @click="inspectFill">Fill</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  `

});