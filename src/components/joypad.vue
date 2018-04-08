<template>
    <div>
        <h4>Input: {{this.title}}</h4>

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
                    <td>{{up}}</td>
                    <td>{{down}}</td>
                    <td>{{left}}</td>
                    <td>{{right}}</td>
                    <td>{{a}}</td>
                    <td>{{b}}</td>
                    <td>{{start}}</td>
                    <td>{{select}}</td>
                </tr>
            </tbody>
        </table>

    </div>
</template>

<script>
export default {
  props: [
      "title",
      "config"
  ],
  data: function() {
    return {
      a: 0x00,
      b: 0x00,
      select: 0x00,
      start: 0x00,
      up: 0x00,
      down: 0x00,
      left: 0x00,
      right: 0x00,

      // These are flags for the "stream" of input data
      initPhase: 0,
      streamPointer: 0,
    };
  },
  mounted() {
      window.addEventListener("keydown", (event) => {
          if(event.keyCode in this.config) {
              this[this.config[event.keyCode]] = 0x01;
              event.preventDefault();
          }
      });
      window.addEventListener("keyup", () => {
          if(event.keyCode in this.config) {
              this[this.config[event.keyCode]] = 0x00;
              event.preventDefault();
          }
      });

  },
  methods: {
    // These are meant to only handle one "address"
    // Ignore address parameter, we only deal with one address
    get: function() {
        if(this.initPhase == 2 && this.streamPointer < 8) {
            // Valid phase, let's stream serialize data
            let pointer = this.streamPointer;
            // Increment before our return
            this.streamPointer = this.streamPointer + 1;
            switch(pointer) {
                case 0:
                    return this.a;
                case 1:
                    return this.b;
                case 2:
                    return this.select;
                case 3:
                    return this.start;
                case 4:
                    return this.up;
                case 5:
                    return this.down;
                case 6:
                    return this.left;
                case 7:
                    return this.right;

            }
        }
        return 0x01;

    },
    set: function(address, value) {
        if(value == 0x01) {
            this.initPhase = 1;
        } else if(value == 0x00 && this.initPhase == 1) {
            this.initPhase = 2;
            // Reset input stream pointer
            this.streamPointer = 0;
        } else {
            // Should never be anything other than 1 or 0
            this.initPhase = 0;
        }
    }
  }
};
</script>

<style lang="scss" scoped>

</style>
