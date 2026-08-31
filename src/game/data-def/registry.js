/* ============ 数据注册器：面向对象工厂 + 列表叠加（模块化扩展基础设施） ============
 * 用法：
 *   G.def.item(cfg)        —— 物品工厂（补默认字段）
 *   G.def.recipe(cfg)      —— 配方工厂（自动生成 desc）
 *   G.def.merge(a, b)      —— 深层对象叠加合并
 *   G.def.push('RECIPES',[..])  / G.def.recipes([..]) —— 列表叠加（可多次调用，追加式扩展）
 *   G.def.extend('ITEMS',{..})  / G.def.items({..})    —— 字典叠加（新数据覆盖同键，可新增键）
 *   G.def.organs({..})     —— 器官叠加注册
 * 任意数据文件（如 mod/自定配方.js）引入后可随时叠加，无需改动核心代码。
 */
;(function () {
window.GAME = window.GAME || {}
const G = (window.GAME.data = window.GAME.data || {})
const def = (G.def = {})

// 深层对象叠加合并（数组与基本类型直接覆盖，对象递归合并）
def.merge = function (base, patch) {
  const out = Object.assign({}, base || {})
  for (const k in patch || {}) {
    const v = patch[k]
    if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
      out[k] = def.merge(out[k], v)
    } else {
      out[k] = v
    }
  }
  return out
}

// ---- 面向对象工厂：统一默认值与规范化 ----
// 物品工厂：自动补 weight 默认值
def.item = function (cfg) {
  return def.merge({ weight: 1 }, cfg || {})
}
// 配方分类（按产出物品的 use 效果）：制作界面用途筛选 + 扩展配方自动归类
def.recipeCat = function (rc) {
  const outId = rc && rc.out ? Object.keys(rc.out)[0] : null
  const it = outId ? G.ITEMS[outId] : null
  if (!it) return '材料'
  const u = it.use || {}
  if (u.hunger) return '食物'
  if (u.thirst) return '饮水'
  if (u.bandage || u.heal) return '医疗'
  if (u.armor) return '护甲'
  if (u.combat) return '武器'
  if (u.morale) return '精神'
  if (u.stamina) return '耐力'
  if (u.data || u.scout) return '探索'
  return '材料'
}
// 配方工厂：校验必需字段、自动生成「A×N+B×M → 产物」描述、归一前置研究、自动分类
def.recipe = function (cfg) {
  if (!cfg || !cfg.id || !cfg.in || !cfg.out) return null
  const c = Object.assign({}, cfg)
  // 自动生成描述（已有 desc 则保留）：格式与手写一致「2菌丝块+1兽皮 → 1菌粮团」
  if (!c.desc) {
    const outId = Object.keys(c.out)[0]
    const inNames = Object.keys(c.in).map((k) => c.in[k] + (G.ITEMS[k] ? G.ITEMS[k].name : k)).join('+')
    const outName = G.ITEMS[outId] ? G.ITEMS[outId].name : outId
    c.desc = inNames + ' → ' + c.out[outId] + outName
  }
  // 前置研究归一：req 字段自动写入 RECIPE_REQ（与生态配方 ecoReq 同表）
  if (c.req) {
    G.RECIPE_REQ = G.RECIPE_REQ || {}
    G.RECIPE_REQ[c.id] = c.req
    delete c.req
  }
  // 自动分类（制作界面按用途筛选；可手动覆盖 cat）
  if (!c.cat) c.cat = def.recipeCat(c)
  return c
}
// 器官工厂：保证星级与强化字段存在
def.organ = function (cfg) {
  const o = def.merge({ star: 1, enhanceLevel: 0, passive: {}, skillCard: null, aura: null }, cfg || {})
  if (!o.slotType && G.SlotType !== undefined) o.slotType = o.slotType || G.SlotType.INTERNAL
  if (!o.slotName) o.slotName = o.slotType === 0 ? '右臂' : '躯干'
  return o
}
// 器官集中面板：星级/槽位/维持/强化上限/被动/机能（供背包、移植、图鉴共用）
def.organInfo = function (organ) {
  if (!organ) return null
  return {
    id: organ.id,
    name: organ.name,
    source: organ.source,
    desc: organ.desc,
    star: organ.star || 1,
    slotName: organ.slotName || (organ.slotType === 0 ? '右臂' : '躯干'),
    foodCost: organ.foodCost || 0,
    dataCost: organ.dataCost || 0,
    maint: organ.maint || 0,
    enhanceMax: organ.star || 1,
    enhanceLevel: organ.enhanceLevel || 0,
    passive: Object.assign({}, organ.passive || {}),
    passiveDays: organ.passiveDays || 1,
    aura: organ.aura || null,
    skillCard: organ.skillCard || null,
    battleFunction: organ.battleFunction,
  }
}
// 器官效果文本集中生成（被动产出/属性/机能/维持），供界面统一展示
def.organText = function (organ) {
  if (!organ) return ''
  const o = organ
  const parts = []
  if (o.battleFunction && o.skillCard && G.isCombatSkill(o.skillCard.type)) parts.push(`机能卡「${o.skillCard.name}」：${o.skillCard.desc}`)
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
  if (o.maint) parts.push(`每日维持 ${o.maint} 耐力`)
  return parts.join('；')
}

// ---- 列表叠加：追加式注册（可多次调用，每次追加） ----
def.push = function (key, items) {
  G[key] = G[key] || []
  if (Array.isArray(items)) G[key].push.apply(G[key], items)
  else if (items) G[key].push(items)
  return G[key].length
}
// ---- 字典叠加：合并注册（同键覆盖，新键追加） ----
def.extend = function (key, map) {
  G[key] = G[key] || {}
  for (const k in map || {}) G[key][k] = map[k]
  return G[key]
}

// 配方批量注册：每个配方经工厂规范化后追加到 G.RECIPES（可多次调用叠加）
def.recipes = function (list) {
  G.RECIPES = G.RECIPES || []
  const arr = (Array.isArray(list) ? list : []).map((cfg) => def.recipe(cfg)).filter(Boolean)
  G.RECIPES.push.apply(G.RECIPES, arr)
  return G.RECIPES.length
}

// 便捷注册入口：物品 / 剧情 / 抉择
def.items = function (map) { return def.extend('ITEMS', map) }
def.lore = function (map) { return def.extend('LORE', map) }
def.choices = function (map) { return def.extend('CHOICES', map) }
// 器官叠加注册：经 def.organ 工厂规范化后写入 G.O（可多次调用新增/覆盖器官）
def.organs = function (map) {
  G.O = G.O || {}
  for (const id in map || {}) {
    const o = def.organ(Object.assign({ id }, map[id]))
    if (o) G.O[id] = o
  }
  return G.O
}

// ---- 角色工厂：规范化角色定义（面向对象 + 叠加扩展） ----
def.character = function (cfg) {
  if (!cfg || !cfg.id) return null
  const c = Object.assign({}, cfg)
  c.attrs = Object.assign({ str: 1, agi: 1, con: 1, int: 1 }, c.attrs || {})
  c.bonus = c.bonus || {}
  c.trait = c.trait || {}
  c.hungerMax = c.hungerMax || C.MAX_HUNGER
  c.thirstMax = c.thirstMax || C.MAX_THIRST
  if (c.ability) c.ability = def.ability(c.ability) // 特殊能力经技能工厂规范化
  return c
}
// 角色叠加注册：`G.def.characters({ id: {...}, ... })`，可多次调用新增/覆盖角色
def.characters = function (map) {
  G.CHARACTER_DEFS = G.CHARACTER_DEFS || {}
  for (const id in map || {}) {
    const c = def.character(Object.assign({ id }, map[id]))
    if (c) G.CHARACTER_DEFS[id] = c
  }
  return G.CHARACTER_DEFS
}
// 角色属性面板：属性上限计算规则集中一处（生命/耐力/饥饿/饥渴/负重 + 属性 + 特质）
def.characterPanel = function (charId) {
  const c = G.CHARACTER_DEFS[charId]
  if (!c) return null
  return {
    charId,
    name: c.name,
    maxLife: C.MAX_LIFE + (c.bonus.lifeBonus || 0) + (c.attrs.con || 1) * 5,
    maxEnergy: C.MAX_STAMINA + (c.bonus.energyBonus || 0),
    maxHunger: c.hungerMax || C.MAX_HUNGER,
    maxThirst: c.thirstMax || C.MAX_THIRST,
    carryLimit: c.carryLimit || (C.BASE_CARRY + (c.attrs.str || 1) * C.CARRY_PER_STR + (c.carryBonus || 0)),
    attrs: Object.assign({}, c.attrs),
    trait: Object.assign({}, c.trait),
    traitDesc: c.traitDesc || '',
    startItems: c.startItems || {},
    itemsDesc: c.itemsDesc || '',
    ability: c.ability || null,
    battleCards: c.battleCards || [],
  }
}

// ---- 装备工厂：装备类物品（护甲/武器/工具）规范化 + 叠加扩展 ----
// 装备效果分类：use.armor → 护甲 / use.combat → 武器 / use.scout → 工具
def.equipTypeOf = function (use) {
  const u = use || {}
  if (u.armor) return '护甲'
  if (u.combat) return '武器'
  if (u.scout) return '工具'
  return null
}
def.equipment = function (cfg) {
  if (!cfg || !cfg.id) return null
  const e = def.item(cfg) // 复用物品工厂（补 weight 等默认）
  e.equipType = cfg.equipType || def.equipTypeOf(e.use)
  return e
}
// 装备叠加注册（写入 G.ITEMS，可多次调用新增装备）
def.equipments = function (map) {
  for (const id in map || {}) {
    const e = def.equipment(Object.assign({ id }, map[id]))
    if (e) G.ITEMS[id] = e
  }
  return G.ITEMS
}
// 装备效果集中解析：统一返回结构化效果（供使用逻辑/界面/图鉴读取）
def.equipEffect = function (item) {
  const u = (item && item.use) || {}
  return {
    armor: u.armor || 0,
    combat: u.combat || 0,
    scout: u.scout || 0,
    heal: u.heal || 0,
    bandage: u.bandage || 0,
    morale: u.morale || 0,
    stamina: u.stamina || 0,
    data: u.data || 0,
    hunger: u.hunger || 0,
    thirst: u.thirst || 0,
  }
}

// ---- 技能系统：能力工厂 + 效果元信息 + 叠加扩展 ----
// kind 元信息：每种技能类型的效果描述模板（执行逻辑见 store.useAbility 的集中效果表）
def.ABILITY_INFO = {
  combat: { name: '战斗增益', icon: '⚔', effect: (ab) => `下一次战斗伤害 +${ab.value}` },
  researchBoost: { name: '研究增益', icon: '🔬', effect: (ab) => `接下来的 ${ab.value} 次研究星之记忆翻倍` },
  heal: { name: '急救', icon: '💊', effect: (ab) => `止血并恢复 ${ab.value} 点生命` },
  restore: { name: '恢复', icon: '🌊', effect: (ab) => `恢复 ${ab.value} 点耐力与精神` },
}
def.ability = function (cfg) {
  if (!cfg || !cfg.id) return null
  const a = Object.assign({}, cfg)
  a.time = a.time || 20 // 使用消耗耐力
  a.cooldown = a.cooldown || [5, 10] // 冷却天数范围
  const info = def.ABILITY_INFO[a.kind]
  if (info) a.kindName = info.name
  if (!a.desc && info) a.desc = info.effect(a) // 效果描述模板
  return a
}
// 能力叠加注册：`G.def.abilities({ id: {...} })` 写入 G.ABILITIES（角色可引用或扩展新技能）
def.abilities = function (map) {
  G.ABILITIES = G.ABILITIES || {}
  for (const id in map || {}) {
    const a = def.ability(Object.assign({ id }, map[id]))
    if (a) G.ABILITIES[id] = a
  }
  return G.ABILITIES
}

// ---- 地图系统：敌人工厂 / 地点工厂 / 叠加注册 / 集中面板 ----
// 顶层 enemy()/loc() 为完整规范化工厂（见 data-def/organs.js），此处提供统一注册入口与面板计算
def.enemy = function (cfg) {
  if (!cfg || !cfg.name) return null
  return (window.enemy || function (c) { return c })(cfg)
}
def.location = function (cfg) {
  if (!cfg || !cfg.id) return null
  return (window.loc || function (c) { return c })(cfg)
}
// 地点叠加注册：`G.def.locations({ id: { name, eco, enemies: [...] } })` 一行新增地图
def.locations = function (map) {
  G.LOCATIONS = G.LOCATIONS || {}
  for (const id in map || {}) {
    const l = def.location(Object.assign({ id }, map[id]))
    if (l && l.id) G.LOCATIONS[l.id] = l
  }
  return G.LOCATIONS
}
// 敌人信息集中面板：难度/群落/能力/掉落（图鉴、地图、战前情报共用）
def.enemyInfo = function (e) {
  if (!e) return null
  return {
    name: e.name,
    power: e.power,
    effectivePower: e.effectivePower || e.power,
    maxPop: e.maxPop,
    archetypeName: e.archetypeName || '均衡型',
    ability: e.ability || null,
    core: e.core || false,
    seasonal: e.seasonal || false,
    loot: e.loot || {},
    organ: e.organ || null,
  }
}
// 地点信息集中面板：生态/探索上限/邻居/进入要求/过夜/生物列表
def.locationInfo = function (id) {
  const l = G.LOCATIONS[id]
  if (!l) return null
  return {
    id: l.id,
    name: l.name,
    eco: l.eco || [],
    desc: l.desc,
    scoutNeed: l.scoutNeed || C.SCOUT_NEEDED,
    neighbors: l.neighbors || [],
    require: l.require || null,
    overnight: l.overnight || {},
    enemies: (l.enemies || []).map(def.enemyInfo),
    seasonalEnemies: l.seasonalEnemies || {},
  }
}

// ---- 战斗系统：卡牌工厂 + 卡牌类型元信息 + 战斗状态工厂 ----
def.CARD_TYPE_NAMES = { damage: '攻击', block: '防御', heal: '治疗', energy: '能量', draw: '抽牌', element: '元素', multi: '连击' }
// 卡牌工厂：规范化战斗卡（补默认数值 + 自动标注类型）
def.card = function (cfg) {
  if (!cfg || !cfg.name) return null
  const c = Object.assign({ energyCost: 1, damage: 0, block: 0, heal: 0, energyGain: 0, draw: 0 }, cfg)
  if (!c.cardType) {
    if (c.damage > 0) c.cardType = 'damage'
    else if (c.heal > 0) c.cardType = 'heal'
    else if (c.block > 0) c.cardType = 'block'
    else if (c.energyGain > 0) c.cardType = 'energy'
    else if (c.draw > 0) c.cardType = 'draw'
    else c.cardType = 'block'
  }
  return c
}
// 卡牌叠加注册：star 指定加入星级奖励池（REWARD_CARDS[star]），否则加入初始卡组
def.cards = function (list, star) {
  const arr = (Array.isArray(list) ? list : []).map((c) => def.card(c)).filter(Boolean)
  if (!arr.length) return 0
  if (star) {
    G.REWARD_CARDS = G.REWARD_CARDS || {}
    G.REWARD_CARDS[star] = (G.REWARD_CARDS[star] || []).concat(arr)
  } else {
    G.BASE_BATTLE_CARDS = G.BASE_BATTLE_CARDS || []
    G.BASE_BATTLE_CARDS.push.apply(G.BASE_BATTLE_CARDS, arr)
  }
  return arr.length
}
// 战斗状态工厂：新建/重置一场战斗的初始状态（供 startBattle 复用，字段与 B.battle reactive 一致）
def.battleState = function () {
  return {
    active: false, enemy: null, enemyHp: 0, enemyMaxHp: 0, energy: 0, shield: 0,
    deck: [], discard: [], hand: [], turn: 1, animTick: 0, floaters: [], battleLog: [],
    showEnemyInfo: false, showInfoModal: false, startSnapshot: null, peek: null,
    enemyIntent: null, enemyAbilities: [], enemyStep: 0, enemyShield: 0, enemyAtkBuff: 0, enemyFeint: false,
    playerStatus: { fire: [], poison: 0, ice: 0, wind: 0, lightning: 0, water: 0, corrode: 0 },
    enemyStatus: { fire: [], poison: 0, ice: 0, wind: 0, lightning: 0, water: 0, corrode: 0 },
    playerInvuln: false, playerDouble: 0, playerExtraTurn: false, playerEcho: 0, playerThorns: 0,
    playerPowers: { str: 0, dex: 0, block: 0, draw: 0 },
    tribes: {}, tribeBonuses: {}, elite: false, rageMode: false, rageName: '',
    noDodgeWeather: false, weatherStaminaLoss: 0,
    rewardChoices: [], rewardPicked: false, rewardShow: false, organShow: false, organConfirm: false,
    stats: { cardsPlayed: 0, damageDealt: 0, maxHit: 0 }, organAbilities: [],
    fx: [], fxSeq: 0,
  }
}

// ---- 流派系统 ----
def.tribe = function (cfg) {
  if (!cfg || !cfg.id) return null
  return Object.assign({ icon: '✦', desc: '', tier1: '', tier2: '' }, cfg)
}
def.tribes = function (map) {
  G.TRIBES = G.TRIBES || {}
  for (const id in map || {}) { const t = def.tribe(Object.assign({ id }, map[id])); if (t) G.TRIBES[id] = t }
  return G.TRIBES
}
// 流派面板：按牌组同流派数量返回激活档位（≥2 Ⅰ阶 / ≥4 Ⅱ阶）
def.tribeInfo = function (id, count) {
  const t = G.TRIBES[id]
  if (!t) return null
  const tier = count >= 4 ? 2 : count >= 2 ? 1 : 0
  return { id, name: t.name, icon: t.icon, tier, active: tier > 0, desc: t.desc, benefit: tier === 2 ? t.tier2 : tier === 1 ? t.tier1 : '' }
}

// ---- 研究系统 ----
def.research = function (cfg) {
  if (!cfg || !cfg.id) return null
  return Object.assign({ maxRank: 1, base: 10, step: 0, desc: '' }, cfg)
}
def.researches = function (map) {
  G.RESEARCH_DEFS = G.RESEARCH_DEFS || {}
  for (const id in map || {}) { const r = def.research(Object.assign({ id }, map[id])); if (r) G.RESEARCH_DEFS[id] = r }
  return G.RESEARCH_DEFS
}
// 研究面板：当前等级/成本（与 store.researchCost 同规则）
def.researchInfo = function (id, rank) {
  const r = G.RESEARCH_DEFS[id]
  if (!r) return null
  rank = rank || 0
  const cost = rank >= r.maxRank ? -1 : r.base + rank * r.step
  return { id, name: r.name, desc: r.desc, rank, maxRank: r.maxRank, cost, done: cost < 0 }
}

// ---- 生态系统 ----
def.ecos = function (map) {
  G.ECO_SERIES = G.ECO_SERIES || {}
  for (const k in map || {}) G.ECO_SERIES[k] = map[k]
  return G.ECO_SERIES
}
def.ecoInfo = function (eco) {
  const s = G.ECO_SERIES && G.ECO_SERIES[eco]
  if (!s) return null
  const m = s.main
  return {
    eco, main: m, aux: s.aux || [],
    mainName: G.ITEMS[m.id] ? G.ITEMS[m.id].name : m.name,
    recipeCount: (s.recipes || []).length,
    regionItems: (G.REGION_ITEMS[eco] || []).length,
  }
}

// ---- 探索事件 ----
def.event = function (cfg) {
  if (!cfg || !cfg.id) return null
  return Object.assign({ chance: 1, text: '' }, cfg)
}
def.events = function (map) {
  G.ECO_EVENTS = G.ECO_EVENTS || {}
  for (const eco in map || {}) {
    G.ECO_EVENTS[eco] = G.ECO_EVENTS[eco] || []
    const arr = (Array.isArray(map[eco]) ? map[eco] : []).map((c) => def.event(c)).filter(Boolean)
    G.ECO_EVENTS[eco].push.apply(G.ECO_EVENTS[eco], arr)
  }
  return G.ECO_EVENTS
}
def.eventInfo = function (ev) {
  if (!ev) return null
  return { id: ev.id, name: ev.name, chance: ev.chance, text: ev.text, hasChoices: !!ev.choices, choiceCount: (ev.choices || []).length }
}

// ---- 剧情 / 结局 ----
def.ending = function (cfg) {
  if (!cfg || !cfg.id) return null
  return Object.assign({ icon: '🌌', name: '', text: '' }, cfg)
}
def.endings = function (map) {
  G.ENDINGS = G.ENDINGS || {}
  for (const id in map || {}) { const e = def.ending(Object.assign({ id }, map[id])); if (e) G.ENDINGS[id] = e }
  return G.ENDINGS
}
def.loreInfo = function (key) {
  const l = G.LORE && G.LORE[key]
  if (!l) return null
  return { key, title: l.t, text: l.s }
}

// ---- 天气 ----
def.weather = function (cfg) {
  if (!cfg || !cfg.id) return null
  return Object.assign({ icon: '☀️', desc: '' }, cfg)
}
def.weathers = function (map) {
  G.WEATHERS = G.WEATHERS || {}
  for (const id in map || {}) { const w = def.weather(Object.assign({ id }, map[id])); if (w) G.WEATHERS[id] = w }
  return G.WEATHERS
}
def.weatherPools = function (map) {
  // 季节天气池叠加注册：season → [[id, 权重], ...]
  G.WEATHER_POOL = Object.assign(G.WEATHER_POOL || {}, map || {})
  return G.WEATHER_POOL
}

// ---- 设施 ----
def.facility = function (cfg) {
  if (!cfg || !cfg.id) return null
  return Object.assign({ name: '', desc: '' }, cfg)
}
def.facilities = function (map) {
  G.FACILITIES = G.FACILITIES || {}
  for (const id in map || {}) { const f = def.facility(Object.assign({ id }, map[id])); if (f) G.FACILITIES[id] = f }
  return G.FACILITIES
}

// ---- 宠物 ----
def.pet = function (cfg) {
  if (!cfg || !cfg.id) return null
  return Object.assign({ icon: '🐾', name: '', desc: '' }, cfg)
}
def.pets = function (map) {
  G.PETS = G.PETS || {}
  for (const id in map || {}) { const p = def.pet(Object.assign({ id }, map[id])); if (p) G.PETS[id] = p }
  return G.PETS
}

// ---- 元素 / 状态病 ----
def.element = function (cfg) {
  if (!cfg || !cfg.id) return null
  return Object.assign({ icon: '✦', color: '#ffffff', desc: '', decay: false }, cfg)
}
def.elements = function (map) {
  G.ELEMENT_INFO = G.ELEMENT_INFO || {}
  for (const id in map || {}) { const e = def.element(Object.assign({ id }, map[id])); if (e) G.ELEMENT_INFO[id] = e }
  return G.ELEMENT_INFO
}
def.disease = function (cfg) {
  if (!cfg || !cfg.id) return null
  return Object.assign({ icon: '⚠', desc: '', daily: {}, cures: [] }, cfg)
}
def.diseases = function (map) {
  G.DISEASES = G.DISEASES || {}
  for (const id in map || {}) { const d = def.disease(Object.assign({ id }, map[id])); if (d) G.DISEASES[id] = d }
  return G.DISEASES
}

// ---- UI 系统：组件注册器 + 动态挂载 ----
// UI_EXTRA 用响应式数组：def.ui push 后 UiExtras 的 v-for 自动重渲染
window.GAME.UI_EXTRA = window.GAME.UI_EXTRA || (typeof Vue !== 'undefined' ? Vue.reactive([]) : [])
// def.ui(name, component)：注册组件到全局组件表 + 动态挂载列表 + 同步注册进 Vue 应用
def.ui = function (name, component) {
  if (!name || !component) return null
  window.GAME.components = window.GAME.components || {}
  window.GAME.components[name] = component
  if (window.GAME.UI_EXTRA.indexOf(name) === -1) window.GAME.UI_EXTRA.push(name)
  // 运行期注册也同步到 Vue 应用，保证 <component :is> 能解析
  if (window.GAME.app && window.GAME.app.component) window.GAME.app.component(name, component)
  return component
}
// def.uiAll(map)：批量注册 UI 组件（{ 组件名: { template, setup } }）
def.uiAll = function (map) {
  for (const name in map || {}) def.ui(name, map[name])
  return map
}

// ---- 逻辑层集中：抉择结果效果表 / 结局判定 / 通用研究默认 ----
// 抉择结果效果表：result 键 → 效果实现（新增抉择结果类型只需加表项）；handler(v, log, S)
def.CHOICE_EFFECTS = {
  fungus(v, log, S) { window.addResource('fungus', v); log.push(`菌丝块 +${v}`) },
  brine(v, log, S) { window.addResource('brine', v); log.push(`盐水 +${v}`) },
  metal(v, log, S) { window.addResource('metal', v); log.push(`金属残片 +${v}`) },
  wood(v, log, S) { window.addResource('wood', v); log.push(`木材 +${v}`) },
  stone(v, log, S) { window.addResource('stone', v); log.push(`燧石 +${v}`) },
  bone(v, log, S) { window.addResource('bone', v); log.push(`骸骨 +${v}`) },
  fiber(v, log, S) { window.addResource('fiber', v); log.push(`异星纤维 +${v}`) },
  clay(v, log, S) { window.addResource('clay', v); log.push(`黏土 +${v}`) },
  mat(v, log, S) {
    const MATS = ['metal', 'stone', 'bone', 'fiber', 'clay']
    window.addResource(MATS[Math.floor(Math.random() * MATS.length)], v)
    log.push(`稀有材料 +${v}`)
  },
  data(v, log, S) { S.player.data += v; log.push(`星之记忆 +${v}`) },
  life(v, log, S) { S.player.life = Math.max(S.player.life + v, 0); log.push(`生命 ${v > 0 ? '+' : ''}${v}`) },
  stamina(v, log, S) { S.player.stamina = Math.max(Math.min(S.player.stamina + v, S.getMaxEnergy()), 0); log.push(`耐力 ${v > 0 ? '+' : ''}${v}`) },
  morale(v, log, S) { S.player.morale = Math.max(S.player.morale + v, 0); log.push(`精神 ${v > 0 ? '+' : ''}${v}`) },
  time(v, log, S) { if (S.pay) S.pay(v, 0, undefined, undefined, true); log.push(`时间 -${v}`) },
  lore(v, log, S) {
    // 随机解锁一条未收集剧情线索
    const missing = Object.keys(G.LORE || {}).filter((k) => !(S.world && S.world.lore && S.world.lore[k]))
    if (missing.length) S.collectLore(missing[Math.floor(Math.random() * missing.length)])
  },
  disease(v, log, S) { if (S.applyDisease) S.applyDisease(v) },
}
// 活体建筑每日产出表：stage → 产出（复用 CHOICE_EFFECTS 结算，新增阶段产出只需加表项）
def.BUILDING_DAILY = {
  2: { fungus: 1 },
  3: { brine: 1 },
  5: { data: 1 },
}
// 季节过夜效果表：season → { waterDrain 额外水耗 / lifeDamage 无抗寒冻伤 / note 提示 }（新增季节效果只加表项）
def.SEASON_EFFECTS = {
  1: { waterDrain: 1, note: '燥热期：炎热蒸发，额外消耗 1 点水。' },
  2: { note: '暴动期：星球上的生物正在暴动，战斗会更加凶险！' },
  3: { waterDrain: 1, lifeDamage: 5, note: '冷寂期：严寒干燥，额外消耗 1 点水。', coldNote: '冷寂期的严寒侵蚀着你，生命 -5！（移植抗寒器官可抵御）' },
}
// 天气战斗效果表：weather.battle 键 → 效果（fn(v, battle, log)，新增天气战斗效果只加表项）
def.BATTLE_WEATHER_EFFECTS = {
  enemyAtkDown(v, b, log) { b.enemyStatus.atkDown = (b.enemyStatus.atkDown || 0) + v; log(`暴雨让敌人迟缓，攻击 -${v}。`) },
  enemyAtkUp(v, b, log) { b.enemyAtkBuff += v; log(`严寒中敌人愈发凶悍，攻击 +${v}。`) },
  noDodge(v, b, log) { b.noDodgeWeather = true; log('沙暴遮蔽视线：本场战斗你无法闪避敌人的攻击！') },
  staminaLoss(v, b, log) { b.weatherStaminaLoss = v; log('酷暑难耐：每回合开始时你将损失耐力。') },
}
// 状态病每日扣减表：disease.daily 键 → 效果（fn(v, S) 返回日志片段，新增状态病扣减类型只加表项）
def.DISEASE_DAILY_EFFECTS = {
  life(v, S) { S.player.life = Math.max(S.player.life - v, 0); return `生命 -${v}` },
  stamina(v, S) { S.player.stamina = Math.max(S.player.stamina - v, 0); return `耐力 -${v}` },
  thirst(v, S) { S.player.thirst = Math.max(S.player.thirst - v, 0); return `水 -${v}` },
}
// 物品获取来源汇总：生态采集点 / 生态主材料 / 配方制作（制作界面悬浮提示材料来源用，运行期懒构建）
def.ITEM_SOURCE = null
def.buildItemSources = function () {
  const m = {}
  const push = (id, src) => { (m[id] = m[id] || []); if (m[id].indexOf(src) === -1) m[id].push(src) }
  // 1. 生态采集点（REGION_ITEMS 的 harvest 产出）
  for (const eco in G.REGION_ITEMS) {
    for (const it of G.REGION_ITEMS[eco] || []) {
      if (it.harvest && it.harvest.item) push(it.harvest.item, `「${eco}」采集`)
    }
  }
  // 2. 生态主材料（各生态 dep 采集点产出）
  for (const eco in G.ECO_SERIES) {
    const s = G.ECO_SERIES[eco]
    if (s.main && s.main.id) push(s.main.id, `「${eco}」生态材料`)
  }
  // 3. 配方制作产出物
  for (const r of G.RECIPES || []) {
    for (const oid in r.out || {}) push(oid, `「${r.name}」制作`)
  }
  // 4. 基础资源兜底：多生态采集 / 战斗掉落
  const BASE = {
    fungus: '多生态采集 / 食用菌丝',
    brine: '多生态采集 / 水源',
    metal: '多生态采集 / 废料回收',
    wood: '林地生态采集',
    stone: '多生态采集 / 岩地',
    bone: '坟场生态 / 战斗掉落',
    fiber: '多生态采集 / 植被',
    clay: '湖泽 / 谷地采集',
    resin: '「共生森林」采集',
    hide: '战斗掉落 / 兽类材料',
    specimen: '湖泽 / 坟场 / 战斗掉落',
    gem: '「幽深洞窟」/「星空高原」采集',
    venom: '「腐化泥沼」采集',
    star_dust: '「星空高原」采集',
  }
  for (const id in BASE) push(id, BASE[id])
  return m
}
def.itemSources = function (id) {
  if (!def.ITEM_SOURCE) def.ITEM_SOURCE = def.buildItemSources()
  return (def.ITEM_SOURCE[id] || [])
}
// 新手任务链：新局逐步引导核心玩法，check 完成即发奖励（reward 复用 CHOICE_EFFECTS 表结算）
def.NEWBIE_QUESTS = [
  { id: 'q_explore', title: '踏上旅途', desc: '点击「探索」搜索这片土地，推进勘探进度。', check: (S) => (S.player.exploreCount || 0) >= 1, reward: { fungus: 2 }, rewardText: '菌丝块×2' },
  { id: 'q_harvest', title: '收集物资', desc: '在地区物品上点击「采集」，获取产出物资。', check: (S) => (S.player.harvestCount || 0) >= 1, reward: { brine: 2 }, rewardText: '盐水×2' },
  { id: 'q_craft', title: '手作工具', desc: '打开「制作」面板，合成一件物品。', check: (S) => (S.player.craftCount || 0) >= 1, reward: { fiber: 2 }, rewardText: '异星纤维×2' },
  { id: 'q_research', title: '解析记忆', desc: '在「研究」面板完成一次研究，获取星之记忆。', check: (S) => (S.player.researchCount || 0) >= 1, reward: { data: 3 }, rewardText: '星之记忆×3' },
  { id: 'q_rest', title: '恢复体力', desc: '点击「休息」，恢复耐力和精神。', check: (S) => (S.player.restCount || 0) >= 1, reward: { fungus: 2 }, rewardText: '菌丝块×2' },
  { id: 'q_battle', title: '初次猎杀', desc: '探索遭遇或直接挑战一只生物并取得胜利。', check: (S) => (S.player.killCount || 0) >= 1, reward: { metal: 2, data: 2 }, rewardText: '金属残片×2、星之记忆×2' },
  { id: 'q_organ', title: '移植器官', desc: '在「躯体」面板将战利品器官移植到身体槽位。', check: (S) => (S.inventory.transplantedOrgans && S.inventory.transplantedOrgans.length >= 1), reward: { data: 4, fungus: 3 }, rewardText: '星之记忆×4、菌丝块×3' },
]
// 结局判定集中：按生存表现返回结局（供死亡结算与结局图鉴共用）
def.endingOf = function (state) {
  const loreAll = !!state.lore && Object.keys(G.LORE || {}).length > 0 && Object.keys(state.lore).length >= Object.keys(G.LORE || {}).length
  const escapee = loreAll && (state.day || 0) >= 60
  const symbiote = (state.buildingStage || 0) >= 5 && (state.transplanted || 0) >= 6
  if (escapee) return G.ENDINGS.escapee
  if (symbiote) return G.ENDINGS.symbiote
  return G.ENDINGS.reaper
}
})()
