/* 营地基地弹窗：消耗材料建造/升级设施，每日自动产出资源 */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.BuildingModal = {
  template: `
    <div v-if="ui.modal === 'building'" class="modal-overlay">
      <div class="modal-box facility-box">
        <div class="modal-head">
          <h3>🏠 营地基地</h3>
          <span class="modal-sub">消耗材料建造并升级设施，每日自动产出（每日结束结算）</span>
          <button class="btn cancel modal-close" @click="closeModal">关闭</button>
        </div>
        <div class="facility-grid">
          <div v-for="(f, id) in FACILITIES" :key="id" class="facility-card" :class="{ built: facilityLevel(id) > 0 }">
            <div class="facility-name">{{ f.icon }} {{ f.name }}<span v-if="facilityLevel(id) > 0" class="facility-lv">Lv{{ facilityLevel(id) }}</span></div>
            <div class="facility-desc">{{ f.desc }}</div>
            <div class="facility-effect">{{ facilityEffect(f, id) }}</div>
            <div v-if="facilityLevel(id) === 0" class="facility-cost">
              <span v-for="(n, k) in f.cost" :key="k" class="cost-chip" :class="{ lack: !enough(k, n) }">{{ itemName(k) }}×{{ n }}</span>
            </div>
            <div v-else-if="upgCostText(f, id)" class="facility-cost">
              <span class="cost-chip">升级至 Lv{{ facilityLevel(id) + 1 }}</span>
              <span v-for="(n, k) in f.upgCost[facilityLevel(id) - 1]" :key="k" class="cost-chip" :class="{ lack: !enough(k, n) }">{{ itemName(k) }}×{{ n }}</span>
            </div>
            <div v-else class="facility-cost"><span class="cost-chip">已达最高等级</span></div>
            <div class="facility-action">
              <button v-if="facilityLevel(id) === 0" class="btn item-btn" :disabled="!canBuild(id)" @click="build(id)">建造</button>
              <button v-else-if="canUpgrade(id)" class="btn item-btn" @click="upgrade(id)">升级 ⤴</button>
              <span v-else class="facility-done">✓ 已建造</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const S = window.GAME.store
    const D = window.GAME.data
    const FACILITIES = D.FACILITIES
    function itemName(id) { return (D.ITEMS[id] && D.ITEMS[id].name) || id }
    function enough(id, n) { return S.resourceCount(id) >= n }
    function facilityLevel(id) { return S.facilityLevel(id) }
    function canBuild(id) { return S.canBuildFacility(id) }
    function build(id) { S.buildFacility(id) }
    function canUpgrade(id) { return S.canUpgradeFacility(id) }
    function upgrade(id) { S.upgradeFacility(id) }
    function upgCostText(f, id) {
      const lv = S.facilityLevel(id)
      return f.upgCost && f.upgCost[lv - 1]
    }
    function fmtDaily(d) {
      const p = []
      if (d.stamina) p.push(`耐力+${d.stamina}`)
      if (d.brine) p.push(`盐水+${d.brine}`)
      if (d.fungus) p.push(`菌丝块+${d.fungus}`)
      if (d.metal) p.push(`金属+${d.metal}`)
      if (d.data) p.push(`星忆+${d.data}`)
      return p.join('、')
    }
    function facilityEffect(f, id) {
      const lv = S.facilityLevel(id)
      const p = []
      if (f.special) {
        if (f.special.tameChance) p.push(`驯化概率+${Math.round(f.special.tameChance * 100)}%`)
        if (f.special.brewery) p.push('每日 1菌丝+1盐水 → 1菌酿')
        if (f.special.fort) p.push('夜袭/严寒伤害减半')
      }
      if (f.rest) {
        const cur = Array.isArray(f.rest) ? (lv ? f.rest[lv - 1] : f.rest[0]) : f.rest
        p.push(`休息耐力+${cur}`)
      }
      if (f.lv) {
        const cur = f.lv[Math.max(lv - 1, 0)] || {}
        const nxt = f.lv[lv] || null
        const ch = Array.isArray(f.chance) ? (f.chance[Math.max(lv - 1, 0)] || 1) : (f.chance || 1)
        p.push(`每日 ${fmtDaily(cur)}${ch < 1 ? '（' + Math.round(ch * 100) + '%）' : ''}`)
        if (nxt && lv < f.lv.length) p.push(`Lv${lv + 1}→${fmtDaily(nxt)}`)
      }
      return p.join('；')
    }
    return {
      ui: S.ui,
      closeModal: S.closeModal,
      FACILITIES,
      facilityLevel,
      itemName,
      enough,
      canBuild,
      build,
      canUpgrade,
      upgrade,
      upgCostText,
      facilityEffect,
    }
  },
}
