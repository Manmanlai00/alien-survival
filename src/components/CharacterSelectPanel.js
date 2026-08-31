/* 开局角色选择 */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.CharacterSelectPanel = {
  template: `
    <div v-if="phase.state === 'select'" class="char-overlay">
      <div class="char-box">
        <h2>选择你的身份</h2>
        <p class="char-sub">你在这颗活物星球上醒来，一切都是活的，选择以何种姿态活下去……</p>
        <div class="char-grid">
          <button v-for="(def, id) in CHARACTERS" :key="id" class="char-card" @click="select(id)">
            <div class="char-name">{{ def.name }}<span v-if="hasSave(id)" class="char-saved">已有存档</span></div>
            <div class="char-desc">{{ def.desc }}</div>
            <div class="char-attrs">属性：力{{ def.attrs.str }} 敏{{ def.attrs.agi }} 体{{ def.attrs.con }} 智{{ def.attrs.int }}</div>
            <div v-if="panels[id]" class="char-panel">
              生命 {{ panels[id].maxLife }} · 耐力 {{ panels[id].maxEnergy }} · 负重 {{ panels[id].carryLimit }}
              <br />饥饿 {{ panels[id].maxHunger }} · 饥渴 {{ panels[id].maxThirst }}
            </div>
            <div class="char-items">{{ def.itemsDesc }}</div>
            <div class="char-ability">特殊能力「{{ def.ability.name }}」：{{ def.ability.desc }}</div>
            <div class="char-trait">{{ def.traitDesc }}</div>
            <div class="char-deck">初始卡组：{{ deckSummary(def) }}</div>
          </button>
        </div>
        <p v-if="hasSavedAny" class="char-saved-tip">带「已有存档」标记的角色将直接继续其存档；选择未存档角色开启新冒险</p>
      </div>
    </div>
  `,
  setup() {
    const S = window.GAME.store
    const D = window.GAME.data
    function deckSummary(def) {
      const cards = def.battleCards || []
      const m = {}
      for (const c of cards) m[c.name] = (m[c.name] || 0) + 1
      return Object.keys(m).map((k) => `${k}×${m[k]}`).join('、')
    }
    const hasSave = (id) => S.hasSave(id)
    const hasSavedAny = Object.keys(D.CHARACTER_DEFS).some((id) => S.hasSave(id))
    // 统一属性面板：由数据层 def.characterPanel 集中计算（生命/耐力/负重/饥饿/饥渴上限）
    const panels = Vue.computed(() => {
      const m = {}
      for (const id in D.CHARACTER_DEFS) m[id] = D.def.characterPanel(id)
      return m
    })
    return {
      phase: S.phase,
      player: S.player,
      CHARACTERS: D.CHARACTER_DEFS,
      select: S.selectCharacter,
      deckSummary,
      hasSave,
      hasSavedAny,
      panels,
    }
  },
}
