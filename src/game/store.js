/* ============ 核心控制器（纯 JS，Vue.reactive 状态） ============ */
window.GAME = window.GAME || {}
const S = (window.GAME.store = {})
const D = window.GAME.data
const SFX = window.GAME.sound
const C = D.C
const { reactive } = Vue

// ---- 日志 ----
S.log = reactive({ lines: [] })
S.pushLog = function (msg) {
  S.log.lines.push(msg)
  if (S.log.lines.length > 14) S.log.lines.shift()
  console.log('[Game]', msg)
}

// ---- 玩家状态 ----
S.player = reactive({
  life: C.MAX_LIFE,
  hunger: C.MAX_HUNGER,
  thirst: C.MAX_THIRST,
  hungerMax: C.MAX_HUNGER,
  thirstMax: C.MAX_THIRST,
  stamina: C.MAX_STAMINA,
  day: 1,
  timeLeft: C.MAX_TIME_PER_DAY,
  season: D.Season.STABLE,
  seasonDay: 1,
  dead: false,
  data: 0,
  lifeBonus: 0,
  energyBonus: 0,
  metabolismBonus: 0,
  maintReduction: 0,
  tempLifeBonus: 0,
  charId: null,
  charName: '',
  morale: 80,
  bleeding: false,
  sporeDisease: 0, // 孢子感染剩余天数（每日生命 -2，旧字段兼容）
  diseases: {}, // 状态病：key → 剩余天数（感染/中毒/冻伤/中暑/孢子）
  battleCards: null, // 玩家自组牌库（战斗胜利三选一获得；null 表示用角色初始卡组）
  traits: { combatDamage: 0, researchGain: 0, bleedReduction: 0, metabolism: 0 },
  abilityCooldown: 0,
  abilityBuff: null,
  tempCombatBonus: 0,
  researchBoost: 0,
  upg: { muscle: 0, regenerate: 0, sleep: 0, forage: 0, lung: 0, absorb: 0, insight: 0, wander: 0, focus: 0, opening: 0, resilient: 0, quick: 0, cook: 0, smelt: 0, weave: 0, aqua: 0, flight: 0, dig: 0 },
  attrs: { str: 1, agi: 1, con: 1, int: 1 },
  passiveTicks: {}, // 器官被动产出累计天数（达到 passiveDays 才产出）
  // 新手任务：任务完成记录 + 各玩法计数（驱动 def.NEWBIE_QUESTS 判定）
  quests: {},
  exploreCount: 0,
  harvestCount: 0,
  craftCount: 0,
  researchCount: 0,
  restCount: 0,
  killCount: 0,
})

S.getMaxLife = function () {
  return C.MAX_LIFE + S.player.lifeBonus + S.player.tempLifeBonus + (S.player.attrs.con || 0) * 5
}
S.getMaxEnergy = function () {
  return C.MAX_STAMINA + S.player.energyBonus
}
S.getMaxHunger = function () {
  return S.player.hungerMax || C.MAX_HUNGER
}
S.getMaxThirst = function () {
  return S.player.thirstMax || C.MAX_THIRST
}
S.getCarryLimit = function () {
  // 角色可自定义负重上限（调试者）或负重加成（各角色差异化）
  const def = D.CHARACTER_DEFS[S.player.charId]
  if (def && def.carryLimit) return def.carryLimit
  return C.BASE_CARRY + (S.player.attrs.str || 1) * C.CARRY_PER_STR + (def && def.carryBonus || 0) + (S.player.upg.wander || 0) * 5 + (S.player.upg.density || 0) * 4 + S.petBonus('carry')
}
S.getCarryLoad = function () {
  let w = 0
  for (const r of S.inventory.resources) w += (D.ITEMS[r.id] && D.ITEMS[r.id].weight) || 1
  return w
}

// ---- 库存 ----
S.inventory = reactive({
  obtainedOrgans: [],
  transplantedOrgans: [],
  resources: [],
})

// ---- 世界 ----
S.locations = reactive(D.LOCATIONS)
S.world = reactive({
  currentLocation: 'camp',
  discovered: { camp: true },
  seasonalPops: {},
  scoutProgress: {},
  openRoads: {},
  discoveredItems: {},
  discoveredItemIds: {}, // 每个地区已解锁过的物品卡 def.id（采空移除后避免重复解锁）
  foundItems: {},
  activeEnemies: {},
  groundItems: {},
  bestiaryItems: {}, // 图鉴：已发现的物品卡 def.id
  bestiaryEnemies: {}, // 图鉴：已遭遇的敌人名
  defeatedEnemies: {}, // 已击败的敌人名（首次击败必定触发三选一）
  lore: {}, // 剧情线索：已收集线索（按敌人名），初次击败对应生物时解锁
  superCreatures: {}, // 流星事件：locId -> { enemy, expireDay }
})

S.getScoutProgress = function (locId) {
  return S.world.scoutProgress[locId] || 0
}
S.getScoutNeeded = function (locId) {
  // 每个地图独立配置探索进度上限（scoutNeed），未配置时用全局默认
  const loc = locId && S.locations[locId]
  return (loc && loc.scoutNeed) || C.SCOUT_NEEDED
}
S.isRoadOpen = function (locId, destId) {
  const list = S.world.openRoads[locId]
  if (!!list && list.indexOf(destId) !== -1) return true
  // 道路双向相通：反向已开通的路口视为已解锁（走过一次，回来无需再探索）
  const rev = S.world.openRoads[destId]
  return !!rev && rev.indexOf(locId) !== -1
}
S.getLockedRoads = function (locId) {
  const loc = S.locations[locId]
  if (!loc) return []
  return loc.neighbors.filter((n) => !S.isRoadOpen(locId, n))
}
// 按探索进度解锁：路口每达到固定探索次数解锁 1 条；地点卡每达到固定探索次数从可选池随机解锁 1 张（全部在该地图进度上限内解锁完）
function ensureScoutStage(loc) {
  const progress = S.getScoutProgress(loc.id)
  const need = S.getScoutNeeded(loc.id)
  const pool = D.ecoPool(loc.eco)
  const list = (S.world.discoveredItems[loc.id] = S.world.discoveredItems[loc.id] || [])
  // 已解锁过的物品卡 id（finite 采空移除后不重复解锁）
  if (!S.world.discoveredItemIds) S.world.discoveredItemIds = {}
  const seen = (S.world.discoveredItemIds[loc.id] = S.world.discoveredItemIds[loc.id] || [])
  // 地点卡：每累计 need/pool.length 进度，从可选池随机解锁 1 张
  if (pool.length && seen.length < pool.length) {
    const cardStep = need / pool.length
    const target = Math.min(pool.length, Math.floor(progress / cardStep))
    while (seen.length < target && seen.length < pool.length) {
      const candidates = pool.filter((def) => seen.indexOf(def.id) === -1)
      if (!candidates.length) break
      const def = candidates[randint(0, candidates.length - 1)]
      const finite = !!def.finite
      const maxStock = finite ? (def.stock || 1) : (def.stock || C.ITEM_STOCK_MAX)
      const restoreDays = finite ? 0 : (def.restoreDays || inferRestore(def))
      list.push({ id: def.id + '_' + randint(1000, 9999), def, finite, stock: maxStock, maxStock, restoreDays, regen: 0 })
      seen.push(def.id)
      S.world.bestiaryItems[def.id] = true // 图鉴解锁该物品卡
      if (SFX) SFX.discover()
      S.pushLog(finite
        ? `你探索到了「${def.name}」！这是有限资源，共 ${maxStock} 份，采完即消失。`
        : `你探索到了「${def.name}」产出点！可采 ${maxStock} 份，每 ${restoreDays} 天恢复 1 份（从下次恢复算起还需 ${restoreDays} 天）。`)
    }
  }
  // 路口：每累计 need/路口数 进度，按邻接顺序解锁 1 条
  const roads = loc.neighbors || []
  if (roads.length) {
    if (!S.world.openRoads[loc.id]) S.world.openRoads[loc.id] = []
    const roadStep = need / roads.length
    const roadTarget = Math.min(roads.length, Math.floor(progress / roadStep))
    while (S.world.openRoads[loc.id].length < roadTarget && S.world.openRoads[loc.id].length < roads.length) {
      const next = roads.find((n) => !S.isRoadOpen(loc.id, n))
      if (!next) break
      S.world.openRoads[loc.id].push(next)
      S.pushLog(`你探明了通往「${S.locations[next].name}」的道路！`)
      if (SFX) SFX.discover()
    }
  }
}

S.addScoutProgress = function (amount) {
  if (S.player.dead) return
  // 地质勘探：勘探进度获取提升
  amount += Math.round(amount * (S.player.upg.probe || 0) * 0.2)
  const loc = S.locations[S.world.currentLocation]
  if (!loc) return
  // 单管进度：累计到该地图上限封顶，不归零
  const need = S.getScoutNeeded(loc.id)
  const next = Math.min(S.getScoutProgress(loc.id) + amount, need)
  S.world.scoutProgress[loc.id] = next
  ensureScoutStage(loc)
  if (next >= need && loc.neighbors.every((n) => S.isRoadOpen(loc.id, n))) {
    const pool = D.ecoPool(loc.eco)
    const seen = (S.world.discoveredItemIds && S.world.discoveredItemIds[loc.id]) || []
    if (seen.length >= pool.length) {
      S.pushLog('这一带的探索已全部完成：地点与道路都已探明。')
    }
  }
}

/*
 * getActiveEnemy：活跃敌人
 * 1) 季节生物优先（seasonalEnemies[season]）
 * 2) 缓存，避免按钮与状态栏不一致
 * 3) 随机重选
 */
S.getActiveEnemy = function (loc) {
  const se = loc.seasonalEnemies[S.player.season]
  if (se) {
    const pop = (S.world.seasonalPops[loc.id] && S.world.seasonalPops[loc.id][S.player.season]) !== undefined ? S.world.seasonalPops[loc.id][S.player.season] : se.maxPop
    return Object.assign({}, se, { pop: pop })
  }
  if (loc.enemies && loc.enemies.length) {
    // 缓存当前地点的活跃生物，避免按钮与状态栏各自随机导致显示不一致
    if (!S.world.activeEnemies) S.world.activeEnemies = {}
    let name = S.world.activeEnemies[loc.id]
    if (!name) {
      const alive = loc.enemies.filter((e) => (loc.enemyPops[e.name] !== undefined ? loc.enemyPops[e.name] : e.maxPop) > 0)
      if (!alive.length) return null
      name = alive[randint(0, alive.length - 1)].name
      S.world.activeEnemies[loc.id] = name
    }
    const e = loc.enemies.find((x) => x.name === name)
    const pop = loc.enemyPops[name] !== undefined ? loc.enemyPops[name] : (e ? e.maxPop : 0)
    if (pop <= 0) {
      const alive = loc.enemies.filter((x) => (loc.enemyPops[x.name] !== undefined ? loc.enemyPops[x.name] : x.maxPop) > 0)
      if (!alive.length) return null
      const n = alive[randint(0, alive.length - 1)].name
      S.world.activeEnemies[loc.id] = n
      const en = loc.enemies.find((x) => x.name === n)
      return Object.assign({}, en, { pop: loc.enemyPops[n] !== undefined ? loc.enemyPops[n] : en.maxPop })
    }
    return Object.assign({}, e, { pop })
  }
  return null
}

function getSeasonalPop(locId, season) {
  const se = S.locations[locId] && S.locations[locId].seasonalEnemies[season]
  if (!se) return 0
  return (S.world.seasonalPops[locId] && S.world.seasonalPops[locId][season]) !== undefined ? S.world.seasonalPops[locId][season] : se.maxPop
}

function reduceEnemyPopulation(loc, enemy) {
  if (enemy.maxPop <= 0) return
  if (enemy.seasonal) {
    if (!S.world.seasonalPops[loc.id]) S.world.seasonalPops[loc.id] = {}
    const cur = getSeasonalPop(loc.id, S.player.season)
    S.world.seasonalPops[loc.id][S.player.season] = Math.max(cur - 1, 0)
    const now = S.world.seasonalPops[loc.id][S.player.season]
    S.pushLog(now <= 0 ? `「${enemy.name}」已绝迹，只能等下个季节的潮汐再次带来它们。` : `「${enemy.name}」的种群减少了（剩余 ${now}/${enemy.maxPop}）。`)
    return
  }
  const cur = loc.enemyPops[enemy.name] !== undefined ? loc.enemyPops[enemy.name] : enemy.maxPop
  loc.enemyPops[enemy.name] = Math.max(cur - 1, 0)
  const now = loc.enemyPops[enemy.name]
  S.pushLog(now <= 0
    ? (enemy.maxPop <= 1 ? `「${enemy.name}」已灭绝，这片区域不会再出现它。` : `「${enemy.name}」已在这片区域绝迹，需要很长时间才能恢复。`)
    : `「${enemy.name}」的种群减少了（剩余 ${now}/${enemy.maxPop}）。`)
}

function recoverPopulations(chancePercent) {
  let recovered = 0
  for (const key in S.locations) {
    const loc = S.locations[key]
    for (const e of loc.enemies) {
      // 极难生物（maxPop<=1 的地点卡精英）：固定数量，不会恢复
      if (e.maxPop <= 1) continue
      const cur = loc.enemyPops[e.name] !== undefined ? loc.enemyPops[e.name] : e.maxPop
      if (e.maxPop > 0 && cur < e.maxPop && randint(1, 100) <= chancePercent) {
        loc.enemyPops[e.name] = cur + 1
        recovered++
      }
    }
  }
  return recovered
}

// ---- 身体槽位 ----
S.getUnlockedLimbAt = function (day) {
  if (S.player.charId === 'debugger') return D.BODY_SLOTS.filter((s) => s.type === D.SlotType.LIMB).length // 调试者全解锁
  return D.BODY_SLOTS.filter((s) => s.type === D.SlotType.LIMB && day >= s.unlockDay).length
}
S.getUnlockedInternalAt = function (day) {
  if (S.player.charId === 'debugger') return D.BODY_SLOTS.filter((s) => s.type === D.SlotType.INTERNAL).length // 调试者全解锁
  return D.BODY_SLOTS.filter((s) => s.type === D.SlotType.INTERNAL && day >= s.unlockDay).length
}
S.getUnlockedLimb = function () {
  return S.getUnlockedLimbAt(S.player.day) + (S.player.upg.symbiosis || 0) // 深度共生：肢体槽位 +1
}
S.getUnlockedInternal = function () {
  return S.getUnlockedInternalAt(S.player.day)
}
function getSlotLimit(slotType) {
  return slotType === D.SlotType.LIMB ? S.getUnlockedLimb() : S.getUnlockedInternal()
}
function getSlotUsage(slotType) {
  return S.inventory.transplantedOrgans.filter((o) => o.slotType === slotType).length
}

// ---- 建筑 ----
S.building = reactive({
  state: D.BuildingState.NONE,
  coreName: '',
  stage: 1,
  fedAmount: 0,
  canMove: false,
  location: 'camp',
})

function buildingDailyProduction() {
  if (S.building.state !== D.BuildingState.HATCHED) return
  const lines = []
  // 阶段产出表（def.BUILDING_DAILY，复用 CHOICE_EFFECTS 结算）
  const stages = (D.def && D.def.BUILDING_DAILY) || {}
  for (const stage in stages) {
    if (S.building.stage >= +stage) {
      const log = []
      applyDailyEffects(stages[stage], log, S)
      if (log.length) lines.push(log.join('、'))
    }
  }
  if (lines.length) S.pushLog(`活体建筑分泌了：${lines.join('、')}`)
}

// ---- 营地设施（基地建造）：消耗材料建造，可升级 1-3 级，每日自动产出 ----
S.facilities = reactive({}) // 已建设施 id → 等级（1-3）

function consumeResources(itemId, n) {
  let left = n
  const arr = S.inventory.resources
  for (let i = arr.length - 1; i >= 0 && left > 0; i--) {
    if (arr[i].id === itemId) { arr.splice(i, 1); left-- }
  }
  return left === 0
}

