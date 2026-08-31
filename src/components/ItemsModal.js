/* 道具弹窗：物品栏（特殊道具与可交互工具） */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.ItemsModal = {
  template: `
    <div v-if="ui.modal === 'items'" class="modal-overlay">
      <div class="modal-box">
        <div class="modal-head">
          <h3>物品栏 · 特殊道具 / 工具</h3>
          <button class="btn cancel modal-close" @click="closeModal">关闭</button>
        </div>
        <div class="modal-title">点击使用道具</div>
        <div class="cat-tabs">
          <button
            v-for="c in availableCats"
            :key="c.key"
            class="cat-tab"
            :class="{ on: curCat === c.key }"
            @click="activeCat = c.key"
          >{{ c.name }}</button>
        </div>
        <div class="inv-row">
          <button
            v-for="g in shownItems"
            :key="g.id"
            class="card item-inv"
            :title="g.def.desc"
            @click="useResource(g.id)"
          >
            <div class="card-back">异</div>
            <div class="card-face">
              <div class="item-badges">
                <span class="card-count">×{{ g.count }}</span>
              </div>
              <div class="card-name">{{ g.def.name }}</div>
              <div class="card-desc">{{ g.def.desc }}</div>
              <div v-if="useText(g.id)" class="card-effect">效果：{{ useText(g.id) }}</div>
              <div v-else class="card-effect craft-only">制作材料</div>
            </div>
          </button>
          <div v-if="shownItems.length === 0" class="empty">该分类暂无道具</div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const S = window.GAME.store
    const D = window.GAME.data
    const { computed, ref } = Vue
    const catItems = computed(() => {
      const m = {}
      for (const r of S.inventory.resources) {
        if (r.def.material) continue
        m[r.id] = m[r.id] || { id: r.id, def: r.def, count: 0 }
        m[r.id].count++
      }
      return Object.values(m)
    })
    // 有物品的类别 tab
    const availableCats = computed(() => {
      const set = {}
      for (const g of catItems.value) set[D.itemCat(g.def)] = true
      return D.ITEM_CATS.filter((c) => set[c.key])
    })
    const activeCat = ref('')
    // 当前类别：activeCat 无效时回退到第一个有物品的类
    const curCat = computed(() => {
      const cats = availableCats.value
      return cats.some((c) => c.key === activeCat.value) ? activeCat.value : (cats[0] ? cats[0].key : '')
    })
    const shownItems = computed(() =>
      catItems.value.filter((g) => D.itemCat(g.def) === curCat.value)
    )
    return {
      ui: S.ui,
      closeModal: S.closeModal,
      availableCats,
      activeCat,
      curCat,
      shownItems,
      useResource: S.useResource,
      useText: D.itemUseText,
    }
  },
}
