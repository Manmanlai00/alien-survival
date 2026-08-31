/* 日志：最新在最下，新内容自动滚动到底部 */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.LogPanel = {
  template: `
    <div class="log-panel" ref="panelEl">
      <div v-for="(line, i) in log.lines" :key="i" class="log-line">{{ line }}</div>
    </div>
  `,
  setup() {
    const log = window.GAME.store.log
    const { ref, watch } = Vue
    const panelEl = ref(null)
    // 有新日志时自动滚动到底部（展示最新内容）
    watch(
      () => log.lines.length,
      () => {
        Vue.nextTick(() => {
          if (panelEl.value) panelEl.value.scrollTop = panelEl.value.scrollHeight
        })
      }
    )
    return { log, panelEl }
  },
}
