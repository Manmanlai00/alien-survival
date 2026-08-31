/* 研究系统弹窗：生物研究 + 研究升级（制作式 UI：分类 tab + 方块 + 悬停提示） */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.ResearchModal = {
  template: `
    <div v-if="ui.modal === 'research'" class="modal-overlay">
      <div class="modal-box research-box">
        <div class="modal-head">
          <h3>研究系统</h3>
          <span class="modal-sub">星之记忆 {{ player.data }}</span>
          <button class="btn cancel modal-close" @click="closeModal">关闭</button>
        </div>
        <div class="research-actions">
          <button class="btn research research-main" @click="onResearchAction">
            生物研究（{{ C.RESEARCH_TIME }}时间 → 星之记忆+{{ gainText }}）
          </button>
        </div>
        <div class="cat-tabs">
          <button
            v-for="c in RESEARCH_CATS"
            :key="c.key"
            class="cat-tab"
            :class="{ on: curCat === c.key }"
            @click="curCat = c.key"
          >{{ c.name }}</button>
        </div>
        <div class="recipe-grid">
          <div
            v-for="id in shownResearch"
            :key="id"
            class="recipe-tile"
            :class="{ disabled: cost(id) < 0 }"
            @click="onResearch(id)"
            @mouseenter="hovered = id"
            @mouseleave="hovered = null"
          >{{ name(id) }}</div>
        </div>
        <div v-if="hoverTip" class="recipe-tip">
          <div class="tip-title">{{ hoverTip.def.name }}</div>
          <div class="tip-line">{{ hoverTip.def.desc }}</div>
          <div class="tip-line effect">{{ hoverTip.rankText }}</div>
          <div class="tip-line out">{{ hoverTip.costText }}</div>
          <div class="tip-hint">{{ hoverTip.done ? '该研究已达上限' : '点击研究（' + C.UPGRADE_TIME + '时间）' }}</div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const S = window.GAME.store
    const D = window.GAME.data
    const C = D.C
    const { ref, computed } = Vue
    // 研究分类硬编码 id 列表；cell/circuit/metabolism/resonance 四类等级按"属性数值换算"而非 upg 记录，修改需与 store.js 的 researchCost 同步
    const RESEARCH_CATS = [
      { key: 'body', name: '体质', ids: ['cell', 'circuit', 'metabolism', 'resilient', 'density', 'immune', 'stomach', 'hydrate', 'vein', 'tough', 'vital', 'restful'] },
      { key: 'combat', name: '战斗', ids: ['muscle', 'regenerate', 'focus', 'opening', 'crit', 'vamp', 'thorns', 'guard', 'reflex', 'ferocity', 'prepare', 'tactics'] },
      { key: 'survive', name: '生存', ids: ['resonance', 'sleep', 'forage', 'lung', 'absorb', 'insight', 'wander', 'quick', 'desert', 'coldproof', 'thermal', 'bunk', 'probe', 'herb', 'scavenge', 'hunter', 'sprint', 'meditate'] },
      { key: 'craft', name: '工艺', ids: ['cook', 'smelt', 'weave', 'alchemy', 'leather', 'bonecraft', 'crystalwork', 'glasswork', 'mechanism', 'masonry', 'botany', 'chemistry', 'sculpt'] },
      { key: 'ability', name: '能力', ids: ['aqua', 'flight', 'dig', 'symbiosis', 'organmaster', 'translate', 'echo'] },
      { key: 'eco', name: '生态', ids: [] },
    ]
    const curCat = ref('body')
    const shownResearch = computed(() => {
      if (curCat.value === 'eco') return Object.keys(D.ECO_SERIES).map((e) => 'eco_' + e)
      return (RESEARCH_CATS.find((c) => c.key === curCat.value) || RESEARCH_CATS[0]).ids
    })
    function cost(id) {
      return S.researchCost(id)
    }
    function name(id) {
      const def = D.RESEARCH_DEFS[id]
      return def ? def.name : id
    }
    // 当前等级文本；cell/circuit/metabolism/resonance 四类按"属性数值换算"而非 upg 记录，修改需与 store.js 的 researchCost 同步
    function rankText(id) {
      const def = D.RESEARCH_DEFS[id]
      if (!def) return ''
      if (def.maxRank > 1) {
        let rank = 0
        if (id === 'cell') rank = Math.floor(S.player.lifeBonus / 10)
        else if (id === 'circuit') rank = Math.floor(S.player.energyBonus / 2)
        else if (id === 'metabolism') rank = S.player.metabolismBonus > 0 ? 1 : 0
        else if (id === 'resonance') rank = S.player.maintReduction > 0 ? 1 : 0
        else rank = S.player.upg[id] || 0
        return rank >= def.maxRank ? '已达最高等级' : `等级 ${rank}/${def.maxRank}`
      }
      const done = cost(id) < 0
      return done ? '已完成' : '未研究'
    }
    const hovered = ref(null)
    const hoverTip = computed(() => {
      const id = hovered.value
      if (!id) return null
      const def = D.RESEARCH_DEFS[id]
      if (!def) return null
      const c = cost(id)
      return {
        def,
        rankText: rankText(id),
        costText: c < 0 ? '费用：已满' : `费用：${c} 星之记忆`,
        done: c < 0,
      }
    })
    const gainText = computed(() => C.RESEARCH_GAIN + (S.player.traits.researchGain || 0) + Math.floor((S.player.attrs.int || 0) / 5) + (S.player.upg.insight || 0))
    return {
      ui: S.ui,
      player: S.player,
      closeModal: S.closeModal,
      onResearchAction: S.onResearchAction,
      onResearch: S.onResearch,
      RESEARCH_CATS,
      curCat,
      shownResearch,
      cost,
      name,
      rankText,
      hovered,
      hoverTip,
      gainText,
      C,
    }
  },
}
