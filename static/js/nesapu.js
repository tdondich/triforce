Vue.component('apu', {
    data: function () {
        return {
            // Mode will be either 0 (4-step) or 1 (5-step)
            mode: 0,
            IRQInhibit: false,
            // Step designated what step to keep track in the frame counter (mode determines how many steps to perform)
            step: 0,
            tickCounter: 0,
            channels: {
                pulse1: {
                    // Pulse 1
                    envelope: 0,
                    length: 0,
                    haltLength: false,
                },
                pulse2: {
                    // Pulse 2
                    envelope: 0,
                    length: 0,
                    haltLength: false,

                },
                triangle: {
                    // Triangle
                    envelope: 0,
                    length: 0,
                    haltLength: false,
                    linear: 0
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
            }
        }
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
                this.channels.pulse1.envelope--;
                this.channels.pulse2.envelope--;
                this.channels.triangle.envelope--;
                this.channels.noise.envelope--;
                this.channels.triangle.linear--;
                if(this.step == 1 || this.step == 3) {
                    this.channels.pulse1.length--;
                    this.channels.pulse2.length--;
                    this.channels.triangle.length--;
                    this.channels.noise.length--;
                    if((!this.IRQInhibit) && this.step == 3) {
                        this.$parent.$refs.cpu.fireIRQ();
                    }
                }
                this.step++;
                // Check for out of bounds then reset to step
                if(this.step == 4) {
                    this.step = 0;
                }
                return;
            } else {
                // We're in 5 steps
                // But we don't technically do anything on step 5
                if(this.step <= 3) {
                    // Decrement envelope and linear counters
                    this.channels.pulse1.envelope--;
                    this.channels.pulse2.envelope--;
                    this.channels.triangle.envelope--;
                    this.channels.noise.envelope--;
                    this.channels.triangle.linear--;
                    if(this.step == 0 || this.step == 2) {
                        this.channels.pulse1.length--;
                        this.channels.pulse2.length--;
                        this.channels.triangle.length--;
                        this.channels.noise.length--;
                    }
                }
                this.step++;
                // Check for out of bounds then reset to step
                if(this.step == 5) {
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
                console.log("Wrote to snd_chn register");
                return;
            }
            switch(address) {
                case 0x0000:
                    // Set halt length if bit 5
                    this.channels.pulse1.haltLength = value & 0x00100000 ? true : false;
                    break;
                case 0x0003:
                    // Handles pulse1 length counter load and timer
                    this.channels.pulse1.length = value >>> 3;
                    break;
                case 0x0004:
                    // Set halt length if bit 5
                    this.channels.pulse2.haltLength = value & 0x00100000 ? true : false;
                    break;
                case 0x0007:
                    // Handles pulse2 length counter load and timer
                    this.channels.pulse2.length = value >>> 3;
                    break;
                case 0x0008:
                    // Set halt length if bit 7 is set
                    this.channels.triangle.haltLength = value & 0x10000000 ? true : false;
                    break;
                case 0x000B:
                    // Handles triangle length counter load and timer
                    this.channels.triangle.length = value >>> 3;
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
    template: `
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
        </table>
        </td>

        </tr>
        </table>
        <memory ref="registers" size="32" />
        </div>

    `
});