S.facilityLevel = function (id) { return S.facilities[id] || 0 }
S.canBuildFacility = function (id) {
  const f = D.FACILITIES[id]
  if (!f || S.facilities[id]) return false
  for (const k in f.cost) {
    if (S.resourceCount(k) < f.cost[k]) return false
  }
  return true
}
S.buildFacility = function (id) {
  const f = D.FACILITIES[id]
  if (!f || S.facilities[id] || !S.canBuildFacility(id)) return false
  for (const k in f.cost) consumeResources(k, f.cost[k])
  S.facilities[id] = 1
  S.pushLog(`你在营地搭建了「${f.icon}${f.name}」。`)
  if (SFX) SFX.craft()
  return true
}
// 设施最高等级（特殊建筑 1 级）
S.facilityMaxLevel = function (id) {
  const f = D.FACILITIES[id]
  return f && f.lv ? f.lv.length : 1
}
S.canUpgradeFacility = function (id) {
  const lv = S.facilities[id]
  const f = D.FACILITIES[id]
  if (!f || !lv || !f.upgCost || !f.upgCost[lv - 1]) return false
  const c = f.upgCost[lv - 1]
  for (const k in c) if (S.resourceCount(k) < c[k]) return false
  return true
}
S.upgradeFacility = function (id) {
  const lv = S.facilities[id]
  const f = D.FACILITIES[id]
  if (!f || !lv || !f.upgCost || !f.upgCost[lv - 1] || !S.canUpgradeFacility(id)) return false
  const c = f.upgCost[lv - 1]
  for (const k in c) consumeResources(k, c[k])
  S.facilities[id] = lv + 1
  S.pushLog(`「${f.icon}${f.name}」升级到了 ${lv + 1} 级，效果提升！`)
  if (SFX) SFX.craft()
  return true
}
// 通用资源产出结算：d 的资源键 → def.CHOICE_EFFECTS 表执行（设施/宠物/建筑/器官共用，新增产出类型只加表项）
function applyDailyEffects(d, log, S) {
  const EFFECTS = D.def && D.def.CHOICE_EFFECTS
  for (const k in d || {}) {
    if (d[k] <= 0) continue
    const fn = EFFECTS[k]
    if (fn) fn(d[k], log, S)
    else log.push(`未知产出：${k}`)
  }
}
// 每日结算：设施产出（按等级；特殊建筑单独处理）
function facilityDailyProduction() {
  const lines = []
  for (const id in S.facilities) {
    const lv = S.facilities[id]
    const f = D.FACILITIES[id]
    if (!f || lv <= 0) continue
    // 酿酒坊：1 菌丝块 + 1 盐水 → 1 菌酿
    if (f.special && f.special.brewery) {
      if (S.resourceCount('fungus') >= 1 && S.resourceCount('brine') >= 1) {
        consumeResources('fungus', 1)
        consumeResources('brine', 1)
        addResource('juice_mash', 1)
        lines.push(`${f.icon}${f.name}：菌酿+1`)
      }
      continue
    }
    if (!f.lv) continue
    const d = f.lv[lv - 1] || {}
    const ch = Array.isArray(f.chance) ? (f.chance[lv - 1] !== undefined ? f.chance[lv - 1] : 1) : (f.chance || 1)
    if (ch < 1 && Math.random() > ch) continue
    const log = []
    applyDailyEffects(d, log, S)
    if (log.length) lines.push(`${f.name}（${lv}级）：${log.join('、')}${ch < 1 ? '（' + Math.round(ch * 100) + '%）' : ''}`)
  }
  if (lines.length) S.pushLog(`营地设施产出：${lines.join('、')}。`)
}

// ---- 动态天气：每日随机生成，影响探索/战斗/过夜 ----
S.weather = reactive({ id: 'clear', name: '晴朗', icon: '☀️', desc: '' })

// 按季节权重随机今日天气（权重池定义在数据层 WEATHER_POOL，可叠加扩展）
function rollWeather() {
  const pool = (D.WEATHER_POOL && D.WEATHER_POOL[S.player.season]) || [['clear', 100]]
  let r = Math.random() * 100
  let pick = 'clear'
  for (const [id, w] of pool) {
    if (r < w) { pick = id; break }
    r -= w
  }
  const w = D.WEATHERS[pick]
  S.weather.id = pick
  S.weather.name = w.name
  S.weather.icon = w.icon
  S.weather.desc = w.desc
  S.pushLog(`今日天气：${w.icon}${w.name}——${w.desc}`)
}
// 恶劣天气的额外行动耐力消耗（探索/移动）
S.weatherStaminaCost = function () {
  const w = D.WEATHERS[S.weather.id]
  return (w && w.cost) || 0
}
// 当前天气对象（供战斗等读取）
S.currentWeather = function () {
  return D.WEATHERS[S.weather.id] || D.WEATHERS.clear
}

// ---- 驯化生物：击败对应生物概率驯化幼崽，提供被动增益 ----
S.pets = reactive([]) // 已驯化宠物 id（唯一）

// 战斗胜利时尝试驯化（可驯化生物概率掉落幼崽，已驯化则不重复；兽栏 +20%）
S.tryTame = function (enemyName) {
  if (!enemyName) return null
  const tameBonus = S.facilityLevel && S.facilityLevel('stable') ? 0.2 : 0
  for (const id in D.PETS) {
    const p = D.PETS[id]
    if (p.source === enemyName && S.pets.indexOf(id) === -1 && Math.random() < Math.min(p.chance + tameBonus, 0.9)) {
      S.pets.push(id)
      S.pushLog(`你在战斗中安抚了幼年${p.name}，它愿意跟随你！${p.icon}（悬停状态栏可查看）`)
      return id
    }
  }
  return null
}
// 宠物标量增益汇总（carry 负重 / explore 探索耐力减免）
S.petBonus = function (key) {
  let v = 0
  for (const id of S.pets) {
    const p = D.PETS[id]
    if (p && p[key]) v += p[key]
  }
  return v
}
// 每日产出
function petDailyProduction() {
  const lines = []
  for (const id of S.pets) {
    const p = D.PETS[id]
    if (!p || !p.daily) continue
    const log = []
    applyDailyEffects(p.daily, log, S)
    if (log.length) lines.push(`${p.icon}${p.name}：${log.join('、')}`)
  }
  if (lines.length) S.pushLog(`宠物伙伴：${lines.join('、')}。`)
}

// ---- 时间与每日结算 ----
S.canPay = function (timeCost, specialCost) {
  // 时间会自然流逝：动作不再受"时间不足"限制，只检查耐力
  return S.player.stamina >= specialCost
}

S.pay = function (timeCost, specialCost, duration, sfxName, noAnim) {
  if (!S.canPay(timeCost, specialCost)) return false
  // 消耗时间的动作展示全局执行动画（战斗中不显示；noAnim 的被动时间损失不弹动画）：动画期间同步播放"进行中"音效
  if (timeCost > 0 && !noAnim && !window.GAME.battle.battle.active) {
    S.showAction(duration, sfxName)
    // 动画结束时播放完成音效收尾（与执行动画时长匹配）
    if (sfxName && SFX && SFX[sfxName]) {
      const coef = S.getLoadingCoef()
      const ms = Math.max(Math.round((duration || 2000) * coef), 100)
      setTimeout(() => {
        if (SFX && SFX[sfxName]) SFX[sfxName]()
      }, ms)
    }
  }
  // 时间扣到 0 封底，不会出现负数；归零后自然流逝到第二天
  S.player.timeLeft = Math.max(S.player.timeLeft - timeCost, 0)
  S.player.stamina -= specialCost
  if (S.player.timeLeft <= 0) endDay()
  return true
}

// ---- 状态病系统 ----
// 施加状态病（key 在 D.DISEASES 中）；不传 days 时按疾病定义时长（>=10 天），永久病固定 999
S.applyDisease = function (key, days) {
  if (!D.DISEASES[key]) return
  const d = D.DISEASES[key]
  const dur = d.forever ? 999 : (days || d.days || 10)
  S.player.diseases[key] = Math.max(S.player.diseases[key] || 0, dur)
  S.pushLog(`你染上了${d.icon}${d.name}！（${d.forever ? '此症深植体内，永不消退，需药剂净化' : '持续约 ' + dur + ' 天，会逐日恶化'}：${d.desc}）`)
}
// 治愈状态病
S.cureDisease = function (key) {
  if (S.player.diseases[key] > 0) {
    delete S.player.diseases[key]
    S.pushLog(`${D.DISEASES[key].icon}${D.DISEASES[key].name}已治愈！`)
    if (SFX) SFX.heal()
    return true
  }
  return false
}
// 每日结算：遍历所有状态病扣对应数值；普通病按剩余天数分阶段、天数递减；永久病固定扣减、永不消退
function applyDiseases() {
  const dis = S.player.diseases
  const EFFECTS = D.def && D.def.DISEASE_DAILY_EFFECTS
  for (const k in dis) {
    const d = D.DISEASES[k]
    if (!d) continue
    const left = dis[k]
    // 阶段判定：普通病按剩余天数匹配（越拖越重）；永久病用固定 daily
    let daily = d.daily || {}
    let stageLabel = ''
    if (!d.forever) {
      for (const s of d.stages || []) {
        if (left >= s.min) { daily = s.daily; stageLabel = s.label; break }
      }
    }
    const parts = []
    for (const kk in daily || {}) {
      const fn = EFFECTS && EFFECTS[kk]
      if (fn && daily[kk] > 0) {
        const p = fn(daily[kk], S)
        if (p) parts.push(p)
      }
    }
    S.pushLog(`${d.icon}${d.name}${stageLabel ? '·' + stageLabel : ''}折磨着你（${parts.join('、')}${d.forever ? '，永久' : '，剩余 ' + left + ' 天'}）`)
    if (SFX) SFX.status()
    if (!d.forever) {
      dis[k] = left - 1 - (S.player.upg.immune || 0)
      if (dis[k] <= 0) delete dis[k]
    }
  }
}

function endDay() {
  if (SFX) SFX.day()
  S.player.day++
  S.player.timeLeft = C.MAX_TIME_PER_DAY
  S.player.stamina = S.getMaxEnergy()
  S.player.morale = Math.max(S.player.morale - C.MORALE_DRAIN_DAY, 0)
  S.player.seasonDay++
  if (S.player.seasonDay > C.SEASON_LENGTH_DAYS) {
    S.player.seasonDay = 1
    S.player.season = (S.player.season + 1) % 4
    // 季节更替：各地发现物重新生长，可再次探索发现
    S.world.foundItems = {}
    S.pushLog(`星球进入了「${D.SEASON_NAMES[S.player.season]}」！各地的发现物重新生长，可以再次探索。`)
    // 季节切换专属剧情
    const sl = D.SEASON_LORE && D.SEASON_LORE[S.player.season]
    if (sl) S.showStory('新季节 · ' + D.SEASON_NAMES[S.player.season], sl)
  }
  rollWeather() // 新一天随机天气
  // 每日自然消耗（季节区分：燥热更渴 / 严寒更饿 / 暴动双增）
  const sc = C.SEASON_COST && C.SEASON_COST[S.player.season]
  const hd = Math.max(Math.round((C.HUNGER_DRAIN - S.player.metabolismBonus - (S.player.traits.metabolism || 0)) * (sc ? sc.hunger : 1)), 0)
  const td = Math.max(Math.round((C.THIRST_DRAIN - S.player.metabolismBonus - (S.player.traits.metabolism || 0)) * (sc ? sc.thirst : 1)), 0)
  S.player.hunger = Math.max(S.player.hunger - hd, 0)
  S.player.thirst = Math.max(S.player.thirst - td, 0)
  if (S.player.hunger <= 0) {
    S.player.life = Math.max(S.player.life - C.HUNGER_DAMAGE, 0)
    S.pushLog(`饥饿侵蚀着你的身体，生命 -${C.HUNGER_DAMAGE}。`)
  }
  if (S.player.thirst <= 0) {
    S.player.life = Math.max(S.player.life - C.THIRST_DAMAGE, 0)
    S.pushLog(`干渴折磨着你，生命 -${C.THIRST_DAMAGE}。`)
  }
  if (S.player.bleeding) {
    S.player.life = Math.max(S.player.life - C.BLEED_DAMAGE, 0)
    S.pushLog(`伤口仍在流血，生命 -${C.BLEED_DAMAGE}！（用止血绷带处理）`)
  }
  // 旧版孢子感染字段迁移到状态病系统
  if ((S.player.sporeDisease || 0) > 0) {
    S.player.diseases.spore = Math.max(S.player.diseases.spore || 0, S.player.sporeDisease)
    S.player.sporeDisease = 0
  }
  // 状态病每日结算（感染/中毒/冻伤/中暑/孢子）
  applyDiseases()
  if (S.player.morale <= C.MORALE_LOW) {
    S.player.life = Math.max(S.player.life - C.MORALE_LOW_DAMAGE, 0)
    S.pushLog(`绝望吞噬着你的意志，生命 -${C.MORALE_LOW_DAMAGE}。`)
  }
  S.pushLog(`=== 第 ${S.player.day} 天 ===`)
  // 腐烂结算：完全腐烂的食物/饮水被丢弃
  const rotBefore = S.inventory.resources.length
  S.inventory.resources = S.inventory.resources.filter((r) => {
    const rot = S.rotInfo(r)
    return !(rot && rot.rotted)
  })
  const rottedCount = rotBefore - S.inventory.resources.length
  if (rottedCount > 0) S.pushLog(`有 ${rottedCount} 份食物/饮水已经彻底腐烂，被丢弃了。`)
  if (S.player.life <= 0) {
    S.player.life = 0
    S.player.dead = true
    S.clearSave()
    S.pushLog('你死了。你的血肉溶解，融入了这颗活物星球，循环仍在继续……')
    return
  }
  onDayStarted()
  if (!S.player.dead) S.saveGame()
}

function onDayStarted() {
  S.player.tempLifeBonus = 0
  // 研究每日效果（定义在数据层 daily 字段，新增带每日效果的研究零改动）
  for (const id in S.player.upg) {
    const r = D.RESEARCH_DEFS[id]
    if (r && r.daily && S.player.upg[id] > 0) {
      r.daily({ S, player: S.player, id, rank: S.player.upg[id] })
    }
  }
  // 各地产出点按各自速度恢复产量（累计天数，达到恢复间隔才 +1）
  for (const locId in S.world.discoveredItems) {
    const list = S.world.discoveredItems[locId]
    if (!list) continue
    for (const it of list) {
      if (it.finite) continue // 一次性资源不恢复
      const max = it.maxStock || C.ITEM_STOCK_MAX
      const cur = it.stock === undefined ? max : it.stock
      if (cur >= max) {
        it.regen = 0
        continue
      }
      const need = it.restoreDays || C.ITEM_RESTORE_DAILY
      it.regen = (it.regen || 0) + 1
      if (it.regen >= need) {
        it.stock = Math.min(cur + 1, max)
        it.regen = 0
      }
    }
  }
  if (S.player.abilityCooldown > 0) {
    S.player.abilityCooldown--
    if (S.player.abilityCooldown === 0 && S.getCharacterAbility()) {
      S.pushLog(`你的特殊能力「${S.getCharacterAbility().name}」已经恢复！`)
    }
  }
  S.player.life = Math.min(S.player.life, S.getMaxLife())
  S.pushLog('新的一天，你的生存本能重新凝聚。')
  checkBodyAdaptation()
  applyLocationOvernight()
  applySeasonEffects()
  recoverPopulations(C.POP_RECOVER[S.player.season])
  expireSuperCreatures()
  rollDailyEvent()
  if (S.player.dead) return
  buildingDailyProduction()
  facilityDailyProduction()
  petDailyProduction()
  applyOrganPassives()
  applyOrganMaintenance()
}

// 超级生物到期消失（出现 5 天后）
function expireSuperCreatures() {
  if (!S.world.superCreatures) return
  for (const key in S.world.superCreatures) {
    const sc = S.world.superCreatures[key]
    if (S.player.day >= sc.expireDay) {
      const loc = S.locations[key]
      S.pushLog(`超级生物「${sc.enemy.name}」离开了${loc ? '「' + loc.name + '」' : '这片区域'}，消失得无影无踪。`)
      delete S.world.superCreatures[key]
    }
  }
}

function checkBodyAdaptation() {
  const curL = S.getUnlockedLimbAt(S.player.day)
  const curI = S.getUnlockedInternalAt(S.player.day)
  const prevL = S.getUnlockedLimbAt(S.player.day - 1)
  const prevI = S.getUnlockedInternalAt(S.player.day - 1)
  if (curL > prevL || curI > prevI) {
    S.pushLog(`你的身体逐渐适应了异星器官！移植槽位增加（肢体 ${curL}、内部 ${curI}）。`)
  }
}

