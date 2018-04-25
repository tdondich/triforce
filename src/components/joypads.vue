<template>
    <div>
        <h4>Input: Player 1</h4>
        <select v-model="selectedGamepad">
            <option v-for="(name, index) in gamepads" :value="index">{{name}}</option>
        </select>
        <table class="table">
            <thead>
                <tr>
                    <th>Up</th>
                    <th>Down</th>
                    <th>Left</th>
                    <th>Right</th>
                    <th>A</th>
                    <th>B</th>
                    <th>Start</th>
                    <th>Select</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>{{one.up}}</td>
                    <td>{{one.down}}</td>
                    <td>{{one.left}}</td>
                    <td>{{one.right}}</td>
                    <td>{{one.a}}</td>
                    <td>{{one.b}}</td>
                    <td>{{one.start}}</td>
                    <td>{{one.select}}</td>
                </tr>
            </tbody>
        </table>
        <h4>Input: Player 2</h4>
        <table class="table">
            <thead>
                <tr>
                    <th>Up</th>
                    <th>Down</th>
                    <th>Left</th>
                    <th>Right</th>
                    <th>A</th>
                    <th>B</th>
                    <th>Start</th>
                    <th>Select</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>{{two.up}}</td>
                    <td>{{two.down}}</td>
                    <td>{{two.left}}</td>
                    <td>{{two.right}}</td>
                    <td>{{two.a}}</td>
                    <td>{{two.b}}</td>
                    <td>{{two.start}}</td>
                    <td>{{two.select}}</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script>

function isBitSet(value, index) {
  let mask = 1 << index;
  return (value & mask) != 0;
}

export default {
  props: [
      "title",
      "config"
  ],
  data: function() {
    return {
        gamepads: {
            'keyboard': 'Keyboard'
        },
        selectedGamepad: 'keyboard',
        one: {
            a: 0x00,
            b: 0x00,
            select: 0x00,
            start: 0x00,
            up: 0x00,
            down: 0x00,
            left: 0x00,
            right: 0x00,
            streamPointer: 0
        },
        two: {
            a: 0x00,
            b: 0x00,
            select: 0x00,
            start: 0x00,
            up: 0x00,
            down: 0x00,
            left: 0x00,
            right: 0x00,
            streamPointer: 0
        },
      // These are flags for the "stream" of input data
      initPhase: 0
    };
  },
  mounted() {
      window.addEventListener("gamepadconnected", (e) => {
        console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
            e.gamepad.index, e.gamepad.id,
            e.gamepad.buttons.length, e.gamepad.axes.length);

        // Add the gamepads
        this.$set(this.gamepads, e.gamepad.index, e.gamepad.id);
      });
      window.addEventListener("keydown", (event) => {
          // Handle player 1
          if(this.selectedGamepad == 'keyboard') {
            if(event.keyCode in this.config.one) {
                this.one[this.config.one[event.keyCode]] = 0x01;
                event.preventDefault();
            } else if(event.keyCode in this.config.two) {
                // Handle Player 2
                this.two[this.config.two[event.keyCode]] = 0x01;
                event.preventDefault();
            }
          }
      });
      window.addEventListener("keyup", () => {
           // Handle player 1
           if(this.selectedGamepad == 'keyboard') {
            if(event.keyCode in this.config.one) {
                this.one[this.config.one[event.keyCode]] = 0x00;
                event.preventDefault();
            } else if(event.keyCode in this.config.two) {
                // Handle Player 2
                this.two[this.config.two[event.keyCode]] = 0x00;
                event.preventDefault();
            }
           }
     });

  },
  methods: {
    resolveWrite(address) {
      return (value) => {
        this.set(address, value);
      };
    },
    resolveRead(address) {
      return () => {
        return this.get(address);
      };
    },
    // These are meant to only handle one "address"
    // Ignore address parameter, we only deal with one address
    // @todo Properly implement open bus behavior
    get: function(address) {
        // Default to player 1
        let node = this.one;
        if(address == 0x01) {
            // player two
            node = this.two;
        }
        if(this.initPhase == 1) {
            // Always send the status of the first button 'A'
            return (0b01000000 | node.a);
            
        }
        if(this.initPhase == 2) {
           // Valid phase, let's stream serialize data
            let pointer = node.streamPointer;
            // Increment before our return
            // But only if we're not in debug mode
            if(!this.$parent.$refs.cpu.inDebug) {
                node.streamPointer = node.streamPointer + 1;
            }
            let value = 0x01;
            switch(pointer) {
                case 0:
                    value = node.a;
                    break;
                case 1:
                    value = node.b;
                    break;
                case 2:
                    value = node.select;
                    break;
                case 3:
                    value = node.start;
                    break;
                case 4:
                    value = node.up;
                    break;
                case 5:
                    value = node.down;
                    break;
                case 6:
                    value = node.left;
                    break;
                case 7:
                    value = node.right;
                    break;
            }
            return (0b01000000 | value);
        }
        return (0b01000000 | 0x01);
    },
    set: function(address, value) {
        if(address == 0x00) {
            if(isBitSet(value, 0)) {
                this.initPhase = 1;
            } else if(!isBitSet(value, 0) && this.initPhase == 1) {
                this.initPhase = 2;
                // Reset input stream pointer
                this.one.streamPointer = 0;
                this.two.streamPointer = 0;
            }
        }
    },
    tick: function() {
        // Scans the gamepads for keypresses
        if(this.selectedGamepad != 'keyboard') {
            // Scan our gamepad
            let pad = navigator.getGamepads()[this.selectedGamepad];
            // This is right
            this.one.right = pad.axes[0] > 0.5 ? 0x01 : 0x00;
            this.one.left = pad.axes[0] < -0.5 ? 0x01: 0x00;
            this.one.down = pad.axes[1] > 0.5 ? 0x01 : 0x00;
            this.one.up = pad.axes[1] < -0.5 ? 0x01: 0x00;
            this.one.a = pad.buttons[1].pressed ? 0x01: 0x00;
            this.one.b = pad.buttons[0].pressed ? 0x01: 0x00;
            this.one.select = pad.buttons[8].pressed ? 0x01: 0x00;
            this.one.start = pad.buttons[9].pressed ? 0x01: 0x00;

        }

    }
  }
};
</script>

<style lang="scss" scoped>

</style>
