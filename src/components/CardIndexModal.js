/* 卡牌图鉴弹窗：查看所有奖励卡牌的战斗效果，按星级筛选 */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.CardIndexModal = {
  template: `
    <div v-if="ui.modal === 'cardindex'" class="modal-overlay">
      <div class="modal-box cardindex-box">
        <div class="modal-head">
          <h3>卡牌图鉴</h3>
          <span class="modal-sub">全部奖励卡牌 · 共 {{ allCards.length }} 张</span>
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
        <div class="tribe-legend">流派羁绊：牌组同流派达 2 张激活 Ⅰ 阶、4 张激活 Ⅱ 阶</div>
        <div class="cardindex-grid">
          <div v-for="c in shownCards" :key="c.name" class="cardindex-card" :class="'bdr-star-' + (c.star || 1)">
            <div class="ci-name">{{ c.name }}<span class="ci-star" :class="'star-' + (c.star || 1)">★{{ c.star || 1 }}</span></div>
            <div v-if="c.tribe" class="ci-tribe" :title="tribeText(c.tribe)">{{ tribeName(c.tribe) }}</div>
            <div class="ci-cost">⚡{{ c.energyCost }}</div>
            <div class="ci-eff">{{ cardText(c) }}</div>
          </div>
          <div v-if="shownCards.length === 0" class="empty">该星级暂无卡牌</div>
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
    const allCards = computed(() => {
      const list = []
      for (const s of [1, 2, 3, 4, 5]) {
        const arr = D.REWARD_CARDS && D.REWARD_CARDS[s]
        if (arr) for (const c of arr) list.push(c)
      }
      return list
    })
    const shownCards = computed(() => (curStar.value === 0 ? allCards.value : allCards.value.filter((c) => c.star === curStar.value)))
    function cardText(c) {
      const parts = []
      if (c.damage) parts.push(`伤害 ${c.damage}`)
      if (c.hits) parts.push(`×${c.hits}连击`)
      if (c.element && D.ELEMENT_INFO[c.element]) {
        const ei = D.ELEMENT_INFO[c.element]
        const tag = ei.spread ? '（蔓延）' : (ei.decay === false ? '（不衰减）' : '')
        parts.push(`${ei.icon}${ei.name} ${c.elementAmount}${tag}`)
      }
      if (c.block) parts.push(`格挡 ${c.block}`)
      if (c.heal) parts.push(`回 ${c.heal}`)
      if (c.energyGain) parts.push(`能量+${c.energyGain}`)
      if (c.draw) parts.push(`抽${c.draw}`)
      if (c.strength) parts.push(`力量+${c.strength}`)
      if (c.dexterity) parts.push(`敏捷+${c.dexterity}`)
      if (c.applyVuln) parts.push(`易伤${c.applyVuln}`)
      if (c.applyWeak) parts.push(`虚弱`)
      if (c.loseLife) parts.push(`代价-${c.loseLife}血`)
      if (c.pierce) parts.push('破甲')
      if (c.invulnerable) parts.push('免疫本回合')
      if (c.doubleNext) parts.push('下回合攻击×2')
      if (c.retaliate) parts.push(`反击${c.retaliate}`)
      if (c.stun) parts.push('眩晕')
      if (c.poisonBurst) parts.push(`引爆剧毒×${c.burstMult || 2}`)
      if (c.lifesteal) parts.push('吸血')
      if (c.tempStrength) parts.push(`临时力量+${c.tempStrength}`)
      if (c.fortify) parts.push('铁壁')
      if (c.echo) parts.push(`回响×${c.echo}`)
      if (c.thorns) parts.push(`荆棘+${c.thorns}`)
      if (c.enemyAtkDown) parts.push(`缴械-${c.enemyAtkDown}`)
      if (c.rampage) parts.push(`狂暴+${c.rampage}`)
      if (c.synergyDamage) parts.push(`同名+${c.synergyDamage}`)
      if (c.discardGainBlock) parts.push(`弃盾+${c.discardGainBlock}`)
      if (c.discardGainDamage) parts.push(`弃伤+${c.discardGainDamage}`)
      if (c.perTurn) {
        const pt = []
        if (c.perTurn.str) pt.push(`力量+${c.perTurn.str}`)
        if (c.perTurn.dex) pt.push(`敏捷+${c.perTurn.dex}`)
        if (c.perTurn.block) pt.push(`格挡+${c.perTurn.block}`)
        if (c.perTurn.draw) pt.push(`抽${c.perTurn.draw}`)
        if (pt.length) parts.push(`能力：每回合${pt.join('、')}`)
      }
      if (c.exhaust) parts.push('消耗')
      if (c.retain) parts.push('保留')
      return parts.join(' ')
    }
    function tribeName(id) {
      const t = D.TRIBES[id]
      return t ? `${t.icon}${t.name}` : ''
    }
    function tribeText(id) {
      return D.tribeText ? D.tribeText(id) : ''
    }
    return {
      ui: S.ui,
      closeModal: S.closeModal,
      STAR_TABS,
      curStar,
      allCards,
      shownCards,
      cardText,
      tribeName,
      tribeText,
    }
  },
}