function applyLocationOvernight() {
  const loc = S.locations[S.world.currentLocation]
  if (!loc) return
  const wx = S.currentWeather() // 今日天气叠加过夜效果
  if (loc.overnight.energyBonus > 0) {
    const eb = loc.overnight.energyBonus + (S.player.upg.thermal || 0)
    S.player.stamina = Math.min(S.player.stamina + eb, S.getMaxEnergy())
    S.pushLog(`地热滋养着你，恢复了 ${eb} 点耐力。`)
  }
  // 细雨过夜自动收集盐水
  if (wx.brine) {
    addResource('brine', wx.brine)
    S.pushLog(`细雨过夜，容器里积起了 ${wx.brine} 份盐水。`)
  }
  const wc = Math.max(loc.overnight.waterCost - (S.player.upg.desert || 0) + (wx.water || 0), 0)
  if (wc > 0) {
    if (S.resourceCount('brine') >= wc) {
      takeBrineItems(wc)
      S.pushLog(`严酷的环境消耗了你 ${wc} 份盐水。`)
    } else {
      S.player.life = Math.max(S.player.life - 5, 0)
      S.pushLog('没有水应对严酷环境，生命 -5！')
      if (Math.random() < 0.5) S.applyDisease('heatstroke') // 缺水过夜有概率中暑
    }
  }
  const ld = Math.max(loc.overnight.lifeDamage - (S.player.upg.coldproof || 0) * 5 + Math.ceil((wx.life || 0) * (S.facilityLevel('fort') ? 0.5 : 1)), 0)
  if (ld > 0 && !S.hasHeatProtection()) {
    S.player.life = Math.max(S.player.life - ld, 0)
    S.pushLog(`严寒侵蚀着你的身体，生命 -${ld}！（移植「熔壳热腺」或「厚脂层」可抵御）`)
    if (Math.random() < 0.5) S.applyDisease('frostbite') // 无抗寒过夜有概率冻伤
  }
  // 露营术：野外过夜恢复生命
  if ((S.player.upg.bunk || 0) > 0) {
    const bh = (S.player.upg.bunk || 0) * 5
    S.player.life = Math.min(S.player.life + bh, S.getMaxLife())
    S.pushLog(`露营术让你在野外安稳休整，恢复了 ${bh} 点生命。`)
  }
  const climate = D.SEASONAL_CLIMATE[loc.id] && D.SEASONAL_CLIMATE[loc.id][S.player.season]
  if (climate) {
    if (climate.energyBonus) {
      S.player.stamina = Math.min(S.player.stamina + climate.energyBonus, S.getMaxEnergy())
      S.pushLog(`地区气候：${climate.note}，耐力 +${climate.energyBonus}。`)
    }
    if (climate.waterCost) seasonWaterDrain(climate.waterCost, `地区气候：${climate.note}。`)
    if (climate.lifeDamage) {
      if (S.hasHeatProtection()) {
        S.pushLog(`地区气候：${climate.note}（抗寒器官抵御了伤害）。`)
      } else {
        S.player.life = Math.max(S.player.life - climate.lifeDamage, 0)
        S.pushLog(`地区气候：${climate.note}，生命 -${climate.lifeDamage}！`)
      }
    }
  }
  if (S.player.life <= 0) {
    S.player.life = 0
    S.player.dead = true
    S.clearSave()
    S.pushLog('你死了。你的血肉溶解，融入了这颗活物星球，循环仍在继续……')
  }
}

function applySeasonEffects() {
  // 季节过夜效果表（def.SEASON_EFFECTS：waterDrain 额外水耗 / lifeDamage 无抗寒冻伤 / note 提示）
  const se = (D.def && D.def.SEASON_EFFECTS) ? D.def.SEASON_EFFECTS[S.player.season] : null
  if (se) {
    if (se.waterDrain) seasonWaterDrain(se.waterDrain, se.note)
    else if (se.note) S.pushLog(se.note)
    if (se.lifeDamage && !S.hasHeatProtection()) {
      S.player.life = Math.max(S.player.life - se.lifeDamage, 0)
      S.pushLog(se.coldNote || `季节严寒侵蚀着你，生命 -${se.lifeDamage}！`)
    }
  }
  if (S.player.life <= 0) {
    S.player.life = 0
    S.player.dead = true
    S.clearSave()
  }
}

// 消耗背包中的盐水物品（用于过夜/气候消耗）
function takeBrineItems(n) {
  let left = n
  S.inventory.resources = S.inventory.resources.filter((r) => {
    if (r.id === 'brine' && left > 0) {
      left--
      return false
    }
    return true
  })
}

function seasonWaterDrain(amount, msg) {
  if (S.resourceCount('brine') >= amount) {
    takeBrineItems(amount)
    if (msg) S.pushLog(msg)
  } else {
    S.player.life = Math.max(S.player.life - 5, 0)
    S.pushLog('没有水应对严酷气候，生命 -5！')
  }
}

/*
 * applyOrganPassives：器官被动
 * passiveDays 周期累计（passiveTicks），达标才产出
 */
function applyOrganPassives() {
  const totals = { fungus: 0, brine: 0, stamina: 0, data: 0 }
  if (!S.player.passiveTicks) S.player.passiveTicks = {}
  for (const organ of S.inventory.transplantedOrgans) {
    const days = organ.passiveDays || 1
    S.player.passiveTicks[organ.id] = (S.player.passiveTicks[organ.id] || 0) + 1
    if (S.player.passiveTicks[organ.id] < days) continue
    S.player.passiveTicks[organ.id] = 0
    if (organ.passive.food) totals.fungus += organ.passive.food
    if (organ.passive.water) totals.brine += organ.passive.water
    if (organ.passive.energy) totals.stamina += organ.passive.energy
    if (organ.passive.data) totals.data += organ.passive.data
  }
  // 器官被动产出（复用 CHOICE_EFFECTS 结算）
  const log = []
  applyDailyEffects(totals, log, S)
  if (log.length) S.pushLog(`器官被动效果：${log.join('、')}`)
}

function applyOrganMaintenance() {
  let total = 0
  for (const organ of S.inventory.transplantedOrgans) {
    total += Math.max(organ.maint - S.player.maintReduction, 1)
  }
  if (total <= 0) return
  if (S.player.stamina < total) {
    S.pushLog('耐力不足以维持所有移植器官！')
    rejectMostExpensiveOrgan()
    return
  }
  S.player.stamina -= total
  S.pushLog(`移植器官每日维持消耗了 ${total} 点耐力。`)
}

function rejectMostExpensiveOrgan() {
  let worst = null
  for (const organ of S.inventory.transplantedOrgans) {
    if (!worst || organ.maint > worst.maint) worst = organ
  }
  if (worst) {
    S.inventory.transplantedOrgans = S.inventory.transplantedOrgans.filter((o) => o !== worst)
    S.pushLog(`「${worst.name}」开始排斥，被强制切除！`)
  }
}

S.hasHeatProtection = function () {
  return S.inventory.transplantedOrgans.some((o) => o.id === 'heat_gland' || o.id === 'fat_layer')
}

// ---- 特殊事件 ----
function rollDailyEvent() {
  if (S.player.dead) return
  if (randint(1, 100) > 30) return
  S.applyRandomEvent()
}

S.applyRandomEvent = function () {
  const pool = D.SEASON_EVENT_POOL[S.player.season]
  if (!pool.length) return
  applyEvent(pool[randint(0, pool.length - 1)])
}

function applyEvent(eventId) {
  S.pushLog(D.EVENT_NAMES[eventId] || '【特殊事件】未知事件。')
  S.showEventNotice('特殊事件', D.EVENT_NAMES[eventId] || '发生了未知事件。')
  switch (eventId) {
    case 'gentle_rain': addResource('brine', 1); S.pushLog('细雨过后，水洼里积起了盐水。'); break
    case 'pollen_drift': S.player.data++; break
    case 'mushroom_boom': addResource('fungus', 2); S.pushLog('菌菇疯长，你收获了一些菌丝块。'); break
    case 'heat_wave': seasonWaterDrain(1, ''); break
    case 'fohn_gale': seasonWaterDrain(2, ''); break
    case 'lava_seep': addResource('stone', 1); S.pushLog('热泉渗出燧石矿脉，你拾起了一块燧石。'); break
    case 'beast_tide': addResource('fungus', 2); recoverPopulations(50); S.pushLog('兽潮涌动！你趁机收集了一些菌丝块，生物群落暴涨。'); break
    case 'night_raid': S.player.life = Math.max(S.player.life - (S.facilityLevel('fort') ? 3 : 5), 0); break
    case 'blood_moon': recoverPopulations(70); break
    case 'aurora': S.player.data += 2; break
    case 'blizzard': seasonWaterDrain(1, ''); break
    case 'ice_fall': addResource('bone', 1); S.pushLog('冰川崩裂，露出了远古骸骨，你拾起了一根。'); break
  }
  if (S.player.life <= 0) {
    S.player.life = 0
    S.player.dead = true
    S.clearSave()
    S.pushLog('你死了。你的血肉溶解，融入了这颗活物星球，循环仍在继续……')
  }
}

// ---- 抉择事件：触发多选项决策弹窗（def 可自定义，用于探索事件接入） ----
S.triggerChoiceEvent = function (id, def) {
  const ev = def || D.CHOICES[id]
  if (!ev || S.ui.choiceEvent) return false
  S.ui.choiceEvent = {
    id,
    def: ev,
    title: ev.title,
    text: ev.text,
    choices: ev.choices.map((c) => ({
      label: c.label,
      text: c.text,
      costText: c.cost ? '消耗：' + Object.keys(c.cost).map((k) => `${(D.ITEMS[k] && D.ITEMS[k].name) || k}×${c.cost[k]}`).join('、') : '',
    })),
  }
  if (SFX) SFX.open()
  return true
}
// 随机触发一个抉择事件（排除正在进行的）
S.triggerRandomChoice = function () {
  const ids = Object.keys(D.CHOICES || {})
  if (!ids.length || S.ui.choiceEvent) return false
  const pick = ids[randint(0, ids.length - 1)]
  return S.triggerChoiceEvent(pick)
}
// 应用抉择结果（result/win/lose 效果表，time/lore/disease 等特殊结果类型也注册在表内）
function applyChoiceResult(res, log) {
  if (!res) return
  // 抉择结果效果表（def.CHOICE_EFFECTS 集中注册，扩展新结果类型只需加表项）
  const EFFECTS = D.def && D.def.CHOICE_EFFECTS
  for (const k in res) {
    if (k === 'battle') continue
    const fn = EFFECTS[k]
    if (fn) fn(res[k], log, S)
    else log.push(`未知效果：${k}`)
  }
}
// 选择选项后结算
S.resolveChoice = function (idx) {
  const ev = S.ui.choiceEvent
  if (!ev) return
  const def = ev.def || (D.CHOICES[ev.id] || null)
  const ch = def ? def.choices[idx] : null
  S.ui.choiceEvent = null
  if (!ch) return
  const log = []
  // 前置消耗
  if (ch.cost) for (const k in ch.cost) consumeResources(k, ch.cost[k])
  // 属性判定或直接结果
  let res = ch.result || {}
  if (ch.check) {
    const bonus = S.petBonus('judge') || 0
    const val = (S.player.attrs[ch.check.attr] || 1) + bonus
    if (val >= ch.check.value) {
      res = ch.check.win || {}
      log.push(`判定成功（${ch.check.attr} ${val} ≥ ${ch.check.value}）！`)
    } else {
      res = ch.check.lose || {}
      log.push(`判定失败（${ch.check.attr} ${val} < ${ch.check.value}）……`)
    }
  }
  applyChoiceResult(res, log)
  // 驯化：随机一只未驯化宠物建立羁绊（选择项级属性）
  if (ch.tame) {
    const avail = Object.keys(D.PETS || {}).filter((pid) => S.pets.indexOf(pid) === -1)
    if (avail.length) {
      const pid = avail[randint(0, avail.length - 1)]
      S.pets.push(pid)
      log.push(`你与${D.PETS[pid].name}建立了羁绊！${D.PETS[pid].icon}`)
    }
  }
  // 注：res 的 time/lore/disease 结果已由 def.CHOICE_EFFECTS 表统一处理
  if (log.length) S.pushLog(`【抉择】${log.join('、')}。`)
  // 触发战斗选项
  if (ch.battle) {
    const be = D.EVENT_ENEMIES && D.EVENT_ENEMIES[ch.battle]
    if (be) S.startEventBattle(be)
  }
  // 死亡检查
  if (S.player.life <= 0) {
    S.player.life = 0
    S.player.dead = true
    S.clearSave()
    S.pushLog('你死了。你的血肉溶解，融入了这颗活物星球，循环仍在继续……')
  }
  if (SFX) SFX.close()
}

// ---- 结局：死亡时按生存表现判定（判定逻辑集中 def.endingOf，跨周目解锁记录） ----
S.determineEnding = function () {
  return D.def.endingOf({
    lore: S.world.lore,
    day: S.player.day,
    buildingStage: S.building.stage,
    transplanted: S.inventory.transplantedOrgans.length,
  })
}
S.unlockEnding = function (id) {
  try {
    const arr = JSON.parse(localStorage.getItem('alien_survival_endings_v1') || '[]')
    if (arr.indexOf(id) === -1) { arr.push(id); localStorage.setItem('alien_survival_endings_v1', JSON.stringify(arr)) }
  } catch (e) {}
}
S.getEndings = function () {
  try { return JSON.parse(localStorage.getItem('alien_survival_endings_v1') || '[]') } catch (e) { return [] }
}

// ---- UI 挂起状态 ----
S.ui = reactive({
  pendingBattleEnemy: null,
  modal: null, // 'research' | 'craft' | 'ability' | 'body' | 'map' ...
  pendingCost: null, // 战斗/探索结束后统一结算 { time, stamina, hunger, thirst }
  busy: false, // 全局动作执行中（loading 动画）
  actionKind: 'explore', // 当前执行的动作类型（决定 loading 动画）
  eventNotice: null, // 特殊事件弹窗：{ title, text }
  choiceEvent: null, // 抉择事件弹窗：{ id, title, text, choices: [{label,text,costText}] }
  restPrompt: null, // 耐力不足弹窗：{ text }
  statusKey: null, // 负面状态详情弹窗：当前查看的状态 key（bleeding/morale/疾病 id）
  storyQueue: [], // 剧情弹窗队列（首达生态/首次行为/剧情线索/季节等依次展示）
  storyOnClose: null, // 剧情队列清空后的串行回调（如战斗胜利后继续三选一/器官/结算）
  questJustDone: null, // 新手任务完成提示（QuestPanel 短暂高亮显示任务名）
})

// 特殊事件弹窗（与剧情弹窗共用队列，按顺序依次展示，避免互相覆盖吞掉剧情）
S.showEventNotice = function (title, text) {
  S.ui.storyQueue.push({ title, text })
  S.ui.eventNotice = S.ui.storyQueue[0]
  if (SFX) SFX.open()
}

// ---- 新手任务系统：行动完成后调用，链式完成首个满足条件的任务并发奖励（调试者跳过） ----
S.checkQuest = function () {
  if (!S.player || S.player.charId === 'debugger') return null
  S.player.quests = S.player.quests || {}
  const qs = (D.def && D.def.NEWBIE_QUESTS) || []
  for (const q of qs) {
    if (S.player.quests[q.id]) continue
    if (!q.check(S)) return null // 链式顺序引导：当前任务未完成则后续不查
    S.player.quests[q.id] = true
    const log = []
    if (q.reward) {
      const E = D.def && D.def.CHOICE_EFFECTS
      for (const k in q.reward) { const fn = E && E[k]; if (fn) fn(q.reward[k], log, S) }
    }
    S.pushLog(`📋 新手任务「${q.title}」完成！${log.length ? '奖励：' + log.join('、') : ''}`)
    if (SFX) SFX.powerup()
    // 全部任务完成：收尾提示
    const allDone = ((D.def && D.def.NEWBIE_QUESTS) || []).every((x) => S.player.quests[x.id])
    if (allDone) S.pushLog('🎉 新手引导全部完成！你已经掌握了异星生存的基本法则，去书写你的故事吧。')
    S.ui.questJustDone = q.title
    setTimeout(() => { if (S.ui) S.ui.questJustDone = null }, 2600)
    return q
  }
  return null
}
// ---- 剧情弹窗队列：首达/首次行为/剧情线索/季节切换等依次展示，支持关闭后串行回调 ----
S.showStory = function (title, text, onClose) {
  S.ui.storyQueue.push({ title, text })
  if (onClose) S.ui.storyOnClose = onClose
  S.ui.eventNotice = S.ui.storyQueue[0]
  if (SFX) SFX.open()
}
S.closeEventNotice = function () {
  if (S.ui.storyQueue.length) {
    S.ui.storyQueue.shift()
    if (S.ui.storyQueue.length) {
      S.ui.eventNotice = S.ui.storyQueue[0]
    } else {
      S.ui.eventNotice = null
      const cb = S.ui.storyOnClose
      S.ui.storyOnClose = null
      if (cb) cb()
    }
  } else {
    S.ui.eventNotice = null
  }
  if (SFX) SFX.close()
}

