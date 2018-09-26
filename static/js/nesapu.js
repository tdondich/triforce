// This is our lookup table for determining length values
// See: https://wiki.nesdev.com/w/index.php/APU_Length_Counter
let lengthLookupMap = {
    // Linear length values:
    0x1F: 30,
    0x1D: 28,
    0x1B: 26,
    0x19: 24,
    0x17: 22,
    0x15: 20,
    0x13: 18,
    0x11: 16,
    0x0F: 14,
    0x0D: 12,
    0x0B: 10,
    0x09: 8,
    0x07: 6,
    0x05: 4,
    0x03: 2,
    0x01: 254,
    // Notes with base length 12 (4/4 at 75 bpm)
    0x1E: 32,
    0x1C: 16,
    0x1A: 72,
    0x18: 192,
    0x16: 96,
    0x14: 48,
    0x12: 24,
    0x10: 12,
    // Notes with base length 10
    0x0E: 26,
    0x0C: 14,
    0x0A: 60,
    0x08: 160,
    0x06: 80,
    0x04: 40,
    0x02: 20,
    0x00: 10
}

let baseFrequency = 1789772.7; // Hz

Vue.component('apu', {
    data: function () {
        return {
            debugView: false
        }
    },
    created() {
        this.debug = false,
        // Our Web Audio Context
        this.context = null,
        // Mode will be either 0 (4-step) or 1 (5-step)
        this.mode = 0,
        this.IRQInhibit = false,
        // Step designated what step to keep track in the frame counter (mode determines how many steps to perform)
        this.step = 0,
        this.tickCounter = 0,
        this.channels = {
            pulse1: {
                // Pulse 1
                envelope: 0,
                length: 0,
                haltLength: false,
                timer: 0,
                node: null
            },
            pulse2: {
                // Pulse 2
                envelope: 0,
                length: 0,
                haltLength: false,
                timer: 0,
                node: null

            },
            triangle: {
                // Triangle
                envelope: 0,
                length: 0,
                haltLength: false,
                linear: 0,
                timer: 0,
                node: null
            },
            noise: {
                // Noise
                envelope: 0,
                length: 0,
                haltLength: false
            },
            delta: {
                // Delta
            }
        };
    },
    mounted() {
        // Create our nodes
        this.context = new AudioContext();
        // Create our pulse1 oscillator
        this.channels.pulse1.node = this.context.createOscillator();
        this.channels.pulse1.node.type = 'square';
        this.channels.pulse1.node.connect(this.context.destination);
        // Start the oscillator
        // Set oscillator to a too high frequency
        this.channels.pulse1.node.frequency.value = 5000000;
        //this.channels.pulse1.node.start();

        this.channels.pulse2.node = this.context.createOscillator();
        this.channels.pulse2.node.type = 'square';
        this.channels.pulse2.node.connect(this.context.destination);
        // Start the oscillator
        // Set oscillator to a too high frequency
        this.channels.pulse2.node.frequency.value = 5000000;
        //this.channels.pulse2.node.start();
        // Setup the triangle
        this.channels.triangle.node = this.context.createOscillator();
        this.channels.triangle.node.type = 'triangle';
        this.channels.triangle.node.connect(this.context.destination);
        // Start the oscillator
        // Set oscillator to a too high frequency
        this.channels.triangle.node.frequency.value = 5000000;
        //this.channels.triangle.node.start();

    },
    methods: {
        resetFrame() {
            this.tickCounter = 0;
        },
        handleStep() {
            if (this.mode) {
                // 4 step
                // Decrement envelope and linear counters
                // This is done on every "step"
                if (this.channels.pulse1.envelope) {
                    this.channels.pulse1.envelope--;
                }
                if (this.channels.pulse2.envelope) {
                    this.channels.pulse2.envelope--;
                }
                if (this.channels.triangle.envelope) {
                    this.channels.triangle.envelope--;
                }
                if (this.channels.noise.envelope) {
                    this.channels.noise.envelope--;
                }
                if (this.channels.triangle.linear) {
                    this.channels.triangle.linear--;
                }
                if (this.step == 1 || this.step == 3) {
                    if (!this.channels.pulse1.haltLength && this.channels.pulse1.length) {
                        this.channels.pulse1.length--;
                    }
                    if (!this.channels.pulse2.haltLength && this.channels.pulse2.length) {
                        this.channels.pulse2.length--;
                    }
                    if (!this.channels.triangle.haltLength && this.channels.triangle.length) {
                        this.channels.triangle.length--;
                    }
                    if (!this.channels.noise.haltLength && this.channels.noise.length) {
                        this.channels.noise.length--;
                    }
                    if ((!this.IRQInhibit) && this.step == 3) {
                        this.$parent.$refs.cpu.fireIRQ();
                    }
                }
                this.step++;
                // Check for out of bounds then reset to step
                if (this.step == 4) {
                    this.step = 0;
                }
                return;
            } else {
                // We're in 5 steps
                // But we don't technically do anything on step 5
                if (this.step <= 3) {
                    // Decrement envelope and linear counters
                    if (this.channels.pulse1.envelope) {
                        this.channels.pulse1.envelope--;
                    }
                    if (this.channels.pulse2.envelope) {
                        this.channels.pulse2.envelope--;
                    }
                    if (this.channels.triangle.envelope) {
                        this.channels.triangle.envelope--;
                    }
                    if (this.channels.noise.envelope) {
                        this.channels.noise.envelope--;
                    }
                    if (this.channels.triangle.linear) {
                        this.channels.triangle.linear--;
                    }
                    if (this.step == 0 || this.step == 2) {
                        if (!this.channels.pulse1.haltLength && this.channels.pulse1.length) {
                            this.channels.pulse1.length--;
                        }
                        if (!this.channels.pulse2.haltLength && this.channels.pulse2.length) {
                            this.channels.pulse2.length--;
                        }
                        if (!this.channels.triangle.haltLength && this.channels.triangle.length) {
                            this.channels.triangle.length--;
                        }
                        if (!this.channels.noise.haltLength && this.channels.noise.length) {
                            this.channels.noise.length--;
                        }
                    }
                }
                this.step++;
                // Check for out of bounds then reset to step
                if (this.step == 5) {
                    this.step = 0;
                }
                return;
            }
        },
        tick() {
            // We run at 4 times per frame
            if (this.tickCounter == 6848 || this.tickCounter == 13696 || this.tickCounter == 20544 || this.tickCounter == 0) {
                this.handleStep();
            }
            this.tickCounter++;
        },
        set(address, value, bus = 'default') {
            // Do nothing for now
            if (bus == 'snd_chn') {
                //console.log("Wrote to snd_chn register");
                return;
            }
            switch (address) {
                case 0x0000:
                    // Set halt length if bit 5
                    this.channels.pulse1.haltLength = value & 0x00100000 ? true : false;
                    break;
                case 0x0002:
                    // Sets timer low for pulse 1
                    this.channels.pulse1.timer = this.channels.pulse1.timer | value;
                    this.channels.pulse1.node.frequency.value = baseFrequency / (16 * (this.channels.pulse1.timer + 1))
                    break;
                case 0x0003:
                    // Handles pulse1 length counter load and timer
                    this.channels.pulse1.length = lengthLookupMap[value >>> 3];
                    // Also write the last 3 bytes into pulse1.timer
                    // Unset the bits
                    this.channels.pulse1.timer = this.channels.pulse1.timer & 0b00011111111;
                    // Now OR the high bits of timer based on value
                    this.channels.pulse1.timer = this.channels.pulse1.timer | (value & 0x0b111) << 8;
                    this.channels.pulse1.node.frequency.value = baseFrequency / (16 * (this.channels.pulse1.timer + 1))
                    break;
                case 0x0004:
                    // Set halt length if bit 5
                    this.channels.pulse2.haltLength = value & 0x00100000 ? true : false;
                    break;

                case 0x0006:
                    // Sets timer low for pulse 2
                    this.channels.pulse2.timer = this.channels.pulse1.timer | value;
                    this.channels.pulse2.node.frequency.value = baseFrequency / (16 * (this.channels.pulse2.timer + 1))

                    break;
                case 0x0007:
                    // Handles pulse2 length counter load and timer
                    this.channels.pulse2.length = lengthLookupMap[value >>> 3];
                    // Also write the last 3 bytes into pulse2.timer
                    // Unset the bits
                    this.channels.pulse2.timer = this.channels.pulse2.timer & 0b00011111111;
                    // Now OR the high bits of timer based on value
                    this.channels.pulse2.timer = this.channels.pulse2.timer | (value & 0x0b111) << 8;
                    this.channels.pulse2.node.frequency.value = baseFrequency / (16 * (this.channels.pulse2.timer + 1))
                    break;
                case 0x0008:
                    // Set halt length if bit 7 is set
                    this.channels.triangle.haltLength = value & 0x10000000 ? true : false;
                    break;
                case 0x000A:
                    // Sets timer low for triangle
                    this.channels.triangle.timer = this.channels.pulse1.timer | value;
                    this.channels.triangle.node.frequency.value = baseFrequency / (16 * (this.channels.triangle.timer + 1))
                    break;
                case 0x000B:
                    // Handles triangle length counter load and timer
                    this.channels.triangle.length = lengthLookupMap[value >>> 3];
                    // Also write the last 3 bytes into triangle.timer
                    // Unset the bits
                    this.channels.triangle.timer = this.channels.triangle.timer & 0b00011111111;
                    // Now OR the high bits of timer based on value
                    this.channels.triangle.timer = this.channels.triangle.timer | (value & 0x0b111) << 8;
                    this.channels.triangle.node.frequency.value = baseFrequency / (16 * (this.channels.triangle.timer + 1))
                    break;
            }
            this.$refs.registers.set(address, value);
        },
        get(address) {
            // Do nothing
            this.$refs.registers.get(address);
        },
        writeToFrameCounter(value) {
            // Check if bit 7 is set
            this.mode = value & 0b10000000 ? 1 : 0;
            this.IRQInhibit = value & 0b01000000 ? true : false;
            // Reset our frame trigger
            this.step = 0;
        }
    },
    template: `<div>        <memory ref="registers" size="32" />
</div>`,
    /*
    template2: `
        <div>
        <h2>NES APU</h2>
        <strong>Mode: {{mode}}</strong>
        <strong>IRQInhibit: {{IRQInhibit}}</strong>
        <strong>Step: {{step}}</strong>

        <table class="table table-bordered">
        <tr>
        <td>
        <h2>Pulse 1</h2>
        <table>
            <tr>
                <td>Envelope</td><td>{{this.channels.pulse1.envelope}}</td>
            </tr>
            <tr>
                <td>Length</td><td>{{this.channels.pulse1.length}}</td>
            </tr>
            <tr>
                <td>Halt Length Counter</td><td>{{this.channels.pulse1.haltLength}}</td>
            </tr>
            <tr>
                <td>Frequency</td><td>{{this.channels.pulse1.node.frequency.value}}</td>
            </tr>
            <tr>
                <td>Timer</td><td>{{this.channels.pulse1.timer}}</td>
            </tr>
        </table>
        </td>
        <td>
        <h2>Pulse 2</h2>
        <table>
            <tr>
                <td>Envelope</td><td>{{this.channels.pulse2.envelope}}</td>
            </tr>
            <tr>
                <td>Length</td><td>{{this.channels.pulse2.length}}</td>
            </tr>
            <tr>
                <td>Halt Length Counter</td><td>{{this.channels.pulse2.haltLength}}</td>
            </tr>
            <tr>
                <td>Frequency</td><td>{{this.channels.pulse2.node.frequency.value}}</td>
            </tr>
            <tr>
                <td>Timer</td><td>{{this.channels.pulse2.timer}}</td>
            </tr>

        </table>
        </td>
        <td>
        <h2>Triangle</h2>
        <table>
            <tr>
                <td>Envelope</td><td>{{this.channels.triangle.envelope}}</td>
            </tr>
            <tr>
                <td>Length</td><td>{{this.channels.triangle.length}}</td>
            </tr>
            <tr>
                <td>Halt Length Counter</td><td>{{this.channels.triangle.haltLength}}</td>
            </tr>
            <tr>
                <td>Linear</td><td>{{this.channels.triangle.linear}}</td>
            </tr>
            <tr>
                <td>Frequency</td><td>{{this.channels.triangle.node.frequency.value}}</td>
            </tr>
            <tr>
                <td>Timer</td><td>{{this.channels.triangle.timer}}</td>
            </tr>

        </table>
        </td>
        <td>
        <h2>Noise</h2>
        <table>
            <tr>
                <td>Envelope</td><td>{{this.channels.noise.envelope}}</td>
            </tr>
            <tr>
                <td>Length</td><td>{{this.channels.noise.length}}</td>
            </tr>
            <tr>
                <td>Halt Length Counter</td><td>{{this.channels.noise.haltLength}}</td>
            </tr>
        </table>
        </td>
        <td>
        <h2>Delta</h2>
        <table>
        </table>
        </td>


        </tr>
        </table>
        <memory ref="registers" size="32" />
        </div>

    `
    */
});