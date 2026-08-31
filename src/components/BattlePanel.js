/* 卡牌战斗面板（怪物色块展示 + 多交互） */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.BattlePanel = {
  template: `
    <div v-if="battle.active && battle.enemy" class="battle-overlay">
      <div class="battle-box">
        <!-- 战场：怪物 vs 玩家 -->
        <div class="battle-field">
          <div class="enemy-zone">
            <div class="monster-sprite" :class="lungeClass" @click="openInfo" :title="'点击查看「' + battle.enemy.name + '」情报'">
              <div class="monster-body" :class="monsterShape" :style="{ background: monsterColor }">
                <div class="monster-eye left"></div>
                <div class="monster-eye right"></div>
                <div class="monster-mouth"></div>
              </div>
            </div>
            <div class="monster-name" @click="openInfo">
              <span v-if="battle.elite" class="elite-tag" title="精英生物：高难生物随机附加的额外能力">⭐精英</span>
              <span v-if="battle.rageMode" class="rage-tag" title="Boss 狂暴形态：攻击提升且每回合增强">💢狂暴</span>
              {{ battle.rageName || battle.enemy.name }} <small>（难度：{{ difficultyName(battle.enemy.effectivePower || battle.enemy.power) }} · {{ archetypeName }} · 点击情报）</small>
            </div>
            <div v-if="battle.enemyAbilities.length" class="ability-tags">
              <span v-for="a in battle.enemyAbilities" :key="a" class="ability-tag" :title="abiDesc(a)">
                {{ abiIcon(a) }} {{ abiName(a) }}
              </span>
            </div>
            <div v-if="battle.enemyIntent" class="enemy-intent" :class="'intent-' + battle.enemyIntent.type" @click="openInfo" title="点击查看意图详情">
              <span class="intent-icon">{{ intentIcon }}</span>
              <span class="intent-label">{{ intentLabel }}</span>
            </div>
            <div v-if="battle.enemyFeint" class="enemy-intent intent-feint">
              <span class="intent-icon">👻</span>
              <span class="intent-label">蓄力完成：下一击必中、不可格挡</span>
            </div>
            <div class="hp-row">
              <div class="hp-bar enemy"><div class="hp-fill" :style="{ width: enemyHpPct + '%' }"></div></div>
              <span class="hp-text">{{ battle.enemyHp }}/{{ battle.enemyMaxHp }}</span>
            </div>
            <div v-if="enemyStatusTags.length" class="dot-tags">
              <span v-for="(t, i) in enemyStatusTags" :key="i" class="dot-tag" :title="t.title">{{ t.label }}</span>
            </div>
          </div>

          <div class="vs-divider">VS</div>

          <div class="player-zone">
            <div class="player-sprite" :class="{ 'shake-hit': playerShake }">
              <div class="player-body">
                <div class="player-eye left"></div>
                <div class="player-eye right"></div>
                <div class="player-mouth"></div>
              </div>
            </div>
            <div class="battle-player">{{ player.charName || '你' }}</div>
            <div class="hp-row">
              <div class="hp-bar player"><div class="hp-fill" :style="{ width: playerHpPct + '%' }"></div></div>
              <span class="hp-text">{{ player.life }}/{{ getMaxLife() }}</span>
            </div>
            <div class="energy-row">
              <span v-for="i in C.BATTLE_MAX_ENERGY" :key="i" class="orb" :class="{ on: i <= battle.energy }"></span>
              <span class="energy-num">{{ battle.energy }}/{{ C.BATTLE_MAX_ENERGY }}</span>
              <span v-if="battle.shield > 0" class="shield-badge" title="本回合格挡">🛡{{ battle.shield }}</span>
              <span v-if="battle.enemyShield > 0" class="shield-badge enemy" title="敌人硬化外壳：抵减你的下一次攻击">🛡{{ battle.enemyShield }}</span>
              <span v-if="battle.playerStrength > 0" class="buff-badge" title="本场战斗攻击伤害加成">⚔ 力量 +{{ battle.playerStrength }}</span>
              <span v-if="battle.playerDexterity > 0" class="buff-badge" title="本场战斗格挡加成">🛡 敏捷 +{{ battle.playerDexterity }}</span>
              <span v-for="(t, i) in playerStatusTags" :key="i" class="poison-badge" :title="t.title">{{ t.label }}</span>
              <span v-for="(t, i) in tribeTags" :key="'tr' + i" class="tribe-badge" :title="t.title">{{ t.label }}</span>
            </div>
            <div class="turn-tag">第 {{ battle.turn }} 回合</div>
          </div>
          <!-- 战斗特效层：命中/暴击/治疗/格挡/元素等一次性视觉特效（相对战场定位） -->
          <div class="fx-layer">
            <div v-for="f in battle.fx" :key="f.id" class="fx" :class="fxClass(f)" :style="fxStyle(f)"></div>
          </div>
        </div>

        <!-- 战斗飘字 -->
        <div class="floaters">
          <div v-for="f in battle.floaters" :key="f.id" class="floater" :class="f.kind" :style="{ top: f.top + 'px' }">{{ f.text }}</div>
        </div>

        <!-- 战斗日志（自动滚动到底部） -->
        <div class="battle-log" ref="logEl">
          <div v-for="(l, i) in battle.battleLog" :key="i" class="battle-log-line">{{ l }}</div>
        </div>

        <!-- 器官能力（不走牌库，使用后冷却固定回合恢复） -->
        <div v-if="battle.organAbilities && battle.organAbilities.length" class="organ-abilities">
          <button
            v-for="(ab, i) in battle.organAbilities"
            :key="i"
            class="org-ability"
            :class="{ cooling: ab.cooldown > 0 }"
            :disabled="ab.cooldown > 0"
            :title="ab.card.desc + (ab.cooldown > 0 ? '（冷却中）' : '（使用后冷却 ' + ab.maxCooldown + ' 回合恢复）')"
            @click="playOrganAbility(i)"
          >
            <div class="org-ab-name">{{ ab.card.name }}</div>
            <div class="org-ab-eff">{{ effectText(ab.card) }}</div>
            <div v-if="ab.cooldown > 0" class="org-ab-cd">⏳ 冷却 {{ ab.cooldown }}</div>
            <div v-else class="org-ab-ready">🧬 可用</div>
          </button>
        </div>

        <!-- 手牌 -->
        <div class="battle-hand">
          <button
            v-for="(card, i) in battle.hand"
            :key="i"
            class="bcard"
            :disabled="battle.energy < card.energyCost"
            @click="playCard(card)"
          >
            <div class="bcard-name">{{ card.name }}<span v-if="card.star" class="card-star" :class="'star-' + card.star">★{{ card.star }}</span></div>
            <div class="bcard-cost">⚡{{ card.energyCost }}</div>
            <div class="bcard-eff">{{ effectText(card) }}</div>
          </button>
          <div v-if="battle.hand.length === 0" class="empty">手牌已空</div>
        </div>

        <!-- 牌堆交互 -->
        <div class="pile-row">
          <button class="pile-btn" @click="togglePeek('discard')">弃牌堆（下回合抽 2）{{ battle.discard.length }}</button>
          <button class="pile-btn" @click="togglePeek('deck')">牌库 {{ battle.deck.length }}</button>
          <div v-if="battle.peek" class="peek-box">
            <div class="peek-title">{{ battle.peek === 'deck' ? '牌库' : '弃牌堆' }}（{{ peekList.length }} 张）</div>
            <div class="peek-cards">
              <div v-for="(c, i) in peekList" :key="i" class="peek-card">
                <div class="peek-name">{{ c.name }}<span v-if="c.star" class="card-star" :class="'star-' + c.star">★{{ c.star }}</span></div>
                <div class="peek-cost">⚡{{ c.energyCost }}</div>
                <div class="peek-eff">{{ effectText(c) }}</div>
              </div>
              <div v-if="peekList.length === 0" class="empty">无</div>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="battle-btns">
          <button class="bbtn" @click="endTurn">结束回合</button>
          <button class="bbtn retreat" @click="retreat">撤退（生命-5）</button>
        </div>
      </div>

      <!-- 情报弹窗：怪物信息 + 意图具体效果 -->
      <div v-if="battle.showInfoModal" class="battle-info-modal">
        <div class="modal-box battle-info-box">
          <div class="modal-head">
            <h3>{{ battle.enemy.name }} · 情报</h3>
            <button class="btn cancel modal-close" @click="closeInfo">关闭</button>
          </div>
          <div class="binfo-grid">
            <div>类型：{{ battle.enemy.seasonal ? '季节生物（' + seasonName + '出没）' : '本地生物' }}</div>
            <div>行为类型：{{ archetypeName }}</div>
            <div>战力：{{ battle.enemy.power }}（{{ difficultyName(battle.enemy.effectivePower || battle.enemy.power) }}）</div>
            <div>生命：{{ battle.enemyHp }}/{{ battle.enemyMaxHp }}</div>
            <div v-if="battle.enemyAbilities.length">能力：</div>
            <div v-for="a in battle.enemyAbilities" :key="a" class="abi-row">{{ abiIcon(a) }} <b>{{ abiName(a) }}</b>：{{ abiDesc(a) }}</div>
            <div class="intent-detail"><b>当前意图</b>：{{ intentDetail }}</div>
            <div>战利品：{{ lootText }}</div>
            <div v-if="battle.enemy.organ">可割取器官：「{{ battle.enemy.organ.name }}」{{ battle.enemy.organ.desc }}</div>
            <div v-if="battle.enemy.core">持有星球核心！</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 战斗强化三选一：独立弹窗，选完/放弃后再进入结算（点击背景不关闭，需主动跳过或选卡） -->
    <div v-if="battle.rewardShow && battle.rewardChoices && battle.rewardChoices.length" class="battle-summary-modal">
      <div class="modal-box bsum-box reward-pop">
        <div class="modal-head">
          <h3>战斗强化 · 选择一张加入牌库</h3>
          <button class="btn cancel modal-close" @click="skipReward">跳过</button>
        </div>
        <div class="reward-pop-sub">本次胜利获得的强化奖励，选择后进入结算</div>
        <div class="bsum-rewards">
          <button v-for="c in battle.rewardChoices" :key="c.name" class="reward-card" @click="chooseReward(c)">
            <div class="reward-name">{{ c.name }}<span v-if="c.star" class="card-star" :class="'star-' + c.star">★{{ c.star }}</span></div>
            <div class="reward-cost">⚡{{ c.energyCost }}</div>
            <div class="reward-desc">{{ effectText(c) }}</div>
          </button>
        </div>
      </div>
    </div>

    <!-- 器官采集：独立弹窗，必须采集后才进入结算（点击背景不关闭） -->
    <div v-if="battle.organShow && battle.summary.organ" class="battle-summary-modal">
      <div class="modal-box bsum-box organ-pop">
        <div class="modal-head">
          <h3>战利品器官 · 采集</h3>
        </div>
        <div class="organ-card">
          <div class="organ-gain-name">「{{ battle.summary.organ.name }}」</div>
          <div class="organ-gain-desc">{{ battle.summary.organ.desc }}</div>
        </div>
        <div class="organ-pop-btns">
          <template v-if="summaryOrganOwned">
            <span class="organ-gain-done">✓ 已拥有（背包 / 已移植）</span>
            <button class="btn item-btn" @click="finishOrgan">继续</button>
          </template>
          <template v-else>
            <button class="btn item-btn" @click="collectOrgan(battle.summary.organ)">
              采集器官（{{ C.ORGAN_HARVEST_TIME }}时间）
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- 战斗结算界面：独立于战斗面板，战斗结束后显示（属性变化 + 获取物品，点击背景不关闭） -->
    <div v-if="battle.summary.show" class="battle-summary-modal">
      <div class="modal-box bsum-box">
        <div class="modal-head">
          <h3>{{ battle.summary.title }}</h3>
          <button class="btn cancel modal-close" @click="closeSummary">关闭</button>
        </div>
        <div class="bsum-sec">属性变化</div>
        <div class="bsum-grid">
          <div v-for="a in battle.summary.attrChanges" :key="a.label" class="bsum-row">
            <span class="bsum-label">{{ a.label }}</span>
            <span class="bsum-num">{{ a.before }}</span>
            <span class="bsum-arrow">→</span>
            <span class="bsum-num">{{ a.after }}</span>
            <span v-if="a.diff !== null" class="bsum-diff" :class="{ up: a.diff > 0, down: a.diff < 0 }">{{ a.diff > 0 ? '+' : '' }}{{ a.diff }}</span>
          </div>
        </div>
        <div v-if="battle.summary.stats" class="bsum-sec">战斗战报</div>
        <div v-if="battle.summary.stats" class="bsum-stats">
          <span class="bsum-stat">回合 {{ battle.summary.stats.turns }}</span>
          <span class="bsum-stat">打出牌 {{ battle.summary.stats.cardsPlayed }}</span>
          <span class="bsum-stat">总伤害 {{ battle.summary.stats.damageDealt }}</span>
          <span class="bsum-stat">最大单次 {{ battle.summary.stats.maxHit }}</span>
        </div>
        <div class="bsum-sec">{{ battle.summary.victory ? '获得' : '损失' }}</div>
        <div class="bsum-gains">
          <span v-for="(g, i) in battle.summary.gains" :key="i" class="bsum-gain">{{ g }}</span>
          <span v-if="battle.summary.gains.length === 0" class="empty">无</span>
        </div>
        <!-- 战斗胜利三选一与器官采集均已拆为独立弹窗（rewardShow / organShow），流程完成后进入本结算 -->
      </div>
    </div>
  `,
  setup() {
    const B = window.GAME.battle
    const S = window.GAME.store
    const D = window.GAME.data
    const { computed, ref, watch } = Vue
    function effectText(card) {
      const parts = []
      if (card.damage) parts.push(`伤害 ${card.damage}`)
      if (card.hits) parts.push(`×${card.hits}连击`)
      if (card.element && D.ELEMENT_INFO && D.ELEMENT_INFO[card.element]) {
        const ei = D.ELEMENT_INFO[card.element]
        const tag = ei.spread ? '（蔓延）' : (ei.decay === false ? '（不衰减）' : '')
        parts.push(`${ei.icon}${ei.name} +${card.elementAmount}${tag}`)
      }
      if (card.block) parts.push(`格挡 ${card.block}`)
      if (card.heal) parts.push(`治疗 ${card.heal}`)
      if (card.energyGain) parts.push(`能量 +${card.energyGain}`)
      if (card.draw) parts.push(`抽 ${card.draw} 张`)
      if (card.strength) parts.push(`力量+${card.strength}`)
      if (card.dexterity) parts.push(`敏捷+${card.dexterity}`)
      if (card.applyVuln) parts.push(`易伤${card.applyVuln}`)
      if (card.applyWeak) parts.push(`虚弱`)
      if (card.loseLife) parts.push(`代价-${card.loseLife}血`)
      if (card.pierce) parts.push('破甲')
      if (card.invulnerable) parts.push(`免疫本回合`)
      if (card.doubleNext) parts.push(`下回合攻击×2`)
      if (card.retaliate) parts.push(`反击${card.retaliate}`)
      if (card.stun) parts.push('眩晕')
      if (card.poisonBurst) parts.push(`引爆剧毒×${card.burstMult || 2}`)
      if (card.lifesteal) parts.push('吸血')
      if (card.tempStrength) parts.push(`临时力量+${card.tempStrength}`)
      if (card.fortify) parts.push('铁壁')
      if (card.echo) parts.push(`回响×${card.echo}`)
      if (card.thorns) parts.push(`荆棘+${card.thorns}`)
      if (card.enemyAtkDown) parts.push(`缴械-${card.enemyAtkDown}`)
      if (card.rampage) parts.push(`狂暴+${card.rampage}`)
      if (card.synergyDamage) parts.push(`同名+${card.synergyDamage}`)
      if (card.discardGainBlock) parts.push(`弃盾+${card.discardGainBlock}`)
      if (card.discardGainDamage) parts.push(`弃伤+${card.discardGainDamage}`)
      if (card.perTurn) {
        const pt = []
        if (card.perTurn.str) pt.push(`力量+${card.perTurn.str}`)
        if (card.perTurn.dex) pt.push(`敏捷+${card.perTurn.dex}`)
        if (card.perTurn.block) pt.push(`格挡+${card.perTurn.block}`)
        if (card.perTurn.draw) pt.push(`抽${card.perTurn.draw}`)
        if (pt.length) parts.push(`能力：每回合${pt.join('、')}`)
      }
      if (card.exhaust) parts.push('消耗')
      if (card.retain) parts.push('保留')
      return parts.join('、')
    }
    // 敌人元素状态标签（不同属性：伤害/衰减/触发各不相同）
    const enemyStatusTags = computed(() => {
      const st = B.battle.enemyStatus
      if (!st) return []
      const tags = []
      if (st.fire && st.fire.length) tags.push({ label: `🔥灼烧 ×${st.fire.length}`, title: '每层 1 点伤害/回合，各自持续 3 回合后消失' })
      if (st.poison) tags.push({ label: `☠️剧毒 ${st.poison}`, title: '每回合造成与层数等量的伤害，随后层数 -2' })
      if (st.ice) tags.push({ label: `❄️冰封 ${st.ice}`, title: '不衰减也不造成伤害，层数超过敌人生命时立即处决' })
      if (st.wind) tags.push({ label: `🍃风袭 ${st.wind}/8`, title: '达到 8 层自动清零，额外获得一个行动回合（单次施加少）' })
      if (st.lightning) tags.push({ label: `⚡雷击 ${st.lightning}`, title: '每回合造成与层数等量的伤害，不衰减（上限 8 层，单次施加少）' })
      if (st.corrode) tags.push({ label: `🧪腐蚀 ${st.corrode}`, title: '每回合造成与层数等量的伤害，回合结束时层数 +1 蔓延（上限 8 层）' })
      if (st.water) tags.push({ label: `💧水蚀 ${st.water}`, title: `每层使敌人攻击伤害 -1，随后层数 -1（当前 -${st.water}）` })
      if (st.vulnerable) tags.push({ label: `🎯易伤 ${st.vulnerable}`, title: '敌人受到的所有伤害 +50%（持续整场战斗）' })
      if (st.weak) tags.push({ label: `💫虚弱 ${st.weak}`, title: '敌人攻击伤害 -25%（持续整场战斗）' })
      if (st.atkDown) tags.push({ label: `🗡缴械 ${st.atkDown}`, title: `敌人攻击永久降低 ${st.atkDown} 点` })
      return tags
    })
    // 玩家元素状态标签（敌人 dot 施加，不可闪避）
    const playerStatusTags = computed(() => {
      const ps = B.battle.playerStatus
      if (!ps) return []
      const tags = []
      if (ps.fire && ps.fire.length) tags.push({ label: `🔥灼烧 ×${ps.fire.length}`, title: '每层 1 点伤害/回合，各自持续 3 回合后消失（不可闪避）' })
      if (ps.poison) tags.push({ label: `☠️剧毒 ${ps.poison}`, title: '每回合造成与层数等量的伤害，随后层数 -2（不可闪避）' })
      if (ps.lightning) tags.push({ label: `⚡雷击 ${ps.lightning}`, title: '每回合造成与层数等量的伤害，不衰减（不可闪避）' })
      if (ps.corrode) tags.push({ label: `🧪腐蚀 ${ps.corrode}`, title: '每回合造成与层数等量的伤害，回合结束时层数 +1 蔓延（上限 8 层，不可闪避）' })
      if (ps.water) tags.push({ label: `💧水蚀 ${ps.water}`, title: `你的攻击伤害 -${ps.water}，随后层数 -1` })
      // 卡牌增益状态：荆棘 / 回响 / 能力牌每回合被动
      if (B.battle.playerThorns) tags.push({ label: `🌵荆棘 ${B.battle.playerThorns}`, title: '每次受击反伤等量伤害（整场战斗持续）' })
      if (B.battle.playerEcho) tags.push({ label: `🔊回响 ×${B.battle.playerEcho}`, title: '本回合剩余可让下一张牌效果执行两次的次数' })
      const pw = B.battle.playerPowers
      if (pw && (pw.str || pw.dex || pw.block || pw.draw)) {
        const pt = []
        if (pw.str) pt.push(`力+${pw.str}`)
        if (pw.dex) pt.push(`敏+${pw.dex}`)
        if (pw.block) pt.push(`盾+${pw.block}`)
        if (pw.draw) pt.push(`抽+${pw.draw}`)
        tags.push({ label: `🔮能力 ${pt.join(' ')}`, title: '能力牌被动：每回合开始时自动生效' })
      }
      return tags
    })
    const enemyHpPct = computed(() => Math.round((B.battle.enemyHp / Math.max(B.battle.enemyMaxHp, 1)) * 100))
    const playerHpPct = computed(() => Math.round((S.player.life / Math.max(S.getMaxLife(), 1)) * 100))
    // 流派羁绊状态标签（开战按牌组同流派卡数激活）
    const tribeTags = computed(() => {
      const tags = []
      for (const id in B.battle.tribes || {}) {
        const td = D.TRIBES[id]
        if (!td) continue
        const tier = B.battle.tribes[id]
        tags.push({
          label: `${td.icon}${td.name}${tier === 2 ? '·II' : ''}`,
          title: `流派羁绊（${tier === 2 ? '4' : '2'}张）：${tier === 2 ? td.tier2 : td.tier1}`,
        })
      }
      return tags
    })
    const lootText = computed(() => {
      const e = B.battle.enemy
      const l = e ? e.loot : {}
      const names = ['菌丝块', '盐水', '', '星之记忆']
      const parts = []
      for (const r of [0, 1]) if (l[r]) parts.push(`${names[r]}×${l[r]}`)
      const dg = e && D.dataReward ? D.dataReward(e) : 0
      if (dg > 0) parts.push(`星之记忆×${dg}`)
      if (l[2]) parts.push('材料（转为物品）')
      return parts.join('、') || '无'
    })
    // 怪物外形：按原型（行为风格）区分剪影，颜色按怪物名称哈希在原型色盘中变化，让每个怪物样式不同
    const ARCH_SHAPES = { normal: 'shape-normal', elemental: 'shape-elemental', brute: 'shape-brute', swift: 'shape-swift', bulwark: 'shape-bulwark', frenzy: 'shape-frenzy', super: 'shape-super' }
    const ARCH_COLORS = {
      normal: ['#5fa87e', '#6bbf8f', '#8fbf6b'],
      elemental: ['#9b6fd6', '#c06fd6', '#d68f6f'],
      brute: ['#8a6a4a', '#a07a52', '#7a5a3a'],
      swift: ['#5fb8c9', '#4f9ec9', '#7fc9a8'],
      bulwark: ['#7d8fc9', '#6f7ac9', '#9f8fc9'],
      frenzy: ['#cf5a5a', '#e07050', '#c94a7a'],
      super: ['#ffb347', '#ff6b5a', '#ffd700'],
    }
    function nameHash(name) {
      let h = 0
      for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
      return h
    }
    const monsterShape = computed(() => {
      const a = (B.battle.enemy && B.battle.enemy.archetype) || 'normal'
      return ARCH_SHAPES[a] || 'shape-normal'
    })
    const monsterColor = computed(() => {
      const a = (B.battle.enemy && B.battle.enemy.archetype) || 'normal'
      const list = ARCH_COLORS[a] || ARCH_COLORS.normal
      const h = B.battle.enemy ? nameHash(B.battle.enemy.name) : 0
      return list[h % list.length]
    })
    const lungeClass = computed(() => (B.battle.animTick % 2 ? 'lunge-a' : 'lunge-b'))
    // 战斗特效：位置与元素配色映射（一次性视觉，480ms 后由 battle.js 自动移除）
    // 上下布局：怪物区在上、玩家区在下，特效施加在对应对象所在区域
    const FX_POS = {
      'enemy-hit': { left: '18%', top: '16%' },
      'enemy-crit': { left: '18%', top: '12%' },
      'enemy-heal': { left: '18%', top: '22%' },
      'enemy-shield': { left: '18%', top: '28%' },
      'enemy-buff': { left: '18%', top: '10%' },
      'enemy-element': { left: '18%', top: '16%' },
      'player-hit': { left: '80%', top: '70%' },
      'player-heal': { left: '80%', top: '75%' },
      'player-block': { left: '80%', top: '72%' },
      'player-dodge': { left: '80%', top: '68%' },
      'player-element': { left: '80%', top: '72%' },
      energy: { left: '82%', top: '88%' },
    }
    const ELEM_COLOR = { fire: '#ff6b3d', poison: '#7dd04a', ice: '#6fd8ff', wind: '#b9f27c', lightning: '#ffd23d', water: '#4fa4e8' }
    function fxClass(f) {
      return 'fx-' + f.type
    }
    function fxStyle(f) {
      const p = FX_POS[f.type] || { left: '50%', top: '50%' }
      const c = f.arg && ELEM_COLOR[f.arg] ? ELEM_COLOR[f.arg] : null
      return Object.assign({ left: p.left, top: p.top }, c ? { '--fx-color': c } : {})
    }
    const intentIcon = computed(() => {
      const i = B.battle.enemyIntent
      if (!i) return '？'
      if (i.type === 'dot' && D.ELEMENT_INFO && D.ELEMENT_INFO[i.element]) return D.ELEMENT_INFO[i.element].icon
      return { attack: '⚔', heavy: '💥', feint: '👻', heal: '💗', shield: '🛡', multi: '⚡', buff: '🔥' }[i.type] || '？'
    })
    const intentLabel = computed(() => {
      const i = B.battle.enemyIntent
      if (!i) return '蓄势待发'
      const multi = B.battle.enemyAbilities.indexOf('multi') !== -1
      const w = B.battle.enemyStatus ? B.battle.enemyStatus.water : 0
      const weak = B.battle.enemyStatus ? B.battle.enemyStatus.weak : 0
      const weakNote = weak > 0 ? '（虚弱-25%）' : ''
      if (i.type === 'multi') return `${i.action} ${i.atk}×${i.hits}${weakNote}`
      if (i.type === 'buff') return `${i.action}`
      if (i.type !== 'attack' && i.type !== 'heavy') return `${i.action}`
      if (w > 0) return `${i.action} ${i.atk}${multi ? '×2' : ''}（水蚀-${w}）${weakNote}`
      return `${i.action} ${i.atk}${multi ? '×2' : ''}${weakNote}`
    })
    // 意图的具体效果描述（情报弹窗内展示，考虑连击/狂暴/水蚀）
    const intentDetail = computed(() => {
      const i = B.battle.enemyIntent
      if (!i) return '怪物正在蓄势待发，尚未露出攻击意图。'
      if (i.type === 'feint') return `「${i.action}」：本回合不攻击，蓄力下一击——攻击 +50% 且必定命中、不可格挡、不可闪避。`
      if (i.type === 'dot') {
        const info = D.ELEMENT_INFO[i.element] || { name: i.element || '元素' }
        return `「${i.action}」：向你施加 ${i.amount} 层${info.name}（不可闪避、不可格挡）。${info.desc ? '『' + info.desc + '』' : ''}`
      }
      if (i.type === 'heal') return `「${i.action}」：汲取养分，恢复 ${i.amount} 点生命。`
      if (i.type === 'shield') return `「${i.action}」：获得 ${i.amount} 点护盾，抵减你的下一次攻击。`
      if (i.type === 'multi') return `「${i.action}」：连续攻击 ${i.atk} 点 ×${i.hits} 次，合计约 ${i.atk * i.hits} 点伤害。`
      if (i.type === 'buff') return `「${i.action}」：攻击力 +${i.amount}（最多 +5，永久持续）。`
      const multi = B.battle.enemyAbilities.indexOf('multi') !== -1
      const enrage = B.battle.enemyAbilities.indexOf('enrage') !== -1 && B.battle.enemyHp <= B.battle.enemyMaxHp / 2
      const w = B.battle.enemyStatus ? B.battle.enemyStatus.water : 0
      const buff = B.battle.enemyAtkBuff || 0
      const atk = Math.max(i.atk + (enrage ? 2 : 0) + buff - w, 0)
      const wNote = w > 0 ? `（水蚀压制 -${w}）` : ''
      const bNote = buff > 0 ? `（狂暴 +${buff}）` : ''
      if (multi) return `「${i.action}」：连击攻击 ${Math.round(atk * 0.6)} 点 ×2 次，合计约 ${Math.round(atk * 0.6) * 2} 点伤害${wNote}${bNote}。`
      return `「${i.action}」：造成 ${atk} 点伤害${enrage ? '（狂暴触发 +2）' : ''}${bNote}${wNote}。`
    })
    const abiInfo = (a) => (D.ABILITY_INFO && D.ABILITY_INFO[a]) || null
    const abiName = (a) => (abiInfo(a) ? abiInfo(a).name : a)
    const abiIcon = (a) => (abiInfo(a) ? abiInfo(a).icon : '✦')
    const abiDesc = (a) => (abiInfo(a) ? abiInfo(a).desc : '')
    const abiNames = computed(() => B.battle.enemyAbilities.map((a) => abiName(a)).join('、'))
    const seasonName = computed(() => D.SEASON_NAMES[S.player.season])
    const archetypeName = computed(() => (B.battle.enemy && B.battle.enemy.archetypeName) || '均衡型')
    // 结算器官是否已拥有（背包或已移植）：拥有则不再显示采集选项
    const summaryOrganOwned = computed(() => {
      const o = B.battle.summary && B.battle.summary.organ
      if (!o) return false
      return S.inventory.obtainedOrgans.some((x) => x.id === o.id) || S.inventory.transplantedOrgans.some((x) => x.id === o.id)
    })
    // 牌库/弃牌堆预览：具体卡牌列表
    const peekList = computed(() => {
      const src = B.battle.peek === 'deck' ? B.battle.deck : B.battle.discard
      return src || []
    })
    // 受击反馈：图标本体震动闪色（命中/暴击/元素施加时触发，300ms 后复位）
    const monsterShake = ref(false)
    const playerShake = ref(false)
    watch(
      () => B.battle.fx.length,
      () => {
        const fx = B.battle.fx
        const last = fx[fx.length - 1]
        if (!last) return
        if (last.type.indexOf('enemy-') === 0) {
          monsterShake.value = true
          setTimeout(() => { monsterShake.value = false }, 300)
        } else if (last.type.indexOf('player-') === 0 || last.type === 'energy') {
          playerShake.value = true
          setTimeout(() => { playerShake.value = false }, 300)
        }
      }
    )
    // 战斗日志：新增时自动滚动到底部（展示最新动态）
    const logEl = ref(null)
    watch(
      () => B.battle.battleLog.length,
      () => {
        Vue.nextTick(() => {
          if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight
        })
      }
    )
    // 关闭结算：三选一已拆为独立弹窗（rewardShow），此处直接关闭
    function closeSummary() {
      B.closeSummary()
    }
    return {
      battle: B.battle,
      player: S.player,
      getMaxLife: S.getMaxLife,
      playCard: B.playCard,
      playOrganAbility: B.playOrganAbility,
      endTurn: B.endTurn,
      retreat: B.retreat,
      difficultyName: D.difficultyName,
      effectText,
      enemyStatusTags,
      playerStatusTags,
      tribeTags,
      openInfo: B.openInfo,
      closeInfo: B.closeInfo,
      closeSummary,
      collectOrgan: S.collectOrgan,
      summaryOrganOwned,
      chooseReward: B.chooseReward,
      skipReward: B.skipReward,
      finishOrgan: B.finishOrgan,
      togglePeek: B.togglePeek,
      peekList,
      monsterShake,
      playerShake,
      logEl,
      enemyHpPct,
      playerHpPct,
      lootText,
      monsterShape,
      monsterColor,
      lungeClass,
      fxClass,
      fxStyle,
      intentIcon,
      intentLabel,
      intentDetail,
      abiName,
      abiIcon,
      abiDesc,
      abiNames,
      seasonName,
      archetypeName,
      C: D.C,
    }
  },
}
