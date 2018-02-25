<template>
  <div id="app" class="container">

    <h1>NES Emulator in Vue.js</h1>
    <cpu-2a03 ref="cpu" />
    <!-- Bring in our memory component -->
    <memory size="0xffff" ref="memory" />
  </div>
</template>

<script>
import cpu2a03 from './components/cpu-2a03.vue'
import memory from './components/memory.vue';

export default {
  name: 'app',
  components: {
    'cpu-2a03': cpu2a03,
    'memory': memory
  }
}
</script>

<style lang="sass">
@import '~bootstrap/scss/bootstrap.scss';

</style>
