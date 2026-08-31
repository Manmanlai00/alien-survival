/* 地点交互面板：探索（发现物品/触发战斗）/ 地区物品采集研究 / 独特生物 */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.LocationPanel = {
  template: `
    <div v-if="loc" class="loc-panel">
      <div class="loc-desc">
        <strong>{{ loc.name }}</strong>（{{ ecoText(loc.eco) }}）· {{ loc.desc }}
        <div v-for="t in traits" :key="t" class="trait">【{{ t }}】</div>
      </div>
      <div class="scout-bar-wrap">
        <div class="scout-label">
          <template v-if="scoutProgress < scoutNeeded">探索进度 {{ scoutProgress }}/{{ scoutNeeded }}（随探索解锁地点卡与路口）</template>
          <template v-else>这一带已全部探索：地点与道路均已探明</template>
        </div>
        <div class="scout-bar">
          <div class="scout-fill" :style="{ width: scoutPercent + '%' }"></div>
          <div v-for="m in roadMarks" :key="'r' + m" class="scout-mark road" :class="{ done: scoutProgress >= m }" :style="{ left: m + '%' }"></div>
          <div v-for="m in cardMarks" :key="'c' + m" class="scout-mark card" :class="{ done: scoutProgress >= m }" :style="{ left: m + '%' }"></div>
          <div v-if="hasCore" class="scout-mark core" :class="{ done: scoutProgress >= scoutNeeded }" :style="{ left: '100%' }"></div>
        </div>
      </div>
      <div class="item-list">
        <div class="item-title">地区物品</div>
        <div v-if="itemGroups.length || buildingCard || groundPiles.length || coreEnemy || superCreature" class="item-row" @wheel.prevent="onRowWheel">
          <div v-if="superCreature" class="item-card core">
            <div class="card-back">异</div>
            <div class="card-face">
              <div class="item-head"></div>
              <div class="item-badges">
                <span class="item-badge">超级生物</span>
                <span class="item-badge" style="background:#c0392b">☄ 剩余 {{ superDaysLeft }} 天</span>
              </div>
              <div class="item-name">{{ superCreature.enemy.name }}</div>
              <div class="item-desc">{{ superCreature.enemy.desc }}（难度：{{ difficultyName(superCreature.enemy.effectivePower || superCreature.enemy.power) }}）</div>
              <div class="item-actions">
                <button class="btn item-btn" @click="onSuperChallenge">
                  挑战（{{ C.COMBAT_TIME }}时间后结算）
                </button>
              </div>
            </div>
          </div>
          <div v-if="buildingCard" class="item-card" :class="buildingKind">
            <div class="card-back">异</div>
            <div class="card-face">
              <div class="item-head"></div>
              <div class="item-badges">
                <span class="item-badge">{{ buildingBadge }}</span>
              </div>
              <div class="item-name">{{ buildingName }}</div>
              <div class="item-desc">{{ buildingDesc }}</div>
              <div class="item-actions">
                <button v-if="building.state === 1" class="btn item-btn" @click="onHatch">
                  孵化核心
                </button>
                <template v-else>
                  <button v-if="building.stage < 5" class="btn item-btn" @click="onFeed">
                    喂养（{{ C.BUILDING_FEED_COST }}菌丝块·{{ C.FEED_TIME }}时间）
                  </button>
                  <button
                    v-if="building.canMove && building.location !== world.currentLocation"
                    class="btn item-btn"
                    @click="onMoveBuilding"
                  >
                    移动到这里
                  </button>
                </template>
              </div>
            </div>
          </div>
          <div v-if="coreEnemy" class="item-card core">
            <div class="card-back">异</div>
            <div class="card-face">
              <div class="item-head"></div>
              <div class="item-badges">
                <span class="item-badge">核心怪物</span>
              </div>
              <div class="item-name">{{ coreEnemy.name }}</div>
              <div class="item-desc">盘踞于此的核心节点怪物（难度：{{ difficultyName(coreEnemy.effectivePower || coreEnemy.power) }}）。挑战它可获战利品与星球核心。</div>
              <div class="item-actions">
                <button class="btn item-btn" @click="onCoreChallenge(coreEnemy)">挑战（{{ C.COMBAT_TIME }}时间后结算）</button>
              </div>
            </div>
          </div>
          <div v-for="sec in sections" :key="sec.key" class="item-group">
            <div class="item-group-title">{{ sec.title }}</div>
            <div class="item-row" @wheel.prevent="onRowWheel">
              <div v-for="g in sec.items" :key="g.item.id" class="item-card" :class="itemKind(g.item)">
                <div class="card-back">异</div>
                <div class="card-face">
                  <div class="item-head"></div>
                  <div class="item-badges">
                    <span class="item-badge">{{ itemKindLabel(g.item) }}</span>
                    <span v-if="g.def.harvest" class="item-badge stock" :title="stockTitle(g.item)">{{ stockText(g.item) }}</span>
                  </div>
                  <div class="item-name">{{ g.def.name }}</div>
                  <div class="item-desc">{{ itemGainText(g.item) }}</div>
                  <div class="item-actions">
                    <button v-if="g.def.harvest" class="btn item-btn" :disabled="isDepleted(g.item)" @click="onItemHarvest(g.item)">
                      {{ isDepleted(g.item) ? '已采空（' + restoreNeedDays(g.item) + ' 天后恢复）' : '采集（' + harvestTime(g.item) + '时间）' }}
                    </button>
                    <button v-if="g.def.research" class="btn item-btn research" @click="onItemResearch(g.item)">
                      研究（{{ researchTime(g.item) }}时间）
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-for="p in groundPiles" :key="p.id" class="item-card ground">
            <div class="card-back">异</div>
            <div class="card-face">
              <div class="item-head"></div>
              <div class="item-badges">
                <span class="item-badge">地上拾取</span>
                <span class="card-count">×{{ p.count }}</span>
              </div>
              <div class="item-name">{{ p.def.name }}</div>
              <div class="item-desc">{{ p.def.desc }}</div>
              <div class="item-actions">
                <button class="btn item-btn" @click="onPickUp(p)">拿起（免费）</button>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="item-empty">尚未发现地区物品，探索可能有所发现</div>
      </div>
    </div>
  `,
  setup() {
    const S = window.GAME.store
    const D = window.GAME.data
    const { computed } = Vue
    const loc = computed(() => S.locations[S.world.currentLocation])
    const ecoText = (eco) => D.ecoText(eco)
    const activeEnemy = computed(() => (loc.value ? S.getActiveEnemy(loc.value) : null))
    const climate = computed(() => {
      const l = loc.value
      if (!l) return null
      return (D.SEASONAL_CLIMATE[l.id] && D.SEASONAL_CLIMATE[l.id][S.player.season]) || null
    })
    const traits = computed(() => {
      const l = loc.value
      if (!l) return []
      const arr = []
      const e = activeEnemy.value
      if (e) {
        const pop = e.pop > 0 ? e.pop + '/' + e.maxPop : (e.maxPop <= 1 ? '已灭绝（不会恢复）' : '已绝迹（恢复缓慢）')
        arr.push(`生物群落：${e.name}${e.seasonal ? '（' + D.SEASON_NAMES[S.player.season] + '出现）' : ''} ${pop}（难度：${D.difficultyName(e.effectivePower || e.power)}）`)
      }
      if (climate.value) arr.push(`气候：${climate.value.note}`)
      if (l.overnight.energyBonus > 0) arr.push(`地热滋养：过夜恢复 ${l.overnight.energyBonus} 耐力`)
      if (l.overnight.waterCost > 0) arr.push(`严酷环境：过夜消耗 ${l.overnight.waterCost} 水`)
      if (l.overnight.lifeDamage > 0) arr.push(`严寒：无抗寒器官时过夜生命 -${l.overnight.lifeDamage}`)
      if (l.require && !(S.player.upg[l.require] > 0)) {
        const meta = D.SPECIAL_META && D.SPECIAL_META[l.require]
        arr.push(`进入要求：${meta ? meta.desc : (D.RESEARCH_DEFS[l.require] ? D.RESEARCH_DEFS[l.require].name : l.require)}（需研究）`)
      }
      return arr
    })
    const scoutProgress = computed(() => S.getScoutProgress(loc.value ? loc.value.id : ''))
    const scoutNeeded = computed(() => S.getScoutNeeded(loc.value ? loc.value.id : ''))
    const lockedRoads = computed(() => (loc.value ? S.getLockedRoads(loc.value.id) : []))
    const scoutPercent = computed(() => Math.min(100, Math.round((scoutProgress.value / Math.max(scoutNeeded.value, 1)) * 100)))
    // 解锁节点标记位置（百分比）：路口按邻居数均分，地点卡按物品池大小均分
    const roadMarks = computed(() => {
      const l = loc.value
      if (!l || !l.neighbors || !l.neighbors.length) return []
      const step = 100 / l.neighbors.length
      const arr = []
      for (let k = 1; k <= l.neighbors.length; k++) arr.push(k * step)
      return arr
    })
    const cardMarks = computed(() => {
      const l = loc.value
      if (!l) return []
      const pool = D.ecoPool(l.eco) || []
      if (!pool.length) return []
      const step = 100 / pool.length
      const arr = []
      for (let k = 1; k <= pool.length; k++) arr.push(k * step)
      return arr
    })
    const items = computed(() =>
      loc.value ? S.world.discoveredItems[loc.value.id] || [] : []
    )
    const groundPiles = computed(() =>
      loc.value ? S.world.groundItems[loc.value.id] || [] : []
    )
    const itemGroups = computed(() => items.value.map((it) => ({ def: it.def, item: it, count: 1 })))
    // 当前生态的主材料名（生态材料分组标题用）
    const ecoMainName = computed(() => {
      const l = loc.value
      if (!l || !l.eco || !l.eco.length) return ''
      const s = D.ECO_SERIES[l.eco[0]]
      return s && D.ITEMS[s.main.id] ? D.ITEMS[s.main.id].name : ''
    })
    // 采集点分类：生态材料（本生态主材料）/ 基础食物（菌丝块·盐水）/ 研究 / 材料
    function itemCat(it) {
      const def = it.def
      if (def.research) return 'research'
      const l = loc.value
      const eco = l && l.eco && l.eco.length ? l.eco[0] : null
      const s = eco ? D.ECO_SERIES[eco] : null
      if (s && def.harvest && def.harvest.item === s.main.id) return 'eco_material'
      if (def.harvest && (def.harvest.item === 'fungus' || def.harvest.item === 'brine')) return 'food'
      return 'material'
    }
    // 按类别分组：生态材料 → 基础食物 → 研究 → 材料
    const sections = computed(() => {
      const secs = []
      const pick = (cat) => itemGroups.value.filter((g) => itemCat(g.item) === cat)
      const ec = pick('eco_material')
      const fd = pick('food')
      const rs = pick('research')
      const mt = pick('material')
      if (ec.length) secs.push({ key: 'ec', title: `生态材料 · ${ecoMainName.value}`, items: ec })
      if (fd.length) secs.push({ key: 'fd', title: '基础食物', items: fd })
      if (rs.length) secs.push({ key: 'rs', title: '研究', items: rs })
      if (mt.length) secs.push({ key: 'mt', title: '材料', items: mt })
      return secs
    })
    // 核心生物：探索满进度（100/100）才解锁显示
    const hasCore = computed(() => {
      const l = loc.value
      if (!l) return false
      return (l.enemies || []).some(
        (e) => e.maxPop <= 1 && (l.enemyPops[e.name] !== undefined ? l.enemyPops[e.name] : e.maxPop) > 0
      )
    })
    const coreEnemy = computed(() => {
      if (scoutProgress.value < scoutNeeded.value) return null
      const e = activeEnemy.value
      return e && e.pop > 0 && e.maxPop <= 1 ? e : null
    })
    // 超级生物（流星事件）
    const superCreature = computed(() => (loc.value ? S.getSuperCreature(loc.value.id) : null))
    const superDaysLeft = computed(() => {
      const sc = superCreature.value
      return sc ? Math.max(sc.expireDay - S.player.day, 1) : 0
    })
    const building = S.building
    const buildingCard = computed(() => building.state === D.BuildingState.HAS_CORE || building.state === D.BuildingState.HATCHED)
    const buildingKind = computed(() => (building.state === D.BuildingState.HATCHED ? 'building' : 'building-core'))
    const buildingBadge = computed(() => (building.state === D.BuildingState.HATCHED ? '活体建筑' : '星球核心'))
    const buildingName = computed(() =>
      building.state === D.BuildingState.HATCHED
        ? `活体建筑「${building.coreName}」阶段${building.stage}`
        : `星球核心「${building.coreName}」`
    )
    const buildingDesc = computed(() => {
      if (building.state === D.BuildingState.HAS_CORE) return '取回的星球核心仍在搏动，孵化它成为你的活体建筑。'
      const threshold = building.stage >= 5 ? 0 : D.C.BUILDING_STAGE_THRESHOLDS[building.stage - 1]
      const progress = threshold <= 0 ? '已达最高阶段' : `喂养进度 ${building.fedAmount}/${threshold}`
      return `${progress}${building.canMove ? '（可移动）' : ''}`
    })
    function itemKind(it) {
      if (it.def.harvest && it.def.research) return 'hybrid'
      if (it.def.research) return 'research'
      return 'harvest'
    }
    function itemKindLabel(it) {
      const k = itemKind(it)
      return k === 'hybrid' ? '可采集/研究' : k === 'research' ? '可研究' : '可采集'
    }
    function itemGainText(it) {
      const def = it && it.def
      if (!def) return ''
      const parts = []
      if (def.harvest) parts.push(`可获取 ${D.ITEMS[def.harvest.item].name} ×${def.harvest.amount}`)
      if (def.research) parts.push(`可研究 星之记忆 +${def.research.data}`)
      return parts.join(' ／ ')
    }
    function stockText(it) {
      const max = (it && it.maxStock) || C.ITEM_STOCK_MAX
      const cur = it && it.stock !== undefined ? it.stock : max
      return it && it.finite ? `剩余 ${cur}` : `可采 ${cur}/${max}`
    }
    function restoreNeedDays(it) {
      const need = (it && it.restoreDays) || C.ITEM_RESTORE_DAILY
      const regen = (it && it.regen) || 0
      return Math.max(need - regen, 1)
    }
    function stockTitle(it) {
      if (it && it.finite) return '有限资源：采完即消失，不会恢复'
      const need = (it && it.restoreDays) || C.ITEM_RESTORE_DAILY
      return `每 ${need} 天恢复 1 份（下次还需 ${restoreNeedDays(it)} 天）`
    }
    function harvestTime(it) {
      return (it && it.def && it.def.harvestTime) || C.ITEM_HARVEST_TIME
    }
    function researchTime(it) {
      return (it && it.def && it.def.researchTime) || C.ITEM_RESEARCH_TIME
    }
    function isDepleted(it) {
      const max = (it && it.maxStock) || C.ITEM_STOCK_MAX
      const cur = it && it.stock !== undefined ? it.stock : max
      return cur <= 0
    }
    // 鼠标滚轮直接横向滚动物品卡区域（无需按住 Shift）
    function onRowWheel(e) {
      const el = e.currentTarget
      el.scrollLeft += e.deltaY + e.deltaX
    }
    return {
      loc,
      ecoText,
      activeEnemy,
      traits,
      scoutProgress,
      scoutNeeded,
      lockedRoads,
      scoutPercent,
      roadMarks,
      cardMarks,
      itemGroups,
      sections,
      itemCat,
      ecoMainName,
      itemKind,
      itemKindLabel,
      itemGainText,
      stockText,
      stockTitle,
      restoreNeedDays,
      harvestTime,
      researchTime,
      isDepleted,
      onRowWheel,
      coreEnemy,
      hasCore,
      onCoreChallenge: S.onCoreChallenge,
      superCreature,
      superDaysLeft,
      onSuperChallenge: () => S.onSuperChallenge(S.world.currentLocation),
      difficultyName: D.difficultyName,
      building,
      world: S.world,
      buildingCard,
      buildingKind,
      buildingBadge,
      buildingName,
      buildingDesc,
      onHatch: S.onHatch,
      onFeed: S.onFeed,
      onMoveBuilding: S.onMoveBuilding,
      groundPiles,
      onPickUp: S.onPickUp,
      onItemHarvest: S.onItemHarvest,
      onItemResearch: S.onItemResearch,
      C: D.C,
    }
  },
}
