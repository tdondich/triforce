<template>
    <div>
        <h4>Input: Player 1</h4>
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
      window.addEventListener("keydown", (event) => {
          // Handle player 1
          if(event.keyCode in this.config.one) {
              this.one[this.config.one[event.keyCode]] = 0x01;
              event.preventDefault();
          } else if(event.keyCode in this.config.two) {
              // Handle Player 2
              this.two[this.config.two[event.keyCode]] = 0x01;
              event.preventDefault();
          }
      });
      window.addEventListener("keyup", () => {
           // Handle player 1
          if(event.keyCode in this.config.one) {
              this.one[this.config.one[event.keyCode]] = 0x00;
              event.preventDefault();
          } else if(event.keyCode in this.config.two) {
              // Handle Player 2
              this.two[this.config.two[event.keyCode]] = 0x00;
              event.preventDefault();
          }
     });

  },
  methods: {
    // These are meant to only handle one "address"
    // Ignore address parameter, we only deal with one address
    get: function(address) {
        if(this.initPhase == 2) {
            // Default to player 1
            let node = this.one;
            if(address == 0x01) {
                // player two
                node = this.two;
            }
            // Valid phase, let's stream serialize data
            let pointer = node.streamPointer;
            // Increment before our return
            // But only if we're not in debug mode
            if(!this.$parent.$refs.cpu.inDebug) {
                node.streamPointer = node.streamPointer + 1;
            }
            switch(pointer) {
                case 0:
                    return node.a;
                case 1:
                    return node.b;
                case 2:
                    return node.select;
                case 3:
                    return node.start;
                case 4:
                    return node.up;
                case 5:
                    return node.down;
                case 6:
                    return node.left;
                case 7:
                    return node.right;
            }
            return 0x01;
        }
        return 0x01;
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
    }
  }
};
</script>

<style lang="scss" scoped>

</style>