// 首次到达新生态的地图：弹窗展示对应生态剧情（每生态仅一次）
S.checkArrivalStory = function () {
  if (!S.player || S.player.charId === 'debugger') return
  const loc = S.locations[S.world.currentLocation]
  if (!loc || S.player.dead) return
  const eco = Array.isArray(loc.eco) ? loc.eco[0] : loc.eco
  if (!eco) return
  S.world.arrivedEcos = S.world.arrivedEcos || {}
  if (S.world.arrivedEcos[eco]) return
  S.world.arrivedEcos[eco] = true
  const story = D.ECO_ARRIVAL && D.ECO_ARRIVAL[eco]
  if (story) S.showStory('首次抵达 · ' + eco, story)
}
// 首次行为的剧情提示（research/rest/organHarvest 等，各触发一次）；onClose：剧情弹窗关闭后的串行回调；返回是否弹了剧情
S.checkFirstAct = function (key, onClose) {
  if (!S.player || S.player.charId === 'debugger') return false
  S.world.firstActs = S.world.firstActs || {}
  if (S.world.firstActs[key]) return false
  S.world.firstActs[key] = true
  const story = D.FIRST_ACTS && D.FIRST_ACTS[key]
  if (story) {
    S.showStory('初次体验', story, onClose)
    return true
  }
  return false
}

// 耐力不足弹窗：动作因耐力不足失败时提示休息
S.promptRest = function (text) {
  S.ui.restPrompt = { text }
  if (SFX) SFX.alert()
}
S.dismissRest = function () {
  S.ui.restPrompt = null
}
// 弹窗内直接休息
S.restNow = function () {
  S.ui.restPrompt = null
  S.onRest()
}

// ---- 全局执行动画：消耗时间的动作短暂展示 loading ----
// 角色 loading 系数：动作 loading 时长 = 基础时长 × 角色系数（普通角色 1，调试者 0.1）
S.getLoadingCoef = function () {
  const def = D.CHARACTER_DEFS[S.player.charId]
  return (def && def.loadingCoef) || 1
}
let busyTimer = null
S.showAction = function (ms, sfxKind) {
  S.ui.busy = true
  S.ui.actionKind = sfxKind || 'explore'
  if (busyTimer) clearTimeout(busyTimer)
  // 动画开始：同步启动"进行中"音效
  if (sfxKind && SFX && SFX.startActionLoop) SFX.startActionLoop(sfxKind)
  const coef = S.getLoadingCoef()
  busyTimer = setTimeout(() => {
    S.ui.busy = false
    // 动画结束：同步停止"进行中"音效
    if (sfxKind && SFX && SFX.stopActionLoop) SFX.stopActionLoop()
  }, Math.max(Math.round((ms || 2000) * coef), 100))
}

// 结算延迟扣除的动作消耗（先执行，结束后扣时间/耐力/饥渴）
S.settlePendingCost = function () {
  const c = S.ui.pendingCost
  if (!c) return
  S.ui.pendingCost = null
  if (c.time) S.player.timeLeft = Math.max(S.player.timeLeft - c.time, 0)
  if (c.stamina) S.player.stamina = Math.max(S.player.stamina - c.stamina, 0)
  drainBody(c.hunger || 0, c.thirst || 0)
  if (!S.player.dead && S.player.timeLeft <= 0) endDay()
}

// 剧情线索：初次击败对应生物时收录线索（日志提示 + 线索图鉴解锁）
S.collectLore = function (enemyName) {
  if (!enemyName || !S.world) return
  // 调试者：一次性解锁全部剧情线索
  if (S.player && S.player.charId === 'debugger') {
    S.unlockAllLore()
    return
  }
  const lore = D.LORE && D.LORE[enemyName]
  if (!lore || S.world.lore[enemyName]) return
  S.world.lore[enemyName] = true
  S.pushLog(`📡 脉动回声·「${lore.t}」：${lore.s}`)
  if (SFX) SFX.discover()
  // 集齐全部线索：解锁完整剧情
  if (Object.keys(S.world.lore).length >= Object.keys(D.LORE).length) {
    S.pushLog(`你已集齐全部脉动回声！完整真相《循环之书》已解锁，可在底部「脉动回声」中阅读。`)
    if (SFX) SFX.powerup()
  }
}

// 调试者：解锁全部剧情线索（重复调用只提示一次）
S.unlockAllLore = function () {
  if (!D.LORE) return 0
  let added = 0
  for (const name in D.LORE) {
    if (!S.world.lore[name]) {
      S.world.lore[name] = true
      added++
    }
  }
  if (added > 0) {
    S.pushLog(`调试者：脉动回声已全部解锁（${Object.keys(D.LORE).length} 条）。`)
    if (SFX) SFX.discover()
  }
  return added
}

S.openModal = function (name) {
  if (S.player.dead) return
  S.ui.modal = name
  if (SFX) SFX.open()
}
S.closeModal = function () {
  S.ui.modal = null
  if (SFX) SFX.close()
}
// 打开负面状态详情（状态栏图标点击）：记录当前查看的状态 key
S.openStatus = function (key) {
  if (S.player.dead) return
  S.ui.statusKey = key
  S.ui.modal = 'disease'
  if (SFX) SFX.open()
}

// ---- 研究（独立系统） ----
S.getCharacterAbility = function () {
  const def = D.CHARACTER_DEFS[S.player.charId]
  return def ? def.ability : null
}

S.useAbility = function () {
  if (S.player.dead || window.GAME.battle.battle.active) return
  const ab = S.getCharacterAbility()
  if (!ab) return
  if (S.player.abilityCooldown > 0) {
    if (SFX) SFX.error()
    S.pushLog(`特殊能力还需要 ${S.player.abilityCooldown} 天才能恢复。`)
    return
  }
  if (!S.canPay(ab.time, 0)) {
    if (SFX) SFX.error()
    S.promptRest(`耐力不足，无法使用能力（需要 ${ab.time} 耐力），先休息一下吧。`)
    return
  }
  S.pay(ab.time, 0, undefined, 'use')
  S.player.abilityCooldown = randint(5, 10)
  // 技能效果集中表：kind → 效果实现（扩展新技能类型只需加表项 + def.ABILITY_INFO 元信息）
  const EFFECTS = {
    combat(ab) {
      S.player.abilityBuff = { combat: ab.value }
      return `你屏息凝神，激发「${ab.name}」：下一次战斗伤害 +${ab.value}。`
    },
    researchBoost(ab) {
      S.player.researchBoost = ab.value
      return `灵感迸发！接下来的 ${ab.value} 次研究获得的星之记忆翻倍。`
    },
    heal(ab) {
      S.player.bleeding = false
      S.player.life = Math.min(S.player.life + ab.value, S.getMaxLife())
      return `你进行了急救，止住流血并恢复 ${ab.value} 点生命。`
    },
    restore(ab) {
      S.player.stamina = Math.min(S.player.stamina + ab.value, S.getMaxEnergy())
      S.player.morale = Math.min(S.player.morale + ab.value, C.MAX_MORALE)
      return `潮汐般的气息流遍全身，耐力与精神恢复 ${ab.value}。`
    },
  }
  const effectFn = EFFECTS[ab.kind]
  if (effectFn) {
    const msg = effectFn(ab)
    if (msg) S.pushLog(msg)
  }
}

/*
 * onResearchAction：研究收益公式
 * 基础 + 特质 + int/5 + 洞察等级（insight）
 * 研究增益翻倍
 */
S.onResearchAction = function () {
  if (S.player.dead || window.GAME.battle.battle.active) return
  if (!S.canPay(C.RESEARCH_TIME, 0)) {
    if (SFX) SFX.error()
    S.promptRest('耐力不足，无法研究，先休息一下吧。')
    return
  }
  S.pay(C.RESEARCH_TIME, 0, undefined, 'research')
  drainBody(C.ACTION_HUNGER, C.ACTION_THIRST)
  if (S.player.dead) return
  // 第一次研究：剧情提示
  S.checkFirstAct('research')
  let gain = C.RESEARCH_GAIN + (S.player.traits.researchGain || 0) + Math.floor((S.player.attrs.int || 0) / 5) + (S.player.upg.insight || 0)
  if (S.player.researchBoost > 0) {
    gain *= 2
    S.player.researchBoost--
  }
  S.player.data += gain
  S.pushLog(`你研究异星生物，获得 +${gain} 点星之记忆。`)
  // 新手任务：研究计数
  S.player.researchCount = (S.player.researchCount || 0) + 1
  S.checkQuest()
}

// 播放当前地点生态对应的背景音乐（多群落取第一个）
S.playLocationMusic = function () {
  const loc = S.locations[S.world.currentLocation]
  if (!loc || !SFX || !SFX.music) return
  const eco = Array.isArray(loc.eco) ? loc.eco[0] : loc.eco
  SFX.music.play(eco)
}

// ---- 路口通行 ----
S.onDestination = function (destId) {
  if (S.player.dead || window.GAME.battle.battle.active) return
  const from = S.locations[S.world.currentLocation]
  const dest = S.locations[destId]
  if (!from || !dest) return
  // 调试者：无视邻接/道路/能力限制，可直接前往任意地点
  const isDebug = S.player.charId === 'debugger'
  if (!isDebug && !from.neighbors.includes(destId)) return
  if (!isDebug && !S.isRoadOpen(from.id, destId)) {
    if (SFX) SFX.error()
    S.pushLog('这条路尚未勘探，继续探索可解锁新的路口。')
    return
  }
  // 特定地点需要先研究对应能力（水下呼吸/飞行）
  if (!isDebug && dest.require && !(S.player.upg[dest.require] > 0)) {
    if (SFX) SFX.error()
    const reqName = D.RESEARCH_DEFS[dest.require] ? D.RESEARCH_DEFS[dest.require].name : dest.require
    S.pushLog(`「${dest.name}」需要先研究「${reqName}」才能前往。`)
    return
  }
  if (!S.canPay(C.MOVE_TIME, C.MOVE_SPECIAL)) {
    if (SFX) SFX.error()
    S.promptRest(`耐力不足，无法通行（需要 ${C.MOVE_SPECIAL} 耐力），先休息一下吧。`)
    return
  }
  S.world.currentLocation = destId
  S.world.discovered[destId] = true
  S.playLocationMusic()
  S.pushLog(`你移动到了「${dest.name}」（${D.ecoText(dest.eco)}）。`)
  S.pay(Math.max(C.MOVE_TIME - (S.player.upg.quick || 0) * 5, 10), Math.max(C.MOVE_SPECIAL - (S.player.upg.sprint || 0), 0) + S.weatherStaminaCost(), undefined, 'move')
  // 首次到达新生态：弹窗展示该生态剧情
  S.checkArrivalStory()
}

S.onCoreChallenge = function (enemy) {
  if (S.player.dead || window.GAME.battle.battle.active) return
  if (!enemy || enemy.pop <= 0) return
  if (S.player.stamina < C.BATTLE_STAMINA) {
    if (SFX) SFX.error()
    S.promptRest(`耐力不足，无法挑战（需要 ${C.BATTLE_STAMINA} 耐力），先休息一下吧。`)
    return
  }
  S.ui.pendingCost = { time: C.COMBAT_TIME, stamina: C.BATTLE_STAMINA, hunger: C.ACTION_HUNGER, thirst: C.ACTION_THIRST }
  S.pushLog(`你逼近了核心节点怪物「${enemy.name}」！`)
  S.ui.pendingBattleEnemy = enemy
  window.GAME.battle.startBattle(enemy)
}

/*
 * onBattleEnded：战斗结束结算
 * 1) 胜利：奖励（applyVictoryRewards）+ 士气 + 10% 抉择
 * 2) 失败：士气 -8
 * 3) 超级生物消失
 * 4) 统一消耗（settlePendingCost）
 */
S.onBattleEnded = function (victory) {
  const enemy = S.ui.pendingBattleEnemy
  const B = window.GAME.battle
  if (victory && enemy) {
    const gains = applyVictoryRewards(enemy)
    S.addScoutProgress(C.SCOUT_PER_HUNT)
    S.player.morale = Math.min(S.player.morale + 5, C.MAX_MORALE)
    gains.push('士气 +5')
    if (SFX) SFX.victory()
    S.pushLog(`你成功猎杀了「${enemy.name}」，士气高涨！`)
    if (B && B.battle.summary && B.battle.summary.gains) B.battle.summary.gains.push(...gains)
    // 新手任务：猎杀计数
    S.player.killCount = (S.player.killCount || 0) + 1
    S.checkQuest()
    // 战斗胜利后偶遇抉择（10%）
    if (randint(1, 100) <= 10) S.triggerRandomChoice()
  } else {
    S.player.morale = Math.max(S.player.morale - 8, 0)
    if (SFX) SFX.defeat()
    S.pushLog('战斗失败，你负伤撤退了，身心俱疲。')
    if (B && B.battle.summary && B.battle.summary.gains) B.battle.summary.gains.push('士气 -8')
  }
  S.ui.pendingBattleEnemy = null
  // 超级生物：击败后消失
  if (victory && S.ui.pendingSuperLoc) {
    delete S.world.superCreatures[S.ui.pendingSuperLoc]
    S.pushLog('你击败了超级生物！它的尸骸慢慢化作星尘消散。')
  }
  S.ui.pendingSuperLoc = null
  // 战斗结束：统一结算消耗
  S.settlePendingCost()
}

/*
 * applyVictoryRewards：战利品结算（战斗胜利后调用）
 * 1) 食物/水/星忆
 * 2) 生态材料 75% 主料 / 25% 辅料
 * 3) 器官
 * 4) 超级核心
 * 5) 驯化（tryTame）
 * 6) 猎手直觉
 * 7) 群落扣减（reduceEnemyPopulation）
 */
function applyVictoryRewards(enemy) {
  const gains = []
  const loot = enemy.loot
  const loc = S.locations[S.world.currentLocation]
  // 星之记忆按生物星级（难度战力）计算掉落
  const dataGain = D.dataReward ? D.dataReward(enemy) : (loot[D.ResourceType.DATA] || 0)
  // 战利品：食物/水以物品形式获得（菌丝块/盐水），可手动食用
  if (loot[D.ResourceType.FOOD] > 0) { addResource('fungus', loot[D.ResourceType.FOOD]); gains.push(`菌丝块 ×${loot[D.ResourceType.FOOD]}`) }
  if (loot[D.ResourceType.WATER] > 0) { addResource('brine', loot[D.ResourceType.WATER]); gains.push(`盐水 ×${loot[D.ResourceType.WATER]}`) }
  if (dataGain > 0) { S.player.data += dataGain; gains.push(`星之记忆 +${dataGain}`) }
  S.pushLog(`获得战利品：菌丝块 ×${loot[D.ResourceType.FOOD]}、盐水 ×${loot[D.ResourceType.WATER]}、星之记忆 +${dataGain}。`)
  // 材料战利品：掉落当前生态区的生态物品（主材料为主 75%，辅助材料为辅 25%），带稀有度品质
  if (loot[D.ResourceType.MATERIALS] > 0) {
    const eco = loc && loc.eco && loc.eco.length ? loc.eco[0] : null
    const series = eco ? D.ECO_SERIES[eco] : null
    let item
    if (series) {
      // 生态物品：主材料高概率（75%），辅助材料为辅（25%）；辅助排除菌丝块/盐水（已作为食物水战利品）
      const matAux = series.aux.filter((a) => a !== 'fungus' && a !== 'brine')
      item = Math.random() < 0.75 ? series.main.id : (matAux.length ? matAux[randint(0, matAux.length - 1)] : series.main.id)
    } else {
      const pool = ['metal', 'wood', 'stone', 'bone', 'fiber', 'clay']
      item = pool[randint(0, pool.length - 1)]
    }
    const n = loot[D.ResourceType.MATERIALS]
    const rarity = D.materialRarity(enemy)
    addResource(item, n, rarity)
    const label = rarity ? `${rarity}·${D.ITEMS[item].name}` : D.ITEMS[item].name
    gains.push(`${label} ×${n}`)
    S.pushLog(`获得战利品：${label} ×${n}。`)
  }
  if (enemy.organ && !S.hasOrgan(enemy.organ.id)) {
    gains.push(`器官「${enemy.organ.name}」（待采集）`)
    S.pushLog(`「${enemy.name}」的尸体上留有器官「${enemy.organ.name}」，可在战斗结算界面采集。`)
  }
  if (enemy.core && S.building.state === D.BuildingState.NONE) {
    S.building.state = D.BuildingState.HAS_CORE
    S.building.coreName = enemy.name
    gains.push(`星球核心「${enemy.name}」`)
    S.pushLog(`你取出了星球核心「${enemy.name}」！到建筑面板孵化它。`)
  }
  // 驯化：可驯化生物概率获得幼崽（唯一）
  const tamed = S.tryTame(enemy.name)
  if (tamed && D.PETS[tamed]) gains.push(`幼年${D.PETS[tamed].name}（跟随）`)
  // Boss 狂暴形态奖励：星之记忆 +2、金属残片 +2
  const B = window.GAME.battle
  if (enemy.super && B && B.battle.rageMode) {
    S.player.data += 2
    addResource('metal', 2)
    gains.push('💢狂暴奖励：星之记忆 +2、金属残片 +2')
  }
  // 超级生物不属于本地种群，不减少群落数量
  if (loc && !enemy.super) reduceEnemyPopulation(loc, enemy)
  return gains
}

