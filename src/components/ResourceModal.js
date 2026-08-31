/* 库存弹窗：资源背包（含资源统计） */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.ResourceModal = {
  template: `
    <div v-if="ui.modal === 'resource'" class="modal-overlay">
      <div class="modal-box">
        <div class="modal-head">
          <h3>库存 · 资源背包</h3>
          <button class="btn cancel modal-close" @click="closeModal">关闭</button>
        </div>
        <div class="inv-stats">星之记忆 {{ player.data }} · 负重 {{ carryLoad }}/{{ carryLimit }}</div>
        <div class="modal-title">资源物品（点击使用，菌丝块/盐水可食饮）</div>
        <div class="inv-grid">
          <button
            v-for="g in groups"
            :key="g.key"
            class="inv-cell"
            :title="g.def.desc"
            @click="useResource(g.id)"
          >
            <span class="inv-cell-count">×{{ g.count }}</span>
            <span class="inv-cell-name" :class="g.rarity ? 'rarity-' + g.rarity : ''">{{ g.rarity ? g.rarity + '·' + g.def.name : g.def.name }}</span>
            <span v-if="useText(g.id)" class="inv-cell-effect">{{ useText(g.id) }}</span>
            <span v-else class="inv-cell-effect craft-only">制作材料</span>
          </button>
          <div v-if="groups.length === 0" class="empty">资源背包空空如也，去探索采集吧</div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const S = window.GAME.store
    const D = window.GAME.data
    const { computed } = Vue
    const groups = computed(() => {
      const m = {}
      for (const r of S.inventory.resources) {
        if (!r.def.material) continue
        const key = r.rarity ? r.id + '|' + r.rarity : r.id
        m[key] = m[key] || { key, id: r.id, def: r.def, count: 0, rarity: r.rarity || '' }
        m[key].count++
      }
      return Object.values(m)
    })
    const carryLoad = computed(() => S.getCarryLoad())
    const carryLimit = computed(() => S.getCarryLimit())
    return {
      ui: S.ui,
      player: S.player,
      closeModal: S.closeModal,
      groups,
      carryLoad,
      carryLimit,
      useResource: S.useResource,
      useText: D.itemUseText,
    }
  },
}
