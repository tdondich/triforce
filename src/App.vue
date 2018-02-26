<template>
  <div id="app" class="container">

    <h1>NES Emulator in Vue.js</h1>
    <cpu-2a03 ref="cpu" />
    <!-- Bring in our memory component -->
    <memory size="65536" ref="memory" />
    <!-- Bring in our rom loader -->
    <rom-loader  ref="loader" />

  </div>
</template>

<script>
import cpu2a03 from './components/cpu-2a03.vue'
import memory from './components/memory.vue';
import romLoader from './components/rom-loader.vue';

export default {
  name: 'app',
  components: {
    'cpu-2a03': cpu2a03,
    'memory': memory,
    'rom-loader': romLoader
  }
}
</script>

<style lang="scss">
@import '~bootstrap/scss/bootstrap.scss';

body {
  padding-bottom: 32px;
}

</style>