// ---- 探索 ----
/*
 * drainBody：动作饥渴消耗
 * 按季节系数（SEASON_COST）缩放后扣减，归零扣生命
 */
function drainBody(hungerCost, thirstCost) {
  // 季节区分：燥热更渴 / 严寒更饿 / 暴动双增（按季节系数缩放动作消耗）
  const sc = C.SEASON_COST && C.SEASON_COST[S.player.season]
  if (sc) {
    hungerCost = Math.round(hungerCost * sc.hunger)
    thirstCost = Math.round(thirstCost * sc.thirst)
  }
  S.player.hunger = Math.max(S.player.hunger - hungerCost, 0)
  S.player.thirst = Math.max(S.player.thirst - thirstCost, 0)
  if (S.player.hunger <= 0) {
    S.player.life = Math.max(S.player.life - C.HUNGER_DAMAGE, 0)
    S.pushLog(`饥饿侵蚀着你的身体，生命 -${C.HUNGER_DAMAGE}！`)
  }
  if (S.player.thirst <= 0) {
    S.player.life = Math.max(S.player.life - C.THIRST_DAMAGE, 0)
    S.pushLog(`干渴折磨着你，生命 -${C.THIRST_DAMAGE}！`)
  }
  if (S.player.life <= 0) {
    S.player.life = 0
    S.player.dead = true
    S.clearSave()
    S.pushLog('你死了。你的血肉溶解，融入了这颗活物星球，循环仍在继续……')
  }
}

/*
 * onExplore：探索主流程
 * 1) 25% 概率遭遇战斗（转 pendingCost，战斗后统一结算）
 * 2) 否则正常探索：勘探推进（addScoutProgress）/ 消耗结算（pay+drainBody）/
 *    回响感知（echo 额外星忆）/ 探索事件（tryExploreEvents）/ 8% 抉择（triggerRandomChoice）
 */
S.onExplore = function () {
  if (S.player.dead || window.GAME.battle.battle.active) return
  if (!S.canPay(C.EXPLORE_TIME, 1)) {
    if (SFX) SFX.error()
    S.promptRest('耐力不足，无法探索（需要 1 耐力），先休息一下吧。')
    return
  }
  const loc = S.locations[S.world.currentLocation]
  if (!loc) return
  // 新手任务：探索计数（含遭遇战斗的探索）
  S.player.exploreCount = (S.player.exploreCount || 0) + 1
  S.checkQuest()
  const enemy = S.getActiveEnemy(loc)
  const canEncounter = !!enemy && enemy.pop > 0 && enemy.maxPop > 1
  const roll = randint(1, 100)
  // 探索事件：先执行（触发战斗 / 发现地区物品），结束后统一结算消耗
  if (canEncounter && roll <= 25) {
    S.pushLog(`探索中惊动了「${enemy.name}」！`)
    S.ui.pendingCost = {
      time: C.EXPLORE_TIME + C.COMBAT_TIME,
      stamina: 1 + C.BATTLE_STAMINA,
      hunger: C.EXPLORE_HUNGER + C.ACTION_HUNGER,
      thirst: C.EXPLORE_THIRST + C.ACTION_THIRST,
    }
    S.ui.pendingBattleEnemy = enemy
    window.GAME.battle.startBattle(enemy)
    return
  }
  // 探索推进勘探进度（单管累计，按进度阶段解锁地点卡与路口）
  S.addScoutProgress(C.SCOUT_PER_EXPLORE + (S.currentWeather().scout || 0))
  // 结束后扣除探索消耗（呼吸强化可降低探索饥渴消耗），loading 结束播放探索音效
  S.pay(C.EXPLORE_TIME, Math.max(1 + S.weatherStaminaCost() - S.petBonus('explore'), 0), undefined, 'explore')
  drainBody(Math.max(C.EXPLORE_HUNGER - (S.player.upg.lung || 0), 0), Math.max(C.EXPLORE_THIRST - (S.player.upg.lung || 0), 0))
  // 回响感知：探索时捕捉大地低语，额外获得星之记忆
  if ((S.player.upg.echo || 0) > 0) {
    S.player.data += S.player.upg.echo
    S.pushLog(`回响感知捕捉到大地的低语，星之记忆 +${S.player.upg.echo}。`)
  }
  // 特殊事件：地图专属事件（1-3%）→ 生态超级生物（0.5%）→ 全图流星（0.1%）
  S.tryExploreEvents(loc)
  // 抉择事件：探索中偶遇抉择（8%）
  if (!S.player.dead && randint(1, 100) <= 8) S.triggerRandomChoice()
}

// ---- 探索特殊事件总入口 ----
S.tryExploreEvents = function (loc) {
  if (S.player.dead || !loc) return
  const ecos = Array.isArray(loc.eco) ? loc.eco : [loc.eco]
  // 1) 地图专属普通事件（概率 1-3%，仅对应生态区探索触发）；带 choices 的事件走抉择弹窗
  for (const eco of ecos) {
    const pool = D.ECO_EVENTS[eco]
    if (!pool) continue
    for (const ev of pool) {
      if (randint(1, 100) <= ev.chance) {
        if (ev.choices) {
          S.pushLog(`你在探索中遇到了「${ev.name}」……`)
          S.triggerChoiceEvent(ev.id, ev)
        } else {
          S.applyExploreEvent(ev.id)
          S.showEventNotice(`特殊事件·${ev.name}`, ev.text)
        }
        return
      }
    }
  }
  // 2) 生态超级生物事件（0.5%，对应生态区的超级生物）
  for (const eco of ecos) {
    const sc = D.ECO_SUPER_CREATURES && D.ECO_SUPER_CREATURES[eco]
    if (!sc) continue
    if (randint(1, 1000) <= 5) {
      S.spawnSuperAt(loc.id, sc, '生态·' + eco)
      return
    }
  }
  // 3) 全图流星事件（0.1%）
  S.tryMeteorEvent()
}

// 放置超级生物到指定地点并弹窗说明
S.spawnSuperAt = function (locId, sc, sourceTag) {
  S.world.superCreatures[locId] = { enemy: sc, expireDay: S.player.day + 5 }
  if (SFX) SFX.explore()
  const loc = S.locations[locId]
  const place = loc ? '「' + loc.name + '」' : '这片区域'
  S.pushLog(`${sourceTag || ''}的超级生物「${sc.name}」降临在${place}！5 天后将会消失。`)
  S.showEventNotice('☄ 超级生物降临', `${sourceTag ? '【' + sourceTag + '】' : ''}超级生物「${sc.name}」降临在${place}，5 天后将会消失。前往该地点卡点击「挑战」，可获得丰厚战利品！`)
}

// 地图专属探索事件效果
S.applyExploreEvent = function (id) {
  const MATS = ['metal', 'stone', 'bone', 'fiber', 'clay']
  switch (id) {
    case 'trader': {
      if (S.resourceCount('fungus') >= 2) {
        let need = 2
        S.inventory.resources = S.inventory.resources.filter((r) => {
          if (r.id === 'fungus' && need > 0) { need--; return false }
          return true
        })
        addResource(MATS[randint(0, MATS.length - 1)], 1)
        S.pushLog('你与流浪商人交易，获得了一份稀有材料。')
      } else {
        S.pushLog('你遇见了流浪商人，但菌丝块不足（需要 2 份），交易作罢。')
      }
      break
    }
    case 'old_campfire': S.player.stamina = Math.min(S.player.stamina + 2, S.getMaxEnergy()); break
    case 'glow_mush': addResource('fungus', 3); break
    case 'treant_whisper': S.player.data += 2; break
    case 'vine_trap': S.pay(10, 0, undefined, undefined, true); break
    case 'methane_geyser': addResource('stone', 1); break
    case 'reed_labyrinth': S.pay(5, 0, undefined, undefined, true); addResource('fiber', 1); break
    case 'stone_tablet': S.player.data += 3; break
    case 'ancient_trap': S.player.life = Math.max(S.player.life - 5, 0); break
    case 'crystal_reso': S.player.data += 2; break
    case 'cave_collapse': S.pay(15, 0, undefined, undefined, true); break
    case 'sulfur_fume': S.player.life = Math.max(S.player.life - 5, 0); addResource('stone', 1); break
    case 'geo_warmth': S.player.stamina = Math.min(S.player.stamina + 3, S.getMaxEnergy()); break
    case 'avalanche': S.pay(10, 1, undefined, undefined, true); break
    case 'aurora_crystal': S.player.data += 3; break
    case 'salt_storm': addResource('brine', 3); break
    case 'salt_ebb': addResource('metal', 1); break
    case 'bone_wraith': S.startEventBattle(D.EVENT_ENEMIES.bone_wraith); break
    case 'bone_dust': addResource('bone', 1); break
    case 'spore_infect': S.applyDisease('spore'); break
    case 'symbiote_nest': addResource('fungus', 3); break
    case 'tide_vortex': S.pay(10, 0, undefined, undefined, true); addResource(MATS[randint(0, MATS.length - 1)], 1); break
    case 'glow_tide': addResource('brine', 3); break
    case 'wind_rune': S.player.data += 2; break
    case 'magnet_drift': S.pay(10, 0, undefined, undefined, true); break
    case 'magnet_scrap': addResource('metal', 2); break
    case 'crater_echo': S.player.data += 3; break
    case 'corrupt_geyser': addResource('brine', 2); break
    case 'rot_wood': S.player.data += 2; break
    case 'lava_crystal': addResource('stone', 1); S.player.data += 2; break
    case 'ash_vein': addResource('metal', 2); break
    case 'quicksand': S.pay(10, 0, undefined, undefined, true); S.player.life = Math.max(S.player.life - 3, 0); break
  }
  if (S.player.life <= 0) {
    S.player.life = 0
    S.player.dead = true
    S.clearSave()
    S.pushLog('你死了。你的血肉溶解，融入了这颗活物星球，循环仍在继续……')
  }
}

// 事件触发战斗
S.startEventBattle = function (enemy) {
  if (!enemy) return
  S.ui.pendingCost = { time: C.COMBAT_TIME, stamina: C.BATTLE_STAMINA, hunger: C.ACTION_HUNGER, thirst: C.ACTION_THIRST }
  S.pushLog(`你惊动了「${enemy.name}」！`)
  S.ui.pendingBattleEnemy = enemy
  window.GAME.battle.startBattle(enemy)
}

// ---- 特殊事件：流星（探索 0.1% 概率触发） ----
// 在当前节点或附近 2 格内坠落一颗流星，产生超级生物，5 天后消失
S.tryMeteorEvent = function () {
  if (S.player.dead) return
  if (randint(1, 1000) !== 1) return // 0.1%
  const pool = D.SUPER_CREATURES
  if (!pool || !pool.length) return
  const sc = pool[randint(0, pool.length - 1)]
  // 选择当前节点或附近 2 格内的地点
  const from = S.world.currentLocation
  const targets = []
  const visited = { [from]: true }
  const queue = [{ id: from, dist: 0 }]
  while (queue.length) {
    const cur = queue.shift()
    targets.push(cur.id)
    if (cur.dist >= 2) continue
    const loc = S.locations[cur.id]
    if (!loc || !loc.neighbors) continue
    for (const n of loc.neighbors) {
      if (!visited[n]) {
        visited[n] = true
        queue.push({ id: n, dist: cur.dist + 1 })
      }
    }
  }
  const locId = targets[randint(0, targets.length - 1)]
  S.spawnSuperAt(locId, sc, '流星')
  S.pushLog(`一颗流星划破天际，坠落在「${S.locations[locId].name}」！`)
}

S.getSuperCreature = function (locId) {
  return (S.world.superCreatures && S.world.superCreatures[locId]) || null
}

// 手动挑战超级生物（与核心生物一样：卡牌点击挑战）
S.onSuperChallenge = function (locId) {
  if (S.player.dead || window.GAME.battle.battle.active) return
  const sc = S.world.superCreatures[locId]
  if (!sc) return
  if (S.player.stamina < C.BATTLE_STAMINA) {
    if (SFX) SFX.error()
    S.promptRest(`耐力不足，无法挑战（需要 ${C.BATTLE_STAMINA} 耐力），先休息一下吧。`)
    return
  }
  S.ui.pendingCost = { time: C.COMBAT_TIME, stamina: C.BATTLE_STAMINA, hunger: C.ACTION_HUNGER, thirst: C.ACTION_THIRST }
  S.ui.pendingSuperLoc = locId
  S.pushLog(`你逼近了超级生物「${sc.enemy.name}」！`)
  S.ui.pendingBattleEnemy = sc.enemy
  window.GAME.battle.startBattle(sc.enemy)
}

// 推断产出点恢复速度（天/份）：食物/水快、材料中等、研究类慢；可用 def.restoreDays 覆盖
function inferRestore(def) {
  if (def.restoreDays) return def.restoreDays
  const h = def.harvest
  if (h) {
    const it = D.ITEMS[h.item]
    if (it && it.use && it.use.hunger) return 1 // 食物
    if (it && it.use && it.use.thirst) return 1 // 水
    return 3 // 材料
  }
  if (def.research) return 4 // 研究类
  return 2
}

// ---- 地面拾取物：超重时放置，免费拿起 ----
function addGroundPile(loc, resId, count) {
  const piles = (S.world.groundItems[loc.id] = S.world.groundItems[loc.id] || [])
  const existing = piles.find((p) => p.resId === resId)
  if (existing) existing.count += count
  else piles.push({ id: resId + '_' + randint(1000, 9999), resId, count, def: D.ITEMS[resId] })
}

S.onPickUp = function (pile) {
  if (S.player.dead || window.GAME.battle.battle.active) return
  const w = ((D.ITEMS[pile.resId] && D.ITEMS[pile.resId].weight) || 1) * pile.count
  if (S.getCarryLoad() + w > S.getCarryLimit()) {
    if (SFX) SFX.error()
    S.pushLog(`太重了，拿不动（负重 ${S.getCarryLoad()}/${S.getCarryLimit()}）。`)
    return
  }
  addResource(pile.resId, pile.count)
  const list = S.world.groundItems[S.world.currentLocation]
  if (list) S.world.groundItems[S.world.currentLocation] = list.filter((x) => x !== pile)
  if (SFX) SFX.pickup()
  S.pushLog(`你拿起了 ${pile.count} 份${D.ITEMS[pile.resId].name}。`)
}

// ---- 基础资源与配方 ----
function addResource(itemId, count, rarity) {
  const def = D.ITEMS[itemId]
  if (!def) return
  for (let i = 0; i < count; i++) {
    const r = { id: itemId, def: def }
    if (rarity) r.rarity = rarity // 材料品质标签（普通/稀有/史诗/传说）
    if (def.perish) r.day = S.player.day // 易腐食物/饮水：记录获得当天开始计算腐烂
    S.inventory.resources.push(r)
  }
}

// 腐烂状态：按获得天数与腐烂节点计算（新鲜→微腐→腐败→腐烂）
S.rotInfo = function (inst) {
  const def = inst && inst.def
  if (!def || !def.perish || !def.rotDays) return null
  const age = S.player.day - (inst.day || S.player.day)
  const rotDays = def.rotDays
  if (age >= rotDays) return { stage: 'rotted', label: '腐烂', coef: 0, age, rotDays, rotted: true }
  if (age >= rotDays * 0.7) return { stage: 'rot', label: '腐败', coef: 0.5, age, rotDays }
  if (age >= rotDays * 0.4) return { stage: 'stale', label: '微腐', coef: 0.8, age, rotDays }
  return { stage: 'fresh', label: '新鲜', coef: 1, age, rotDays }
}

S.resourceCount = function (itemId) {
  return S.inventory.resources.filter((r) => r.id === itemId).length
}

