/* 抉择事件弹窗：多选项决策，属性判定影响结果 */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.ChoiceModal = {
  template: `
    <div v-if="ui.choiceEvent" class="modal-overlay">
      <div class="modal-box choice-box">
        <div class="modal-head">
          <h3>抉择 · {{ ui.choiceEvent.title }}</h3>
          <button class="btn cancel modal-close" @click="close">关闭</button>
        </div>
        <div class="choice-text">{{ ui.choiceEvent.text }}</div>
        <div class="choice-list">
          <button v-for="(c, i) in ui.choiceEvent.choices" :key="i" class="choice-btn" @click="resolve(i)">
            <span class="choice-label">{{ c.label }}</span>
            <span class="choice-desc">{{ c.text }}</span>
            <span v-if="c.costText" class="choice-cost">{{ c.costText }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  setup() {
    const S = window.GAME.store
    return {
      ui: S.ui,
      resolve: S.resolveChoice,
      close: () => { S.ui.choiceEvent = null; if (window.GAME.sound) window.GAME.sound.close() },
    }
  },
}
