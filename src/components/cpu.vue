<template>
  <div class="cpu">
    <div class="my-2 flex items-center">
        <div class="mr-2 font-bold">Force Reset Vector</div>
        <input class="px-4 py-2 rounded border border-grey"
          v-model="forceResetVector"
        >
    </div>

      <button
        class="btn btn-primary"
        v-if="!debugEnabled"
        @click="toggleDebug"
      >Enable CPU Debug Mode</button>
      <button
        class="btn btn-primary"
        v-else
        @click="toggleDebug"
      >Disable CPU Debug View</button>

    <div
      v-if="debugEnabled"
      class="col-sm-12"
    >
      <table class="w-full mt-2 bg-grey-darker font-mono border-grey">
        <tbody>
          <tr>
            <th class="p-1">A</th>
            <td class="p-1">{{a.toString(16).padStart(2, '0')}}</td>
            <th class="p-1">X</th>
            <td class="p-1">{{x.toString(16).padStart(2, '0')}}</td>
            <th class="p-1">Y</th>
            <td class="p-1">{{y.toString(16).padStart(2, '0')}}</td>
            <th class="p-1">PC</th>
            <td class="p-1">{{pc.toString(16).padStart(2, '0')}}</td>
            <th class="p-1">SP</th>
            <td class="p-1">{{sp.toString(16).padStart(2, '0')}}</td>
            <th class="p-1">P</th>
            <td class="p-1">{{p.toString(16).padStart(2, '0')}}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div
      class="alert alert-danger"
      v-if="error"
    >
      {{error}}
    </div>
    <div
      v-if="debugEnabled"
      class="col-sm-12 debug"
    >
      <textarea
        rows="5"
        class="w-full rounded-b border border-grey border-t-0"
        v-model="debug"
      ></textarea>
      <button
        class="btn mr-2"
        v-if="debugDownloadEnable"
        @click="toggleDownloadEnable"
      >Disable Debug Logging</button>
      <button
        class="btn mr-2"
        v-else
        @click="toggleDownloadEnable"
      >Enable Debug Logging</button>
      <button
        class="btn btn-primary"
        v-if="debugDownloadEnable"
        @click="downloadDebugLog"
      >Download Debug Log</button>

    </div>

    <!-- These are memory mapped registers -->
    <!-- See: https://wiki.nesdev.com/w/index.php/2A03 -->
    <memory class="mt-2"
      title="Registers $4000-$401F"
      ref="registers"
      size="32"
    />

  </div>

</template>

<script>
import { saveAs } from 'file-saver';

export default {
  name: 'cpu',
  mixins: [
    instructions,
    stx,
    ldx,
    lda,
    lsr,
    asl,
    ror,
    rol,
    sta,
    ora,
    and,
    eor,
    adc,
    cmp,
    sbc,
    ldy,
    sty,
    cpx,
    cpy,
    inc,
    dec,
    bit,
    nop,
    lax
  ],
  data: function() {
    // Our data represents our internal registers and processor flag
    return {
      debugX: 0,
      debugY: 0,
      debugA: 0,
      debugPC: 0,
      debugSP: 0,
      debugP: 0,

      // How the CPU should operate
      // Stepping means that the CPU should step through each operation instead of continuous run
      // This flag will show the CPU and debugged instructions
      debugEnabled: false,
      // Flag to collect debug data into our download buffer
      debugDownloadEnable: false,
      forceResetVector: "",
      debug: "",
      // If the CPU encountered a critical error
      error: ""
    };
  },
  created() {
  },
  mounted() {
  },
  computed: {
    debugOutput() {
      return this.debug.join("\n");
    }
  },

  methods: {
  },

};

</script>