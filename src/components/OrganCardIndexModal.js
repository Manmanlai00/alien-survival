/* 器官卡牌图鉴弹窗：查看所有可采集器官的技能卡与遗物式光环，按星级筛选 */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.OrganCardIndexModal = {
  template: `
    <div v-if="ui.modal === 'organindex'" class="modal-overlay">
      <div class="modal-box cardindex-box">
        <div class="modal-head">
          <h3>器官卡牌图鉴</h3>
          <span class="modal-sub">全部可采集器官 · 共 {{ allOrgans.length }} 个</span>
          <button class="btn cancel modal-close" @click="closeModal">关闭</button>
        </div>
        <div class="cat-tabs">
          <button
            v-for="s in STAR_TABS"
            :key="s.value"
            class="cat-tab"
            :class="{ on: curStar === s.value }"
            @click="curStar = s.value"
          >{{ s.label }}</button>
        </div>
        <div class="cardindex-grid">
          <div v-for="o in shownOrgans" :key="o.id" class="cardindex-card" :class="'bdr-star-' + (o.star || 1)">
            <div class="ci-name">{{ o.name }}<span class="ci-star" :class="'star-' + (o.star || 1)">★{{ o.star || 1 }}</span></div>
            <div class="ci-cost">{{ typeTag(o) }} · 来源：{{ o.source }} · {{ o.slotName }}</div>
            <div class="ci-eff">{{ skillText(o) }}</div>
            <div v-if="auraText(o)" class="oi-aura">{{ auraText(o) }}</div>
          </div>
          <div v-if="shownOrgans.length === 0" class="empty">该星级暂无器官</div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const S = window.GAME.store
    const D = window.GAME.data
    const { ref, computed } = Vue
    const STAR_TABS = [
      { value: 0, label: '全部' },
      { value: 1, label: '★1 普通' },
      { value: 2, label: '★2 精良' },
      { value: 3, label: '★3 稀有' },
      { value: 4, label: '★4 史诗' },
      { value: 5, label: '★5 传说' },
    ]
    const curStar = ref(0)
    const allOrgans = computed(() => {
      const list = []
      for (const id in D.O || {}) list.push(D.O[id])
      return list
    })
    const shownOrgans = computed(() => (curStar.value === 0 ? allOrgans.value : allOrgans.value.filter((o) => o.star === curStar.value)))
    function typeTag(o) {
      const s = o.skillCard
      if (!s) return '无技能'
      return D.isCombatSkill(s.type) ? '⚔ 机能卡' : (s.type === D.CardType.RESEARCH ? '📖 研究卡' : '💊 恢复卡')
    }
    // 技能效果标签：基于 skillCard 字段数值（与战斗卡机制一致）
    function skillText(o) {
      const s = o.skillCard
      if (!s) return '无技能'
      const parts = []
      if (s.combatPower > 0) parts.push(`伤害 ${s.combatPower * 2}`)
      if (s.hits > 0) parts.push(`×${s.hits}连击`)
      if (s.element && D.ELEMENT_INFO[s.element]) parts.push(`${D.ELEMENT_INFO[s.element].icon}${D.ELEMENT_INFO[s.element].name} ${s.elementAmount}`)
      if (s.gatherAmount > 0) parts.push(`恢复耐力 ${s.gatherAmount}`)
      if (s.researchValue > 0) parts.push(`星之记忆+${s.researchValue}`)
      if (s.block > 0) parts.push(`格挡 ${s.block}`)
      if (s.heal > 0) parts.push(`回血 ${s.heal}`)
      if (s.draw > 0) parts.push(`抽${s.draw}`)
      if (s.strength > 0) parts.push(`力量+${s.strength}`)
      if (s.dexterity > 0) parts.push(`敏捷+${s.dexterity}`)
      if (s.applyVuln > 0) parts.push(`易伤${s.applyVuln}`)
      if (s.applyWeak > 0) parts.push('虚弱')
      if (s.loseLife > 0) parts.push(`代价-${s.loseLife}`)
      if (s.pierce) parts.push('破甲')
      if (s.invulnerable) parts.push('免疫')
      if (s.doubleNext) parts.push('下回合攻击×2')
      if (s.echo) parts.push(`回响×${s.echo}`)
      if (s.thorns) parts.push(`荆棘+${s.thorns}`)
      if (s.enemyAtkDown) parts.push(`缴械-${s.enemyAtkDown}`)
      if (s.rampage) parts.push(`狂暴+${s.rampage}`)
      if (s.synergyDamage) parts.push(`同名+${s.synergyDamage}`)
      if (s.discardGainBlock) parts.push(`弃盾+${s.discardGainBlock}`)
      if (s.discardGainDamage) parts.push(`弃伤+${s.discardGainDamage}`)
      if (s.perTurn) {
        const pt = []
        if (s.perTurn.str) pt.push(`力量+${s.perTurn.str}`)
        if (s.perTurn.dex) pt.push(`敏捷+${s.perTurn.dex}`)
        if (s.perTurn.block) pt.push(`格挡+${s.perTurn.block}`)
        if (s.perTurn.draw) pt.push(`抽${s.perTurn.draw}`)
        if (pt.length) parts.push(`能力：每回合${pt.join('、')}`)
      }
      const eff = parts.length ? `　[${parts.join('、')}]` : ''
      return `「${s.name}」：${s.desc}${eff}`
    }
    // 遗物式光环被动
    function auraText(o) {
      const a = o.aura
      if (!a) return ''
      const p = []
      if (a.blockPerTurn) p.push(`每回合格挡+${a.blockPerTurn}`)
      if (a.drawPerTurn) p.push(`每回合抽${a.drawPerTurn}张`)
      if (a.healPerTurn) p.push(`每回合回血+${a.healPerTurn}`)
      if (a.startEnergy) p.push(`开战能量+${a.startEnergy}`)
      if (a.shieldStart) p.push(`开战格挡+${a.shieldStart}`)
      if (a.strengthStart) p.push(`开战力量+${a.strengthStart}`)
      if (a.dexterityStart) p.push(`开战敏捷+${a.dexterityStart}`)
      return p.length ? `光环：${p.join('、')}` : ''
    }
    return {
      ui: S.ui,
      closeModal: S.closeModal,
      STAR_TABS,
      curStar,
      allOrgans,
      shownOrgans,
      typeTag,
      skillText,
      auraText,
    }
  },
}
