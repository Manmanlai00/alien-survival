/* 特殊事件弹窗：流星 / 气候等事件发生时说明内容 */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.EventNotice = {
  template: `
    <div v-if="ui.eventNotice" class="modal-overlay event-notice">
      <div class="modal-box event-notice-box">
        <div class="modal-head">
          <h3>{{ ui.eventNotice.title }}</h3>
          <button class="btn cancel modal-close" @click="closeEventNotice">知道了</button>
        </div>
        <div class="event-notice-body">{{ ui.eventNotice.text }}</div>
      </div>
    </div>
  `,
  setup() {
    const S = window.GAME.store
    return {
      ui: S.ui,
      closeEventNotice: S.closeEventNotice,
    }
  },
}
