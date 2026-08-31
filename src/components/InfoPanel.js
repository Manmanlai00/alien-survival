/* 状态 + 库存（状态条可视化） */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.InfoPanel = {
  template: `
    <div class="info-panel">
      <div class="info-sec">
        <div class="info-title">{{ player.charName ? '状态 · ' + player.charName : '状态' }}</div>
        <div v-for="s in stats" :key="s.name" class="stat-row">
          <span class="stat-label">{{ s.name }}</span>
          <div class="stat-bar"><div class="stat-fill" :style="{ width: pct(s) + '%', background: fillColor(s) }"></div></div>
          <span class="stat-num">{{ s.value }}/{{ s.max }}</span>
        </div>
        <div v-if="hasStatus" class="status-icons" title="负面状态：悬浮查看概要，点击查看详情与治疗">
          <button v-if="player.bleeding" class="status-icon" :title="'流血中：每日 -' + C.BLEED_DAMAGE + ' 生命，点击查看治疗'" @click="openStatus('bleeding')">🩹</button>
          <button v-if="player.morale <= C.MORALE_LOW" class="status-icon" :title="'精神崩溃中：每日 -' + C.MORALE_LOW_DAMAGE + ' 生命，点击查看治疗'" @click="openStatus('morale')">💢</button>
          <button v-for="(days, k) in player.diseases" :key="k" class="status-icon" :title="diseaseTip(k, days)" @click="openStatus(k)">{{ diseaseIcon(k) }}</button>
        </div>
        <div class="attr-line">属性：力{{ player.attrs.str }} 敏{{ player.attrs.agi }} 体{{ player.attrs.con }} 智{{ player.attrs.int }}</div>
        <div class="attr-line">负重 {{ carryLoad }}/{{ carryLimit }}</div>
      </div>
      <div class="info-items">
        <div class="info-tools">
          <button class="eat-btn" @click="openModal('eat')">🍖 进食（{{ foodCount }}）</button>
          <button class="eat-btn" @click="openModal('drink')">💧 饮水（{{ waterCount }}）</button>
          <button
            class="eat-btn"
            :disabled="player.stamina < 1"
            :title="player.stamina < 1 ? '耐力不足，先休息恢复耐力' : '探索当前地点（' + C.EXPLORE_TIME + ' 时间 + 1 耐力）'"
            @click="onExplore"
          >🔍 {{ player.stamina < 1 ? '耐力不足' : '探索（' + C.EXPLORE_TIME + '时间）' }}</button>
          <button class="eat-btn" @click="onRest">🛌 休息（{{ C.REST_TIME }}时间）</button>
          <button class="eat-btn" @click="openModal('lore')" title="初次击败生物会检索到脉动回声">📡 脉动回声（{{ loreCount }}/{{ loreTotal }}）</button>
          <button class="eat-btn" @click="openModal('building')" title="营地设施：每日自动产出资源">🏠 基地（{{ facilityCount }}）</button>
          <span v-if="player.tempLifeBonus > 0" class="buff-tag" title="今日护甲效果：生命上限 +{{ player.tempLifeBonus }}，当天结束失效">🛡 护甲 +{{ player.tempLifeBonus }}</span>
          <span v-if="player.tempCombatBonus > 0" class="buff-tag" title="今日战意效果：战斗伤害 +{{ player.tempCombatBonus }}，当天结束失效">⚔ 战意 +{{ player.tempCombatBonus }}</span>
          <span v-for="o in transplanted" :key="o.id" class="buff-tag organ-buff" :title="buffTitle(o)">🧬 {{ o.name }}</span>
          <span v-for="p in pets" :key="p" class="buff-tag pet-tag" :title="petDesc(p)">{{ petIcon(p) }} {{ petName(p) }}</span>
        </div>
        <div class="info-items-title">道具背包（点击使用）</div>
        <div class="info-item-row">
          <button
            v-for="g in itemGroups"
            :key="g.id"
            class="info-item"
            :title="g.def.desc"
            @click="useResource(g.id)"
          >
            <span class="info-item-count">×{{ g.count }}</span>
            <span class="info-item-name">{{ g.def.name }}</span>
            <span v-if="g.def.equipType" class="equip-badge">{{ g.def.equipType }}</span>
            <span v-if="g.rot" class="rot-badge" :class="'rot-' + g.rot.stage" :title="'腐烂状态：' + g.rot.label + '（剩余 ' + Math.max(g.rot.rotDays - g.rot.age, 0) + ' 天）'">{{ g.rot.label }}</span>
          </button>
          <div v-if="itemGroups.length === 0" class="empty-sm">暂无道具，通过配方制作</div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const S = window.GAME.store
    const D = window.GAME.data
    const { computed } = Vue
    const stats = computed(() => [
      { name: '生命', value: S.player.life, max: S.getMaxLife(), color: '#c0392b' },
      { name: '饥饿', value: S.player.hunger, max: S.getMaxHunger(), color: '#e67e22' },
      { name: '饥渴', value: S.player.thirst, max: S.getMaxThirst(), color: '#2980b9' },
      { name: '耐力', value: S.player.stamina, max: S.getMaxEnergy(), color: '#d4a017' },
      { name: '精神', value: S.player.morale, max: D.C.MAX_MORALE, color: '#8e44ad' },
    ])
    function pct(s) {
      return Math.min(100, Math.round((s.value / Math.max(s.max, 1)) * 100))
    }
    function fillColor(s) {
      if (s.value / Math.max(s.max, 1) <= 0.25) return '#c0392b'
      return s.color
    }
    const carryLoad = computed(() => S.getCarryLoad())
    const carryLimit = computed(() => S.getCarryLimit())
    const itemGroups = computed(() => {
      const m = {}
      for (const r of S.inventory.resources) {
        if (!r.def || r.def.material) continue
        const g = (m[r.id] = m[r.id] || { id: r.id, def: r.def, count: 0, minDay: undefined })
        g.count++
        if (r.day !== undefined && (g.minDay === undefined || r.day < g.minDay)) g.minDay = r.day
      }
      return Object.values(m).map((g) => {
        // 易腐食物/饮水：按组内最早一份（最旧）显示腐烂阶段，随时日动态变化
        if (g.def && g.def.perish && g.minDay !== undefined) g.rot = S.rotInfo({ def: g.def, day: g.minDay })
        return g
      })
    })
    const foodCount = computed(() => S.inventory.resources.filter((r) => r.def && r.def.use && r.def.use.hunger).length)
    const waterCount = computed(() => S.inventory.resources.filter((r) => r.def && r.def.use && r.def.use.thirst).length)
    // 剧情线索进度（底部入口按钮显示）
    const loreCount = computed(() => Object.keys(S.world.lore || {}).length)
    const loreTotal = computed(() => Object.keys(D.LORE || {}).length)
    const facilityCount = computed(() => Object.keys(S.facilities || {}).length)
    // 驯化宠物：状态栏显示跟随的宠物
    const pets = computed(() => S.pets || [])
    const petName = (id) => (D.PETS[id] ? D.PETS[id].name : id)
    const petIcon = (id) => (D.PETS[id] ? D.PETS[id].icon : '🐾')
    const petDesc = (id) => (D.PETS[id] ? D.PETS[id].desc : '')
    // buff 栏：移植器官悬浮显示完整效果
    const transplanted = computed(() => S.inventory.transplantedOrgans)
    const buffTitle = (o) => {
      const parts = []
      if (o.battleFunction && o.skillCard && D.isCombatSkill(o.skillCard.type)) parts.push(`机能卡「${o.skillCard.name}」：${o.skillCard.desc}`)
      const per = (o.passiveDays || 1) <= 1 ? '每日' : `每${o.passiveDays}天`
      const ps = []
      if (o.passive.food) ps.push(`菌丝块+${o.passive.food}`)
      if (o.passive.water) ps.push(`盐水+${o.passive.water}`)
      if (o.passive.energy) ps.push(`耐力+${o.passive.energy}`)
      if (o.passive.data) ps.push(`星之记忆+${o.passive.data}`)
      if (ps.length) parts.push(`被动：${per}${ps.join('、')}`)
      const attr = []
      if (o.passive.str) attr.push(`力量+${o.passive.str}`)
      if (o.passive.agi) attr.push(`敏捷+${o.passive.agi}`)
      if (o.passive.con) attr.push(`体质+${o.passive.con}`)
      if (o.passive.int) attr.push(`智力+${o.passive.int}`)
      if (o.passive.combat) attr.push(`战斗伤害+${o.passive.combat}`)
      if (attr.length) parts.push(`属性：${attr.join('、')}`)
      parts.push(`每日维持 ${o.maint} 耐力`)
      return parts.join('；')
    }
    // 负面状态：图标展示，点击打开详情弹窗
    const hasStatus = computed(() => !!S.player.bleeding || S.player.morale <= D.C.MORALE_LOW || Object.keys(S.player.diseases || {}).length > 0)
    const diseaseName = (k) => (D.DISEASES[k] ? D.DISEASES[k].name : k)
    const diseaseIcon = (k) => (D.DISEASES[k] ? D.DISEASES[k].icon : '⚠')
    const diseaseTip = (k, days) => {
      const d = D.DISEASES[k]
      const dur = d && d.forever ? '永久' : `剩 ${days} 天`
      return `${diseaseIcon(k)} ${diseaseName(k)}：${d ? d.desc : ''}（${dur}，点击查看治疗）`
    }
    return {
      player: S.player,
      getMaxLife: S.getMaxLife,
      stats,
      pct,
      fillColor,
      carryLoad,
      carryLimit,
      itemGroups,
      useResource: S.useResource,
      foodCount,
      waterCount,
      loreCount,
      loreTotal,
      facilityCount,
      pets,
      petName,
      petIcon,
      petDesc,
      transplanted,
      hasStatus,
      diseaseName,
      diseaseIcon,
      diseaseTip,
      buffTitle,
      openModal: S.openModal,
      openStatus: S.openStatus,
      onExplore: S.onExplore,
      onRest: S.onRest,
      C: D.C,
    }
  },
}