// 生态使用系数：生态专属物品在本生态地图使用效果提高，异生态降低；通用物品恒为 1
// 物品可用 use.sameCoef/use.otherCoef 单独覆盖全局默认（缺省用 C.ECO_USE_COEF_*）
S.ecoUseCoef = function (def) {
  if (!def || !def.eco) return 1
  const loc = S.locations[S.world.currentLocation]
  const curEco = loc && (Array.isArray(loc.eco) ? loc.eco[0] : loc.eco)
  if (!curEco) return 1
  const u = def.use || {}
  const same = u.sameCoef || def.sameCoef || C.ECO_USE_COEF_SAME || 1.5
  const other = u.otherCoef || def.otherCoef || C.ECO_USE_COEF_OTHER || 0.7
  return curEco === def.eco ? same : other
}
// 当前地点的生态名（供使用提示/系数展示）
S.currentEcoName = function () {
  const loc = S.locations[S.world.currentLocation]
  return loc ? (Array.isArray(loc.eco) ? loc.eco[0] : loc.eco) : ''
}

S.useResource = function (itemId) {
  if (S.player.dead || window.GAME.battle.battle.active) return
  const def = D.ITEMS[itemId]
  if (!def) return
  if (S.resourceCount(itemId) <= 0) return
  // 纯制作材料（无可直接使用的效果）
  if (!def.use || Object.keys(def.use).length === 0) {
    if (SFX) SFX.error()
    S.pushLog(`「${def.name}」是制作材料，无法直接使用，请用于配方合成。`)
    return
  }
  // 按物品类型决定 loading 文本：进食 / 饮水 / 用药 / 使用
  let useKind = 'use'
  if (def.use.hunger) useKind = 'eat'
  else if (def.use.thirst) useKind = 'drink'
  else if (def.use.heal || def.use.bandage) useKind = 'med'
  S.pay(C.USE_TIME, 0, 1000, useKind)
  const idx = S.inventory.resources.findIndex((r) => r.id === itemId)
  if (idx === -1) return
  const inst = S.inventory.resources[idx]
  // 腐烂检查：完全腐烂的食物/饮水被丢弃
  const rot = S.rotInfo(inst)
  if (rot && rot.rotted) {
    S.inventory.resources.splice(idx, 1)
    if (SFX) SFX.error()
    S.pushLog(`「${def.name}」已经腐烂发臭，无法食用，被丢弃了。`)
    return
  }
  S.inventory.resources.splice(idx, 1)
  // 腐烂阶段效果系数：新鲜 100% / 微腐 80% / 腐败 50%
  const coef = rot ? rot.coef : 1
  // 生态使用系数：生态专属物品本生态 ×1.5 / 异生态 ×0.7；通用物品 ×1（与腐烂系数叠加）
  const ecoCoef = S.ecoUseCoef(def)
  const hBase = Math.round((def.use.hunger || 0) * coef * ecoCoef)
  const tBase = Math.round((def.use.thirst || 0) * coef * ecoCoef)
  const hBonus = Math.round(hBase * (S.player.upg.stomach || 0) * 0.2)
  if (def.use.hunger) S.player.hunger = Math.min(S.player.hunger + hBase + hBonus, S.getMaxHunger())
  const tBonus = Math.round(tBase * (S.player.upg.hydrate || 0) * 0.2)
  if (def.use.thirst) S.player.thirst = Math.min(S.player.thirst + tBase + tBonus, S.getMaxThirst())
  if (def.use.data) S.player.data += Math.round(def.use.data * ecoCoef)
  if (def.use.heal) S.player.life = Math.min(S.player.life + Math.round(def.use.heal * ecoCoef), S.getMaxLife())
  if (def.use.morale) S.player.morale = Math.min(S.player.morale + Math.round(def.use.morale * ecoCoef), C.MAX_MORALE)
  if (def.use.stamina) S.player.stamina = Math.min(S.player.stamina + Math.round(def.use.stamina * ecoCoef), S.getMaxEnergy())
  if (def.use.bandage) {
    S.player.bleeding = false
    S.player.life = Math.min(S.player.life + Math.round((typeof def.use.bandage === 'number' ? def.use.bandage : C.BANDAGE_HEAL) * ecoCoef), S.getMaxLife())
  }
  // 状态病治疗：物品属于某状态的 cures 列表则清除该状态
  for (const k in D.DISEASES) {
    const cures = D.DISEASES[k].cures || []
    if (cures.indexOf(itemId) !== -1) S.cureDisease(k)
  }
  // 装备效果集中解析（护甲/武器/工具等）：由数据层 def.equipEffect 统一读取；生态装备同样受生态系数影响
  const eff = D.def && D.def.equipEffect ? D.def.equipEffect(def) : { armor: def.use.armor || 0, combat: def.use.combat || 0, scout: def.use.scout || 0 }
  if (eff.armor) {
    const amt = Math.round((typeof eff.armor === 'number' ? eff.armor : 30) * ecoCoef)
    S.player.tempLifeBonus += amt
    S.player.life = Math.min(S.player.life + amt, S.getMaxLife())
    S.pushLog(`你穿上了「${def.name}」，今日生命上限 +${amt}（当前 ${S.getMaxLife()}），并恢复 ${amt} 点生命，效果持续到今天结束。`)
  }
  if (eff.combat) {
    const cb = Math.round(eff.combat * ecoCoef)
    S.player.tempCombatBonus = (S.player.tempCombatBonus || 0) + cb
    S.pushLog(`今日战斗伤害 +${cb}！`)
  }
  if (eff.scout) {
    S.addScoutProgress(Math.round(eff.scout * ecoCoef))
    S.pushLog(`勘探进度 +${Math.round(eff.scout * ecoCoef)}！`)
  }
  if (SFX) SFX.use()
  if (def.use.heal || def.use.bandage) {
    if (SFX) SFX.heal()
  }
  S.pushLog(`你使用了「${def.name}」。${ecoCoef > 1 ? `（在「${def.eco}」本生态使用，效果增强 ×${ecoCoef}）` : ecoCoef < 1 ? `（在异生态使用，效果减弱 ×${ecoCoef}）` : ''}`)
}

// 卡牌升级（+）：消耗星之记忆 + 金属残片，升级玩家牌库中一张卡（每张仅一次）
S.upgradeCard = function (idx) {
  // 首次升级/查看：以角色初始卡组为底构建自组牌库（副本，之后三选一累积）
  if (!S.player.battleCards) {
    const def = D.CHARACTER_DEFS[S.player.charId]
    S.player.battleCards = (def && def.battleCards ? def.battleCards : D.BASE_BATTLE_CARDS).map((c) => Object.assign({}, c))
  }
  if (idx < 0 || idx >= S.player.battleCards.length) return
  const card = S.player.battleCards[idx]
  if (!card) return
  if (card.upgraded) {
    if (SFX) SFX.error()
    S.pushLog(`「${card.name}」已经升级过了。`)
    return
  }
  const COST_DATA = 5
  const COST_METAL = 1
  if (S.player.data < COST_DATA || S.resourceCount('metal') < COST_METAL) {
    if (SFX) SFX.error()
    S.pushLog(`升级卡牌需要 ${COST_DATA} 星之记忆 / ${COST_METAL} 金属残片，资源不足！`)
    return
  }
  S.player.data -= COST_DATA
  let left = COST_METAL
  S.inventory.resources = S.inventory.resources.filter((r) => {
    if (r.id === 'metal' && left > 0) {
      left--
      return false
    }
    return true
  })
  S.player.battleCards[idx] = D.upgradeCard(card)
  if (SFX) SFX.upgrade()
  S.pushLog(`卡牌升级：${S.player.battleCards[idx].name}（消耗 ${COST_DATA} 星之记忆 / ${COST_METAL} 金属残片）`)
}

// 删牌：消耗星之记忆，从自组牌库移除一张卡（牌库至少保留 1 张）
S.removeCardCost = function () {
  return 10
}
S.removeCard = function (idx) {
  if (S.player.dead) return
  // 首次操作：以角色初始卡组为底构建自组牌库（副本）
  if (!S.player.battleCards) {
    const def = D.CHARACTER_DEFS[S.player.charId]
    S.player.battleCards = (def && def.battleCards ? def.battleCards : D.BASE_BATTLE_CARDS).map((c) => Object.assign({}, c))
  }
  if (idx < 0 || idx >= S.player.battleCards.length) return
  if (S.player.battleCards.length <= 1) {
    if (SFX) SFX.error()
    S.pushLog('牌库至少要保留 1 张卡牌。')
    return
  }
  const COST = S.removeCardCost()
  if (S.player.data < COST) {
    if (SFX) SFX.error()
    S.pushLog(`移除卡牌需要 ${COST} 星之记忆，资源不足！`)
    return
  }
  const card = S.player.battleCards[idx]
  S.player.data -= COST
  S.player.battleCards.splice(idx, 1)
  if (SFX) SFX.status()
  S.pushLog(`你将「${card.name}」从牌库中移除（消耗 ${COST} 星之记忆），牌库精炼为 ${S.player.battleCards.length} 张。`)
  S.saveGame()
}

S.canCraft = function (rc) {
  if (!rc || !rc.in) return false
  // 调试者自动全解锁：无视前置研究与材料需求（以后新增配方同样自动解锁）
  if (S.player.charId === 'debugger') return true
  // 前置研究：需先研究对应工艺
  const req = D.RECIPE_REQ[rc.id]
  if (req && !(S.player.upg[req] > 0)) return false
  for (const k in rc.in) {
    if (S.resourceCount(k) < rc.in[k]) return false
  }
  return true
}

/*
 * craft：制作校验链
 * 1) 调试者跳过（debugger 免校验）
 * 2) 前置研究（RECIPE_REQ）
 * 3) 负重校验
 * 4) 扣材料（consumeResources）
 * 5) 产出（addResource）
 */
S.craft = function (rc) {
  if (S.player.dead || window.GAME.battle.battle.active) return
  const isDebug = S.player.charId === 'debugger'
  // 前置研究检查（调试者跳过）
  const req = D.RECIPE_REQ[rc.id]
  if (!isDebug && req && !(S.player.upg[req] > 0)) {
    if (SFX) SFX.error()
    S.pushLog(`需要先研究「${D.RESEARCH_DEFS[req].name}」才能制作「${rc.name}」。`)
    return
  }
  if (!S.canCraft(rc)) {
    if (SFX) SFX.error()
    S.pushLog('物品不足，无法合成。')
    return
  }
  // 检查成品负重（调试者跳过）
  if (!isDebug) {
    let outW = 0
    for (const k in rc.out) {
      outW += ((D.ITEMS[k] && D.ITEMS[k].weight) || 1) * rc.out[k]
    }
    if (S.getCarryLoad() + outW > S.getCarryLimit()) {
      if (SFX) SFX.error()
      S.pushLog(`背包太重，合成出来的物品拿不动（负重 ${S.getCarryLoad()}/${S.getCarryLimit()}）。`)
      return
    }
  }
  S.pay(C.CRAFT_TIME, 0, undefined, 'craft')
  if (!isDebug) {
    for (const k in rc.in) {
      let left = rc.in[k]
      S.inventory.resources = S.inventory.resources.filter((r) => {
        if (r.id === k && left > 0) {
          left--
          return false
        }
        return true
      })
    }
  }
  for (const k in rc.out) {
    addResource(k, rc.out[k])
  }
  S.pushLog(`你合成了「${rc.name}」！`)
  // 新手任务：制作计数
  S.player.craftCount = (S.player.craftCount || 0) + 1
  S.checkQuest()
}

/*
 * onItemHarvest：采集结算
 * 1) finite 一次性与可再生资源分支
 * 2) 超重落地（addGroundPile）
 * 3) 草药辨识/拾荒者附加产出
 */
S.onItemHarvest = function (item) {
  if (S.player.dead || window.GAME.battle.battle.active) return
  const def = item.def
  if (!def.harvest) return
  // 采集点产出检查：已采空则等待每日恢复
  const stock = item.stock === undefined ? C.ITEM_STOCK_MAX : item.stock
  if (stock <= 0) {
    if (SFX) SFX.error()
    S.pushLog(`「${def.name}」产出点已经采空，过些天会重新长出。`)
    return
  }
  S.pay(Math.max((def.harvestTime || C.ITEM_HARVEST_TIME) - (S.player.upg.absorb || 0) * 5, 5), 0, undefined, 'harvest')
  drainBody(C.ACTION_HUNGER, C.ACTION_THIRST)
  if (S.player.dead) return
  const itemId = def.harvest.item
  const amount = def.harvest.amount + (S.player.upg.forage || 0)
  const w = ((D.ITEMS[itemId] && D.ITEMS[itemId].weight) || 1) * amount
  // 新手任务：采集计数
  S.player.harvestCount = (S.player.harvestCount || 0) + 1
  S.checkQuest()
  // 一次性资源：库存递减，采空后卡片消失；可再生资源：库存递减等待恢复
  if (item.finite) {
    item.stock = stock - 1
    if (S.getCarryLoad() + w <= S.getCarryLimit()) {
      addResource(itemId, amount)
      S.addScoutProgress(C.SCOUT_PER_HARVEST)
      S.pushLog(item.stock <= 0
        ? `你收集了「${def.name}」最后一份，获得 ${amount} 份${D.ITEMS[itemId].name}。此处已采尽，不再产出。`
        : `你收集了「${def.name}」，获得 ${amount} 份${D.ITEMS[itemId].name}（剩余 ${item.stock}/${item.maxStock}）。`)
    } else {
      addGroundPile(S.locations[S.world.currentLocation], itemId, amount)
      S.pushLog(`背包太重了，「${def.name}」暂时放在了地上，可以稍后拿起。`)
    }
    if (item.stock <= 0) S.removeItem(item)
    return
  }
  item.stock = stock - 1
  if (S.getCarryLoad() + w <= S.getCarryLimit()) {
    addResource(itemId, amount)
    S.addScoutProgress(C.SCOUT_PER_HARVEST)
    const rDays = item.restoreDays || C.ITEM_RESTORE_DAILY
    const needD = Math.max(rDays - (item.regen || 0), 1)
    S.pushLog(`你从「${def.name}」采到了 ${amount} 份${D.ITEMS[itemId].name}（剩余可采 ${item.stock}/${item.maxStock}，每 ${rDays} 天恢复 1 份，下次还需 ${needD} 天）。`)
  } else {
    addGroundPile(S.locations[S.world.currentLocation], itemId, amount)
    S.pushLog(`背包太重了，「${def.name}」的产出暂时放在了地上，可以稍后拿起。`)
  }
  // 草药辨识 / 拾荒者：采集成功后的额外收获
  if ((S.player.upg.herb || 0) > 0) {
    addResource('fungus', S.player.upg.herb)
    S.pushLog(`草药辨识让你额外采集到 ${S.player.upg.herb} 份菌丝块。`)
  }
  if ((S.player.upg.scavenge || 0) > 0) {
    const MATS = ['fungus', 'brine', 'fiber', 'stone', 'clay', 'hide', 'resin', 'metal']
    const m = MATS[randint(0, MATS.length - 1)]
    addResource(m, 1)
    S.pushLog(`拾荒者翻找出 1 份${D.ITEMS[m].name}。`)
  }
}

S.onItemResearch = function (item) {
  if (S.player.dead || window.GAME.battle.battle.active) return
  const def = item.def
  if (!def.research) return
  S.pay(def.researchTime || C.ITEM_RESEARCH_TIME, 0, undefined, 'research')
  drainBody(C.ACTION_HUNGER, C.ACTION_THIRST)
  if (S.player.dead) return
  let gain = def.research.data + (S.player.traits.researchGain || 0)
  if (S.player.researchBoost > 0) {
    gain *= 2
    S.player.researchBoost--
  }
  S.player.data += gain
  S.removeItem(item)
  S.addScoutProgress(C.SCOUT_PER_HARVEST)
  S.pushLog(`你研究了「${def.name}」，获得 ${gain} 点星之记忆。`)
}

S.removeItem = function (item) {
  const list = S.world.discoveredItems[S.world.currentLocation]
  if (!list) return
  S.world.discoveredItems[S.world.currentLocation] = list.filter((x) => x !== item)
}

