/* 牌库管理弹窗：查看玩家自组牌库，消耗资源升级卡牌（+） */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.DeckModal = {
  template: `
    <div v-if="ui.modal === 'deck'" class="modal-overlay">
      <div class="modal-box deck-box">
        <div class="modal-head">
          <h3>卡牌牌库</h3>
          <span class="modal-sub">战斗胜利三选一积累卡牌，可消耗资源升级（+）</span>
          <button class="btn" @click="openCardIndex">📖 卡牌图鉴</button>
          <button class="btn" @click="openOrganIndex">🧬 器官卡牌</button>
          <button class="btn cancel modal-close" @click="closeModal">关闭</button>
        </div>
        <div class="modal-title">共 {{ deck.length }} 张 · 升级消耗 5 星之记忆 + 1 金属残片（每张一次） · 移除消耗 {{ removeCardCost() }} 星之记忆</div>
        <div class="deck-grid">
          <div v-for="(c, i) in deck" :key="i" class="deck-card" :class="{ up: c.upgraded }">
            <div class="deck-name">{{ c.name }}</div>
            <div class="deck-cost">⚡{{ c.energyCost }}</div>
            <div class="deck-desc">{{ cardText(c) }}</div>
            <div class="deck-actions">
              <button v-if="!c.upgraded" class="btn item-btn" @click="upgradeCard(i)">升级 +</button>
              <span v-else class="deck-updone">✓ 已升级</span>
              <button class="btn remove-btn" :disabled="deck.length <= 1" @click="removeCard(i)" :title="'消耗 ' + removeCardCost() + ' 星之记忆移除这张卡'">移除</button>
            </div>
          </div>
          <div v-if="deck.length === 0" class="empty">暂无自组牌库，战斗中「三选一」可获得卡牌</div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const S = window.GAME.store
    const D = window.GAME.data
    const { computed } = Vue
    // 玩家自组牌库；未组建时展示角色初始卡组（升级时自动构建副本）
    const deck = computed(() => {
      if (S.player.battleCards) return S.player.battleCards
      const def = D.CHARACTER_DEFS[S.player.charId]
      return def && def.battleCards ? def.battleCards : D.BASE_BATTLE_CARDS
    })
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
    return {
      ui: S.ui,
      closeModal: S.closeModal,
      openCardIndex: () => S.openModal('cardindex'),
      openOrganIndex: () => S.openModal('organindex'),
      deck,
      cardText,
      upgradeCard: S.upgradeCard,
      removeCard: S.removeCard,
      removeCardCost: S.removeCardCost,
    }
  },
}
