<template>
    <div class="row memory">
        <div class="col-sm-12">
            <h2>Memory</h2>
        </div>
        <div class="col-sm-8">
        <table class="debugger table table-bordered table-dark">
            <tbody>
                <tr v-for="(index, count) in inspectMemorySlice.length / 16" :key="count">
                    <th>0x{{(inspectStartCalculated + (16 * count)).toString(16).padStart(4, '0')}}</th>
                    <td v-bind:data-address="(inspectStartCalculated + (16 * count) + parseInt(idx))" v-bind:class="{target: (inspectStartCalculated + (16 * count) + parseInt(idx)) == inspectAddressCalculated }" v-for="(value, idx) in inspectMemorySlice.slice(16 * count, (16 * count) + 16)" :key="idx">
                        {{value.toString(16).padStart(2, '0)').toUpperCase()}}
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
                <label>Fill End (Exclusive)</label>
                <input v-model="inspectFillEnd" class="form-control">
            </div>
            <div class="form-group">
                <label>Fill Value</label>
                <input class="form-control" v-model="inspectFillValue"> 
            </div>
            <button @click="inspectFill">Fill</button>

        </div>
    </div>
</template>

<script>

export default {
    props: [
        'size'
    ],
    data: function() {
        return {
            // Memory represents our memory sized by the size property
            memory: new Uint8Array(this.size),
            // Start at the very beginning
            inspectAddress: '0x0000',
            // Debugger fill values
            inspectFillStart: '0x0000',
            inspectFillEnd: '0x0000',
            inspectFillValue: '0x00',
            inspectFillError: false,
            inspectFillSuccess: false,
        }
    },
    computed: {
        // This returns the decimal representation of inspectAddress.  If it's not a number, reset to 0.
        // If we're greater than our length, set to length
        inspectAddressCalculated() {
            let address =  parseInt(this.inspectAddress, 16);
            if(!address) {
                address = 0;
            }
            if(address > this.memory.length) {
                address = this.memory.length;
            }
            return address;
        },
        inspectStartCalculated() {
            // We want to represent a "window" around the inspectAddress when possible
            let lower = (this.inspectAddressCalculated - 128);
            if(lower <= 16) {
               return 0; 
            }
            return Math.floor(lower / 16) * 16;
        },
        inspectMemorySlice() {
            return this.memory.slice(this.inspectStartCalculated, this.inspectStartCalculated + 0xf0);
        }

    },
    methods: {
        reset: function() {
            this.memory.fill(0);
        },
        // Fill a memory range with a specific value
        fill(value = 0x00, start = 0, end = this.memory.length) {
            this.memory.fill(value, start, end);
        },
        inspectFill() {
            this.inspectFillError = this.inspectFillSuccess = false;
            let start = parseInt(this.inspectFillStart, 16);
            if(isNaN(start)) {
                this.inspectFillError = "Invalid Fill Start Address";
            }
            let end = parseInt(this.inspectFillEnd, 16);
            if(isNaN(end)) {
                this.inspectFillError = "Invalid Fill End Address";
            }
            let value = parseInt(this.inspectFillValue, 16);
            if(isNaN(value) || value < 0 || value > 0xff) {
                this.inspectFillError = "Invalid Fill Value or out of range";
            }
            this.memory.fill(value, start, end);
            this.inspectFillSuccess = `Filled ${this.inspectFillStart} to ${this.inspectFillEnd} with ${this.inspectFillValue}`;
            // Going to force updating the value
            let old = this.inspectAddress;
            this.inspectAddress = 0;
            this.inspectAddress = old;
        }
    }
}
</script>

<style scoped>
.debugger {
    font-family: monospace;
}

td.target {
    color: red;
}

p.error {
    color: red;
}

p.success {
    color: green;
}

</style>


