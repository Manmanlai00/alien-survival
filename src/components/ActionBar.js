/* 底部操作栏：小方块入口按钮，点击打开对应弹窗 */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.ActionBar = {
  template: `
    <div class="action-bar">
      <button
        v-for="b in buttons"
        :key="b.id"
        class="sq-btn"
        :class="b.cls"
        @click="openModal(b.id)"
      >
        <span class="sq-ico">{{ b.ico }}</span>
        <span class="sq-label">{{ b.label }}</span>
      </button>
    </div>
  `,
  setup() {
    const S = window.GAME.store
    const buttons = [
      { id: 'map', ico: '图', label: '地图', cls: 'sq-map' },
      { id: 'bestiary', ico: '鉴', label: '图鉴', cls: 'sq-bestiary' },
      { id: 'resource', ico: '箱', label: '库存', cls: 'sq-resource' },
      { id: 'items', ico: '具', label: '道具', cls: 'sq-items' },
      { id: 'research', ico: '研', label: '研究', cls: 'sq-research' },
      { id: 'craft', ico: '制', label: '制作', cls: 'sq-craft' },
      { id: 'ability', ico: '能', label: '能力', cls: 'sq-ability' },
      { id: 'deck', ico: '牌', label: '牌库', cls: 'sq-deck' },
      { id: 'body', ico: '体', label: '躯体', cls: 'sq-body' },
      { id: 'tutorial', ico: '教', label: '教程', cls: 'sq-tutorial' },
    ]
    return {
      buttons,
      openModal: S.openModal,
    }
  },
}