// ---- 休息：消耗时间与饥渴，恢复耐力 ----
S.onRest = function () {
  if (S.player.dead || window.GAME.battle.battle.active) return
  S.pay(C.REST_TIME, 0, undefined, 'rest')
  // 第一次休息：剧情提示
  S.checkFirstAct('rest')
  drainBody(C.REST_HUNGER, C.REST_THIRST)
  if (S.player.dead) return
  const restHeal = (S.player.upg.restful || 0) * 3
  if (restHeal > 0) S.player.life = Math.min(S.player.life + restHeal, S.getMaxLife())
  const tentLv = S.facilities.tent || 0
  const tentRest = tentLv ? (Array.isArray(D.FACILITIES.tent.rest) ? D.FACILITIES.tent.rest[tentLv - 1] : D.FACILITIES.tent.rest) : 0
  S.player.stamina = Math.min(S.player.stamina + C.REST_RECOVER + (S.player.upg.sleep || 0) * 2 + tentRest, S.getMaxEnergy())
  S.player.morale = Math.min(S.player.morale + C.REST_MORALE + (S.player.upg.meditate || 0) * 3, C.MAX_MORALE)
  S.pushLog(`你坐下来休息，恢复 ${C.REST_RECOVER + (S.player.upg.sleep || 0) * 2 + tentRest} 点耐力，精神也舒缓了一些${restHeal > 0 ? '，伤势得到休养' : ''}${tentRest > 0 ? '，帐篷让休息更安稳' : ''}。`)
  // 新手任务：休息计数
  S.player.restCount = (S.player.restCount || 0) + 1
  S.checkQuest()
  // 休息时偶遇抉择（6%）
  if (randint(1, 100) <= 6) S.triggerRandomChoice()
}

// ---- 器官移植（每个器官固定对应一个身体槽位） ----
// 移植/卸下器官时应用或移除被动属性加成
function applyOrganAttr(organ, sign) {
  const p = organ.passive || {}
  const a = S.player.attrs
  if (p.str) a.str = Math.max((a.str || 1) + p.str * sign, 1)
  if (p.agi) a.agi = Math.max((a.agi || 1) + p.agi * sign, 1)
  if (p.con) a.con = Math.max((a.con || 1) + p.con * sign, 1)
  if (p.int) a.int = Math.max((a.int || 1) + p.int * sign, 1)
  if (p.combat) S.player.traits.combatDamage = Math.max((S.player.traits.combatDamage || 0) + p.combat * sign, 0)
}

/*
 * onOrganClick：器官移植
 * 1) 槽位解锁校验（BODY_SLOTS；调试者默认全解锁）
 * 2) 资源消耗
 * 3) 替换旧器官（applyOrganDelta 属性回退）
 * 4) 应用新属性
 */
S.onOrganClick = function (organ) {
  if (S.player.dead || window.GAME.battle.battle.active) return
  // 目标槽位是否已解锁（器官固定对应唯一槽位）——先于资源校验；调试者默认全解锁
  const slotDef = organ.slotName ? D.BODY_SLOTS.find((s) => s.name === organ.slotName) : null
  if (slotDef && S.player.charId !== 'debugger' && S.player.day < slotDef.unlockDay) {
    if (SFX) SFX.error()
    S.pushLog(`「${organ.slotName}」槽位尚未解锁（第 ${slotDef.unlockDay} 天解锁），无法移植「${organ.name}」。`)
    return
  }
  if (S.resourceCount('fungus') < organ.foodCost || S.player.data < organ.dataCost) {
    if (SFX) SFX.error()
    S.pushLog(`移植「${organ.name}」需要 ${organ.foodCost} 菌丝块 / ${organ.dataCost} 星之记忆，资源不足！`)
    return
  }
  // 消耗菌丝块（食物）与星之记忆
  let needF = organ.foodCost
  S.inventory.resources = S.inventory.resources.filter((r) => {
    if (r.id === 'fungus' && needF > 0) {
      needF--
      return false
    }
    return true
  })
  S.player.data -= organ.dataCost
  // 该槽位若已有器官则替换
  let replaced = null
  const existing = S.inventory.transplantedOrgans.find((o) => o.slotName === organ.slotName)
  if (existing) {
    replaced = existing
    applyOrganAttr(existing, -1)
    S.inventory.transplantedOrgans = S.inventory.transplantedOrgans.filter((o) => o !== existing)
  }
  S.inventory.obtainedOrgans = S.inventory.obtainedOrgans.filter((o) => o !== organ)
  applyOrganAttr(organ, 1)
  S.inventory.transplantedOrgans.push(organ)
  if (replaced) {
    S.pushLog(`「${organ.slotName}」槽位已被占用！你取下了旧的「${replaced.name}」，为「${organ.name}」腾出位置。`)
  } else {
    S.pushLog(`手术完成！「${organ.name}」已移植进你的「${organ.slotName || '对应'}」槽位。`)
  }
  S.pushLog(organ.battleFunction ? `「${organ.name}」的机能卡将加入战斗牌库。` : `「${organ.name}」是共生器官，每日提供被动产出。`)
  S.pushLog(`该器官每日将消耗 ${organ.maint} 点耐力维持。`)
  if (SFX) SFX.equip()
  S.pay(C.TRANSPLANT_TIME, 0, undefined, 'use')
}

// 卸下已移植器官，回到器官背包
S.untransplantOrgan = function (organ) {
  if (S.player.dead || window.GAME.battle.battle.active) return
  if (!organ || S.inventory.transplantedOrgans.indexOf(organ) === -1) return
  applyOrganAttr(organ, -1)
  S.inventory.transplantedOrgans = S.inventory.transplantedOrgans.filter((o) => o !== organ)
  S.inventory.obtainedOrgans.push(organ)
  S.pushLog(`你卸下了移植的「${organ.name}」，它回到了器官背包。`)
  S.pay(C.TRANSPLANT_TIME, 0, undefined, 'use')
}

// 战斗胜利后，在结算界面点击采集器官
// 器官是否已拥有（背包中或已移植）——用于决定采集弹窗是否出现
S.hasOrgan = function (organId) {
  if (!organId) return false
  if (S.inventory.obtainedOrgans.some((o) => o.id === organId)) return true
  if (S.inventory.transplantedOrgans.some((o) => o.id === organId)) return true
  return false
}

S.collectOrgan = function (organ) {
  if (S.player.dead || window.GAME.battle.battle.active) return
  if (!organ) return
  // 同一器官若已在背包或已移植，则不可再采集
  const hasBackpack = S.inventory.obtainedOrgans.some((o) => o.id === organ.id)
  const hasTransplanted = S.inventory.transplantedOrgans.some((o) => o.id === organ.id)
  if (hasBackpack || hasTransplanted) {
    if (SFX) SFX.error()
    S.pushLog(`你已${hasTransplanted ? '移植' : '拥有'}器官「${organ.name}」，无需再次采集。`)
    const B = window.GAME.battle
    if (B && B.battle.summary) B.battle.summary.organCollected = true
    if (B && B.battle) {
      B.battle.organShow = false
      B.battle.organConfirm = false
      B.battle.summary.show = true
    }
    return
  }
  // 克隆器官实例存入背包（避免共享 D.O 全局定义，使每个器官可独立强化）
  const inst = {
    id: organ.id, name: organ.name, desc: organ.desc, source: organ.source,
    slotType: organ.slotType, slotName: organ.slotName, foodCost: organ.foodCost, dataCost: organ.dataCost, maint: organ.maint,
    battleFunction: organ.battleFunction, passiveDays: organ.passiveDays,
    passive: Object.assign({}, organ.passive || {}),
    skillCard: organ.skillCard ? Object.assign({}, organ.skillCard) : null,
    aura: organ.aura ? Object.assign({}, organ.aura) : null,
    star: organ.star || 1,
    enhanceLevel: 0,
  }
  S.inventory.obtainedOrgans.push(inst)
  const B = window.GAME.battle
  // 结算面板（采集完成后的战斗结算）
  const showSummary = () => {
    if (B && B.battle.summary) {
      B.battle.summary.organCollected = true
      B.battle.summary.gains.push(`器官「${organ.name}」`)
    }
    if (B && B.battle) {
      B.battle.organShow = false
      B.battle.organConfirm = false
      B.battle.summary.show = true
    }
  }
  // 第一次器官采集：先展示剧情弹窗，关闭后再进入结算（与初次击败线索的串行模式一致）
  const firstHarvest = S.checkFirstAct('organHarvest', showSummary)
  if (firstHarvest) {
    // 关闭采集弹窗，剧情弹窗随后展示；结算面板延迟到剧情关闭后
    if (B && B.battle) {
      B.battle.organShow = false
      B.battle.organConfirm = false
    }
  } else {
    showSummary()
  }
  if (SFX) SFX.gain()
  S.pushLog(`你从战利品中割下了器官「${organ.name}」！`)
  S.pay(C.ORGAN_HARVEST_TIME, 0, undefined, 'use')
}

// ---- 器官强化：提升被动属性与机能数值，强化次数上限 = 器官星级 ----
S.enhanceCost = function (organ) {
  const lv = (organ && organ.enhanceLevel) || 0
  const star = (organ && organ.star) || 1
  if (lv >= star) return -1
  return 6 + lv * 6
}
S.enhanceOrgan = function (organ) {
  if (S.player.dead || !organ) return
  const star = organ.star || 1
  const lv = organ.enhanceLevel || 0
  if (lv >= star) {
    if (SFX) SFX.error()
    S.pushLog(`「${organ.name}」已达到强化上限（${star} 次）。`)
    return
  }
  const cost = S.enhanceCost(organ)
  const needSpec = 1
  if (S.player.data < cost || S.resourceCount('specimen') < needSpec) {
    if (SFX) SFX.error()
    S.pushLog(`强化需要 ${cost} 星之记忆 + ${needSpec} 生物样本，资源不足！`)
    return
  }
  S.player.data -= cost
  let left = needSpec
  S.inventory.resources = S.inventory.resources.filter((r) => {
    if (r.id === 'specimen' && left > 0) {
      left--
      return false
    }
    return true
  })
  organ.enhanceLevel = lv + 1
  // 被动产出/属性全部 +1
  const p = organ.passive || {}
  for (const k in p) if (p[k] > 0) p[k] += 1
  // 机能卡数值提升
  const sc = organ.skillCard
  if (sc) {
    if (sc.combatPower > 0) sc.combatPower += 2
    if (sc.gatherAmount > 0) sc.gatherAmount += 1
    if (sc.researchValue > 0) sc.researchValue += 1
    if (sc.dot > 0) sc.dot += 1
  }
  // 若已移植：立即补齐新增的属性加成
  if (S.inventory.transplantedOrgans.indexOf(organ) !== -1) applyOrganDelta(organ, 1)
  if (SFX) SFX.upgrade()
  S.pushLog(`器官「${organ.name}」强化成功（${organ.enhanceLevel}/${star}）！被动效果与机能全面增强。`)
  S.saveGame()
}
// 强化增量补丁：移植中的器官每强化一级，各被动属性 +1
function applyOrganDelta(organ, sign) {
  const p = organ.passive || {}
  const a = S.player.attrs
  if (p.str) a.str = Math.max((a.str || 1) + 1 * sign, 1)
  if (p.agi) a.agi = Math.max((a.agi || 1) + 1 * sign, 1)
  if (p.con) a.con = Math.max((a.con || 1) + 1 * sign, 1)
  if (p.int) a.int = Math.max((a.int || 1) + 1 * sign, 1)
  if (p.combat) S.player.traits.combatDamage = Math.max((S.player.traits.combatDamage || 0) + 1 * sign, 0)
}

// ---- 建筑交互 ----
S.onHatch = function () {
  if (S.building.state !== D.BuildingState.HAS_CORE) return
  S.building.state = D.BuildingState.HATCHED
  S.building.stage = 1
  S.building.fedAmount = 0
  S.building.canMove = false
  S.building.location = 'camp'
  S.pushLog(`核心剧烈搏动，活体建筑「${S.building.coreName}」破土而出！`)
}

S.onFeed = function () {
  if (S.player.dead) return
  if (S.building.state !== D.BuildingState.HATCHED) return
  if (S.resourceCount('fungus') < C.BUILDING_FEED_COST) {
    if (SFX) SFX.error()
    S.pushLog(`菌丝块不足，无法喂养建筑（需要 ${C.BUILDING_FEED_COST} 份）。`)
    return
  }
  let needF = C.BUILDING_FEED_COST
  S.inventory.resources = S.inventory.resources.filter((r) => {
    if (r.id === 'fungus' && needF > 0) {
      needF--
      return false
    }
    return true
  })
  S.building.fedAmount += C.BUILDING_FEED_COST
  const oldStage = S.building.stage
  while (S.building.stage < 5 && S.building.fedAmount >= C.BUILDING_STAGE_THRESHOLDS[S.building.stage - 1]) {
    S.building.stage++
  }
  if (S.building.stage > oldStage) {
    S.pushLog(`「${S.building.coreName}」进化到了阶段 ${S.building.stage}！`)
    if (S.building.stage === 3) {
      S.building.canMove = true
      S.pushLog('建筑解锁了移动能力，内部器官结构开始分化！')
    }
  } else {
    S.pushLog('建筑吸收血肉，继续孵化中……')
  }
  S.pay(C.FEED_TIME, 0, undefined, 'use')
}

S.onMoveBuilding = function () {
  const loc = S.locations[S.world.currentLocation]
  if (!loc) return
  if (S.building.canMove && S.building.state === D.BuildingState.HATCHED) {
    S.building.location = loc.id
    S.pushLog(`活体建筑缓缓爬行，移动到了「${loc.name}」。`)
  }
}

// ---- 研究升级 ----
/*
 * researchCost：研究费用计算
 * 注意：cell/circuit/metabolism/resonance 这四类研究按属性数值换算等级（非 upg），
 * 修改须与 ResearchModal 的 rankText 同步
 */
S.researchCost = function (id) {
  const def = D.RESEARCH_DEFS[id]
  if (!def) return -1
  let rank = 0
  if (id === 'cell') rank = Math.floor(S.player.lifeBonus / 10)
  else if (id === 'circuit') rank = Math.floor(S.player.energyBonus / 2)
  else if (id === 'metabolism') rank = S.player.metabolismBonus > 0 ? 1 : 0
  else if (id === 'resonance') rank = S.player.maintReduction > 0 ? 1 : 0
  else rank = S.player.upg[id] || 0
  if (rank >= def.maxRank) return -1
  return def.base + rank * def.step
}

S.onResearch = function (id) {
  if (S.player.dead) return
  const def = D.RESEARCH_DEFS[id]
  if (!def) {
    if (SFX) SFX.error()
    S.pushLog('未知研究项目。')
    return
  }
  const cost = S.researchCost(id)
  if (cost < 0) {
    if (SFX) SFX.error()
    S.pushLog('该研究已达上限。')
    return
  }
  if (S.player.data < cost) {
    if (SFX) SFX.error()
    S.pushLog(`星之记忆不足！需要 ${cost} 星之记忆。`)
    return
  }
  S.player.data -= cost
  if (SFX) SFX.research()
  // 通用升级：等级 +1（细胞/回路类研究等级由 researchCost 特殊计算，upg 仅作记录）
  S.player.upg[id] = (S.player.upg[id] || 0) + 1
  const rank = S.player.upg[id]
  // 专属效果：定义在数据层 effect 字段，新增研究只需在数据里配 effect/log，无需改动核心逻辑
  if (def.effect) def.effect({ S, player: S.player, id, rank })
  // 完成日志：数据层 log 字段（函数/字符串），缺省用「名称」+desc
  const msg = typeof def.log === 'function' ? def.log(rank, S) : def.log || `「${def.name}」完成！${def.desc}`
  S.pushLog(msg)
  S.pay(C.UPGRADE_TIME, 0, undefined, 'research')
}

// ---- 工具 ----
function randint(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a
}

// ---- 游戏阶段与主菜单 ----
S.phase = reactive({ state: 'menu' }) // 'menu' | 'select' | 'playing'
S.saveMeta = reactive({ exists: false, info: null, charId: null })

S.toMenu = function () {
  S.player.charId = null
  S.player.charName = ''
  S.refreshSaveMeta()
  S.phase.state = 'menu'
  if (SFX && SFX.music) SFX.music.play('sector')
}
S.newGame = function () {
  S.phase.state = 'select'
  if (SFX && SFX.music) SFX.music.play('sector')
}
S.continueGame = function () {
  if (S.loadGame()) {
    S.phase.state = 'playing'
    S.playLocationMusic()
  }
}

// ---- 存档系统（每个角色独立存档槽 + 导出/导入 .json 文件） ----
const ACTIVE_KEY = 'alien_survival_active_v1'
S.saveKeyFor = function (charId) {
  return 'alien_survival_save_v1_' + (charId || 'guest')
}
S.activeCharId = function () {
  try {
    const v = localStorage.getItem(ACTIVE_KEY)
    return v && v !== 'null' ? v : null
  } catch (e) { return null }
}

S.hasSave = function (charId) {
  const id = charId || S.player.charId || S.activeCharId()
  if (!id) return false
  try { return !!localStorage.getItem(S.saveKeyFor(id)) } catch (e) { return false }
}

