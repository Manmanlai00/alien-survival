/* 新手任务面板：右上角浮动，链式显示当前引导任务，完成时高亮 + 日志发奖 */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.QuestPanel = {
  template: `
    <div v-if="active && !allDone" class="quest-panel" :class="{ flash: ui.questJustDone }">
      <div class="quest-head">
        <span class="quest-label">📋 新手引导 {{ doneCount }}/{{ total }}</span>
        <button class="quest-toggle" @click="collapsed = !collapsed">{{ collapsed ? '展开 ▾' : '收起 ▴' }}</button>
      </div>
      <div v-if="!collapsed" class="quest-body">
        <div class="quest-title">{{ active.title }}</div>
        <div class="quest-desc">{{ active.desc }}</div>
        <div v-if="active.rewardText" class="quest-reward">奖励：{{ active.rewardText }}</div>
      </div>
    </div>
  `,
  setup() {
    const S = window.GAME.store
    const D = window.GAME.data
    const { computed, ref } = Vue
    const collapsed = ref(false)
    const total = computed(() => (D.def && D.def.NEWBIE_QUESTS ? D.def.NEWBIE_QUESTS.length : 0))
    const doneCount = computed(() => Object.keys(S.player.quests || {}).filter((k) => S.player.quests[k]).length)
    // 当前引导任务：链上第一个未完成项
    const active = computed(() => {
      const qs = (D.def && D.def.NEWBIE_QUESTS) || []
      for (const q of qs) if (!(S.player.quests || {})[q.id]) return q
      return null
    })
    const allDone = computed(() => total.value > 0 && doneCount.value >= total.value)
    return { ui: S.ui, active, doneCount, total, allDone, collapsed }
  },
}
