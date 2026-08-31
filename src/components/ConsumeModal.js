/* 进食/饮水选择弹窗：列出背包中可食用/可饮用水，点击使用 */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.ConsumeModal = {
  template: `
    <div v-if="ui.modal === 'eat' || ui.modal === 'drink'" class="modal-overlay">
      <div class="modal-box">
        <div class="modal-head">
          <h3>{{ isEat ? '选择食物' : '选择饮水' }}</h3>
          <button class="btn cancel modal-close" @click="closeModal">关闭</button>
        </div>
        <div class="modal-title">{{ isEat ? '背包中的可食用物品（点击进食）' : '背包中的可饮用水（点击饮用）' }}</div>
        <div class="inv-row">
          <button
            v-for="g in groups"
            :key="g.id"
            class="card item-inv"
            :title="g.def.desc"
            @click="use(g.id)"
          >
            <div class="card-back">异</div>
            <div class="card-face">
              <div class="item-badges">
                <span class="card-count">×{{ g.count }}</span>
              </div>
              <div class="card-name">{{ g.def.name }}</div>
              <div class="card-desc">{{ g.def.desc }}</div>
              <div v-if="useText(g.id)" class="card-effect">效果：{{ useText(g.id) }}</div>
            </div>
          </button>
          <div v-if="groups.length === 0" class="empty">{{ isEat ? '背包里没有食物，去探索采集或制作吧' : '背包里没有水，去探索采集或制作吧' }}</div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const S = window.GAME.store
    const D = window.GAME.data
    const { computed } = Vue
    const isEat = computed(() => S.ui.modal === 'eat')
    const groups = computed(() => {
      const m = {}
      for (const r of S.inventory.resources) {
        if (!r.def.use) continue
        if (isEat.value ? !r.def.use.hunger : !r.def.use.thirst) continue
        m[r.id] = m[r.id] || { id: r.id, def: r.def, count: 0 }
        m[r.id].count++
      }
      return Object.values(m)
    })
    function use(id) {
      S.useResource(id)
      S.closeModal()
    }
    return {
      ui: S.ui,
      isEat,
      groups,
      use,
      useText: D.itemUseText,
      closeModal: S.closeModal,
    }
  },
}