S.getSaveSummary = function (charId) {
  const id = charId || S.player.charId || S.activeCharId()
  if (!id) return null
  try {
    const raw = localStorage.getItem(S.saveKeyFor(id))
    if (!raw) return null
    const d = JSON.parse(raw)
    if (!d || !d.player) return null
    return {
      charId: id,
      charName: d.player.charName || '无名者',
      day: d.player.day || 1,
      season: D.SEASON_NAMES[d.player.season] || '平稳期',
      savedAt: d.savedAt || 0,
    }
  } catch (e) { return null }
}

S.refreshSaveMeta = function () {
  const id = S.activeCharId()
  S.saveMeta.exists = id ? S.hasSave(id) : false
  S.saveMeta.info = id ? S.getSaveSummary(id) : null
  S.saveMeta.charId = id
}

S.saveGame = function () {
  if (S.player.dead) return false
  // 紧凑化：物品卡/地面拾取/资源只存 id，不序列化完整物品定义（减小存档体积，避免超 localStorage 上限）
  const world = JSON.parse(JSON.stringify(S.world))
  for (const k in world.discoveredItems) {
    world.discoveredItems[k] = (world.discoveredItems[k] || []).map((it) => ({
      id: it.id, defId: it.def ? it.def.id : null, finite: it.finite,
      stock: it.stock, maxStock: it.maxStock, restoreDays: it.restoreDays, regen: it.regen,
    }))
  }
  for (const k in world.groundItems) {
    world.groundItems[k] = (world.groundItems[k] || []).map((p) => ({ id: p.id, resId: p.resId, count: p.count }))
  }
  const inventory = JSON.parse(JSON.stringify(S.inventory))
  inventory.resources = (inventory.resources || []).map((r) => (r.day !== undefined ? { id: r.id, day: r.day } : { id: r.id }))
  const data = {
    version: 1,
    savedAt: Date.now(),
    player: JSON.parse(JSON.stringify(S.player)),
    world,
    inventory,
    building: JSON.parse(JSON.stringify(S.building)),
    facilities: JSON.parse(JSON.stringify(S.facilities)),
    weather: Object.assign({}, S.weather),
    pets: S.pets.slice(),
    log: S.log.lines.slice(),
    locations: (function () {
      const m = {}
      for (const key in S.locations) {
        const loc = S.locations[key]
        m[key] = { enemyPops: Object.assign({}, loc.enemyPops) }
      }
      return m
    })(),
  }
  try {
    localStorage.setItem(S.saveKeyFor(S.player.charId), JSON.stringify(data))
    if (S.player.charId) localStorage.setItem(ACTIVE_KEY, S.player.charId)
    S.refreshSaveMeta()
    return true
  } catch (e) {
    S.pushLog('存档失败：' + (e && e.message ? e.message : e))
    return false
  }
}

S.loadGame = function (charId) {
  try {
    const key = S.saveKeyFor(charId || S.player.charId || S.activeCharId())
    const raw = localStorage.getItem(key)
    if (!raw) return false
    const data = JSON.parse(raw)
    if (!data || data.version !== 1) return false
    if (data.player.dead) {
      S.clearSave(data.player.charId)
      return false
    }
    Object.assign(S.player, data.player)
    // 旧存档补齐角色专属饥渴上限（默认 120）
    if (!S.player.hungerMax) {
      const cd = D.CHARACTER_DEFS[S.player.charId]
      S.player.hungerMax = (cd && cd.hungerMax) || C.MAX_HUNGER
    }
    if (!S.player.thirstMax) {
      const cd = D.CHARACTER_DEFS[S.player.charId]
      S.player.thirstMax = (cd && cd.thirstMax) || C.MAX_THIRST
    }
    // 旧存档 upg 补齐新研究键
    S.player.upg = Object.assign({ muscle: 0, regenerate: 0, sleep: 0, forage: 0, lung: 0, absorb: 0, insight: 0, wander: 0, focus: 0, opening: 0, resilient: 0, quick: 0, cook: 0, smelt: 0, weave: 0, aqua: 0, flight: 0, dig: 0, density: 0, immune: 0, stomach: 0, hydrate: 0, vein: 0, tough: 0, vital: 0, restful: 0, crit: 0, vamp: 0, thorns: 0, guard: 0, reflex: 0, ferocity: 0, prepare: 0, tactics: 0, desert: 0, coldproof: 0, thermal: 0, bunk: 0, probe: 0, herb: 0, scavenge: 0, hunter: 0, sprint: 0, meditate: 0, alchemy: 0, leather: 0, bonecraft: 0, crystalwork: 0, glasswork: 0, mechanism: 0, masonry: 0, botany: 0, chemistry: 0, sculpt: 0, symbiosis: 0, organmaster: 0, translate: 0, echo: 0 }, S.player.upg)
    if (data.player.abilityUsed !== undefined) {
      S.player.abilityCooldown = data.player.abilityUsed ? 5 : 0
      delete S.player.abilityUsed
    }
    S.world.currentLocation = data.world.currentLocation
    S.world.discovered = data.world.discovered
    S.world.seasonalPops = data.world.seasonalPops
    S.world.scoutProgress = data.world.scoutProgress
    S.world.openRoads = data.world.openRoads
    S.world.discoveredItems = data.world.discoveredItems
    // 紧凑存档：按 defId 找回物品卡定义（兼容旧存档已存完整 def）
    function findRegionItemDef(defId) {
      if (!defId) return null
      for (const eco in D.REGION_ITEMS) {
        const it = D.REGION_ITEMS[eco].find((x) => x.id === defId)
        if (it) return it
      }
      return null
    }
    for (const locId in S.world.discoveredItems) {
      const list = S.world.discoveredItems[locId]
      if (!list) continue
      for (const it of list) {
        if (!it.def) it.def = findRegionItemDef(it.defId) || null
        delete it.defId
      }
    }
    // 已解锁过的物品卡 id：旧存档从现有物品卡重建，防止采空移除后重复解锁
    S.world.discoveredItemIds = data.world.discoveredItemIds || {}
    for (const locId in S.world.discoveredItems) {
      const ids = S.world.discoveredItemIds[locId]
      if (Array.isArray(ids) && ids.length) continue
      const rebuilt = []
      for (const it of (S.world.discoveredItems[locId] || [])) {
        if (it && it.def && rebuilt.indexOf(it.def.id) === -1) rebuilt.push(it.def.id)
      }
      S.world.discoveredItemIds[locId] = rebuilt
    }
    // 旧存档产出点补齐库存字段
    for (const locId in S.world.discoveredItems) {
      const list = S.world.discoveredItems[locId]
      if (!list) continue
      for (const it of list) {
        if (it.stock === undefined) it.stock = C.ITEM_STOCK_MAX
        if (!it.maxStock) it.maxStock = C.ITEM_STOCK_MAX
        if (it.restoreDays === undefined) it.restoreDays = C.ITEM_RESTORE_DAILY
        if (it.regen === undefined) it.regen = 0
      }
    }
    S.world.foundItems = data.world.foundItems || {}
    S.world.activeEnemies = data.world.activeEnemies || {}
    S.world.groundItems = data.world.groundItems || {}
    S.world.superCreatures = data.world.superCreatures || {}
    for (const gk in S.world.groundItems) {
      S.world.groundItems[gk] = (S.world.groundItems[gk] || []).map((p) => ({
        id: p.id, resId: p.resId, count: p.count,
        def: p.def || (D.ITEMS[p.resId] ? D.ITEMS[p.resId] : { name: p.resId, desc: '' }),
      }))
    }
    S.world.bestiaryItems = data.world.bestiaryItems || {}
    S.world.bestiaryEnemies = data.world.bestiaryEnemies || {}
    S.world.defeatedEnemies = data.world.defeatedEnemies || {}
    S.world.lore = data.world.lore || {}
    if (S.player.charId === 'debugger') S.unlockAllLore() // 调试者：旧存档也补齐全部剧情
    S.inventory.obtainedOrgans = data.inventory.obtainedOrgans || []
    S.inventory.transplantedOrgans = data.inventory.transplantedOrgans || []
    // 旧存档器官补齐星级与强化等级（星级按来源生物难度计算，始终以当前定义为准）
    const backOrgans = [].concat(S.inventory.obtainedOrgans, S.inventory.transplantedOrgans)
    for (const o of backOrgans) {
      if (!o || !o.id) continue
      if (D.O[o.id]) o.star = D.O[o.id].star // 星级由器官定义决定（来源生物难度），旧档错误星级一并修正
      if (!o.star) o.star = 1
      if (!o.enhanceLevel) o.enhanceLevel = 0
      o.passive = o.passive || {}
      o.skillCard = o.skillCard || null
    }
    S.inventory.resources = (data.inventory.resources || []).map((r) => {
      const def = (r && r.def) || (r && D.ITEMS[r.id]) || null
      const inst = def ? { id: r.id, def } : r
      if (r && r.day !== undefined) inst.day = r.day
      return inst
    })
    Object.assign(S.building, data.building)
    Object.assign(S.facilities, data.facilities || {})
    // 旧存档设施值迁移：true → 1 级
    for (const k in S.facilities) {
      if (S.facilities[k] === true) S.facilities[k] = 1
      if (typeof S.facilities[k] !== 'number' || S.facilities[k] < 1) S.facilities[k] = 1
    }
    Object.assign(S.weather, data.weather || { id: 'clear', name: '晴朗', icon: '☀️', desc: '' })
    S.pets.splice(0, S.pets.length, ...(data.pets || []))
    S.log.lines = data.log || []
    for (const key in data.locations) {
      const loc = S.locations[key]
      if (!loc) continue
      const st = data.locations[key]
      if (st.enemyPops) loc.enemyPops = Object.assign({}, st.enemyPops)
    }
    const B = window.GAME.battle
    if (B) {
      B.battle.active = false
      B.battle.hand = []
      B.battle.deck = []
      B.battle.discard = []
    }
    S.ui.pendingBattleEnemy = null
    S.pushLog(`存档已读取（第 ${S.player.day} 天），欢迎回来，${S.player.charName || '幸存者'}！`)
    if (S.player.charId) localStorage.setItem(ACTIVE_KEY, S.player.charId)
    S.refreshSaveMeta()
    return true
  } catch (e) {
    S.pushLog('读取存档失败：' + (e && e.message ? e.message : e))
    return false
  }
}

S.clearSave = function (charId) {
  const id = charId || S.player.charId || S.activeCharId()
  if (!id) return
  try { localStorage.removeItem(S.saveKeyFor(id)) } catch (e) {}
}

// 清除全部存档：移除所有角色存档槽 + 激活标记 + 旧版遗留槽
S.clearAllSaves = function () {
  try {
    for (const id in D.CHARACTER_DEFS) {
      localStorage.removeItem(S.saveKeyFor(id))
    }
    localStorage.removeItem(ACTIVE_KEY)
    localStorage.removeItem('alien_survival_save_v1')
  } catch (e) {}
  S.refreshSaveMeta()
}

// ---- 初始化 ----
// 图鉴全部解锁（调试者）
function unlockAllBestiary() {
  for (const loc of Object.values(D.LOCATIONS)) {
    for (const e of loc.enemies) S.world.bestiaryEnemies[e.name] = true
  }
  for (const eco in D.REGION_ITEMS) {
    for (const it of D.REGION_ITEMS[eco]) S.world.bestiaryItems[it.id] = true
  }
}

S.selectCharacter = function (charId) {
  if (!D.CHARACTER_DEFS[charId]) return
  // 该角色已有专属存档槽：只能继续，不能覆盖重开
  if (S.hasSave(charId)) {
    if (S.loadGame(charId)) {
      S.phase.state = 'playing'
      S.playLocationMusic()
    }
    return
  }
  S.initGame(charId)
  S.phase.state = 'playing'
  S.playLocationMusic()
}

/*
 * initGame：新局初始化
 * 1) 角色差异化上限（饥渴上限等）
 * 2) 属性
 * 3) 特质
 * 4) 起始物品
 * 5) 调试者全解锁
 */
S.initGame = function (charId) {
  // 各角色饥渴上限不同（基础 120，角色可增减）
  const charDef = charId && D.CHARACTER_DEFS[charId]
  S.player.hungerMax = (charDef && charDef.hungerMax) || C.MAX_HUNGER
  S.player.thirstMax = (charDef && charDef.thirstMax) || C.MAX_THIRST
  S.player.life = C.MAX_LIFE
  S.player.hunger = S.player.hungerMax
  S.player.thirst = S.player.thirstMax
  S.player.stamina = C.MAX_STAMINA
  S.player.day = 1
  S.player.timeLeft = C.MAX_TIME_PER_DAY
  S.player.season = D.Season.STABLE
  S.player.seasonDay = 1
  S.player.dead = false
  S.player.data = 0
  S.player.lifeBonus = 0
  S.player.energyBonus = 0
  S.player.metabolismBonus = 0
  S.player.maintReduction = 0
  S.player.tempLifeBonus = 0
  S.player.charId = null
  S.player.charName = ''
  S.player.morale = 80
  S.player.bleeding = false
  S.player.traits = { combatDamage: 0, researchGain: 0, bleedReduction: 0, metabolism: 0 }
  S.player.abilityCooldown = 0
  S.player.abilityBuff = null
  S.player.tempCombatBonus = 0
  S.player.researchBoost = 0
  S.player.upg = { muscle: 0, regenerate: 0, sleep: 0, forage: 0, lung: 0, absorb: 0, insight: 0, wander: 0, focus: 0, opening: 0, resilient: 0, quick: 0, cook: 0, smelt: 0, weave: 0, aqua: 0, flight: 0, dig: 0 }
  S.player.passiveTicks = {}
  const B = window.GAME.battle
  if (B) {
    B.battle.active = false
    B.battle.hand = []
    B.battle.deck = []
    B.battle.discard = []
  }
  S.ui.pendingBattleEnemy = null
  S.ui.pendingCost = null
  S.inventory.obtainedOrgans = []
  S.inventory.transplantedOrgans = []
  S.inventory.resources = []
  for (const key in S.locations) {
    const loc = S.locations[key]
    loc.enemyPops = {}
    for (const e of loc.enemies) loc.enemyPops[e.name] = e.maxPop
  }
  S.world.discovered = { camp: true }
  S.world.seasonalPops = {}
  S.world.scoutProgress = {}
  S.world.openRoads = {}
  S.world.discoveredItems = {}
  S.world.discoveredItemIds = {}
  S.world.foundItems = {}
  S.world.activeEnemies = {}
  S.world.groundItems = {}
  S.world.bestiaryItems = {}
  S.world.bestiaryEnemies = {}
  S.world.defeatedEnemies = {}
  S.world.lore = {}
  S.world.currentLocation = 'camp'
  S.building.state = D.BuildingState.NONE
  S.building.coreName = ''
  S.building.stage = 1
  S.building.fedAmount = 0
  S.building.canMove = false
  S.building.location = 'camp'
  S.log.lines = []
  const def = charId && D.CHARACTER_DEFS[charId]
  if (def) {
    S.player.charId = charId
    S.player.charName = def.name
    if (def.bonus.lifeBonus) {
      S.player.lifeBonus = def.bonus.lifeBonus
    }
    if (def.bonus.data) S.player.data += def.bonus.data
    if (def.bonus.energyBonus) {
      S.player.energyBonus = def.bonus.energyBonus
      S.player.stamina = S.getMaxEnergy()
    }
    S.player.attrs = Object.assign({ str: 1, agi: 1, con: 1, int: 1 }, def.attrs || {})
    S.player.life = S.getMaxLife()
    S.player.traits = Object.assign({}, S.player.traits, def.trait || {})
    if (def.startItems) {
      for (const k in def.startItems) addResource(k, def.startItems[k])
    }
    if (charId === 'debugger') {
      unlockAllBestiary() // 调试者图鉴全解锁
      S.unlockAllLore() // 调试者剧情全解锁
    }
  }
  S.pushLog(`欢迎来到异星生存！一切皆活物，你的装备就是移植的生物器官。`)
  S.pushLog(def ? `你以「${def.name}」的身份醒来：${def.traitDesc}。` : '选择身份开始你的生存之旅。')
  S.pushLog('提示：中部面板可探索、休息、挑战独特生物。')
  // 初始营地的首达剧情
  S.checkArrivalStory()
}

// ---- 旧版存档迁移：自动迁移到对应角色的专属存档槽 ----
;(function () {
  try {
    const old = localStorage.getItem('alien_survival_save_v1')
    if (old && !localStorage.getItem(ACTIVE_KEY)) {
      const d = JSON.parse(old)
      if (d && d.player && d.player.charId) {
        localStorage.setItem(S.saveKeyFor(d.player.charId), old)
        localStorage.setItem(ACTIVE_KEY, d.player.charId)
      }
    }
  } catch (e) {}
})()

S.refreshSaveMeta()
