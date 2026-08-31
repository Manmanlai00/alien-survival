/* ============ 游戏数据装配器：加载各数据模块 + 批量生成逻辑 ============ */
var G = window.GAME.data || (window.GAME.data = {})
;(function () {
  const ALL = []
  for (const s of [1, 2, 3, 4, 5]) {
    const arr = G.REWARD_CARDS[s]
    if (arr) ALL.push.apply(ALL, arr)
  }
  for (const c of ALL) {
    if (!c || !c.name) continue
    let t = null
    if (c.element === 'poison' || c.poisonBurst) t = 'venom'
    else if (c.element === 'corrode') t = 'corrode'
    else if (c.element === 'fire') t = 'blaze'
    else if (c.element === 'lightning') t = 'volt'
    else if (c.strength || c.rampage) t = 'might'
    else if (c.dexterity) t = 'swift'
    else if (c.doubleNext || c.echo || c.tempStrength) t = 'burst'
    else if (c.lifesteal) t = 'blood'
    else if (c.hits) t = 'flurry'
    else if (c.loseLife) t = 'sacrifice'
    else if (c.block || c.fortify) t = 'guard'
    else if (c.draw) t = 'cycle'
    if (t) c.tribe = t
  }
})();
// 流派效果说明文本（图鉴展示）
;(function () {
  for (const eco in G.ECO_SERIES) {
    const s = G.ECO_SERIES[eco]
    const m = s.main
    if (!G.ITEMS[m.id]) {
      G.ITEMS[m.id] = { name: m.name, desc: m.desc, weight: 1, material: true }
    }
    for (const r of s.recipes) {
      if (r.item && !G.ITEMS[r.id]) G.ITEMS[r.id] = Object.assign({ weight: 1, eco }, r.item)
      G.RECIPES.push(G.def.recipe({ id: r.id, name: r.name, in: r.in, out: r.out, desc: r.desc, eco, req: 'eco_' + eco }))
    }
    // 各生态主材料采集点：探索采集即可获得该生态主要材料
    G.REGION_ITEMS[eco] = G.REGION_ITEMS[eco] || []
    G.REGION_ITEMS[eco].unshift({
      id: 'dep_' + m.id, name: m.depName, desc: m.depDesc, harvest: { item: m.id, amount: 1 }, stock: 3, restoreDays: 3, harvestTime: 20,
    })
  }
})();

// ===== 生态通用配方批量生成：每生态 12 个通用配方（+4 个特色配方 ≥15），物品强度随「材料消耗数量」与「生态获取难度」双重递增 =====
(function () {
  // 生态主题词 + 难度档 tier（1-6，越高代表该生态材料越难获取，产出数值越高）
  const ECO_THEME = {
    '营地平原': { word: '营菌', tier: 1 },
    '共生森林': { word: '林芯', tier: 2 },
    '甲烷湖泽': { word: '湖泽', tier: 2 },
    '远古遗迹': { word: '遗迹', tier: 3 },
    '幽深洞窟': { word: '洞晶', tier: 3 },
    '地热裂谷': { word: '地热', tier: 3 },
    '地脉核心': { word: '地脉', tier: 5 },
    '极高山脉': { word: '雪山', tier: 4 },
    '冰封冻野': { word: '冻原', tier: 4 },
    '盐晶荒原': { word: '盐晶', tier: 3 },
    '巨兽坟场': { word: '巨骨', tier: 5 },
    '孢子雨林': { word: '菌林', tier: 4 },
    '暗潮海岸': { word: '潮汐', tier: 4 },
    '风蚀峡谷': { word: '风蚀', tier: 4 },
    '磁力高原': { word: '磁力', tier: 4 },
    '腐化泥沼': { word: '腐沼', tier: 4 },
    '星空高原': { word: '星穹', tier: 6 },
    '熔岩深渊': { word: '熔岩', tier: 6 },
    '遗忘荒漠': { word: '荒漠', tier: 5 },
  }
  // 通用配方模板：消耗主材料越多档位越高（产出越强）；k = tier-1 让高难度生态产出更高
  const GEN_T = [
    { key: 'ration', name: '干粮', mainN: 1, auxN: 0, use: (k) => ({ hunger: 45 + 3 * k }) },
    { key: 'stew', name: '浓汤', mainN: 2, auxN: 1, use: (k) => ({ hunger: 65 + 3 * k, morale: 4 }) },
    { key: 'drink', name: '净饮', mainN: 2, auxN: 0, use: (k) => ({ thirst: 55 + 3 * k }) },
    { key: 'salve', name: '药膏', mainN: 1, auxN: 1, use: (k) => ({ heal: 13 + 2 * k }) },
    { key: 'elixir', name: '药剂', mainN: 2, auxN: 2, use: (k) => ({ heal: 26 + 3 * k }) },
    { key: 'blade', name: '短刃', mainN: 1, auxN: 1, use: () => ({ combat: 1 }) },
    { key: 'warblade', name: '战刃', mainN: 2, auxN: 2, use: () => ({ combat: 2 }) },
    { key: 'godblade', name: '神兵', mainN: 3, auxN: 3, use: (k) => ({ combat: k >= 3 ? 4 : 3 }) },
    { key: 'lightarmor', name: '轻甲', mainN: 2, auxN: 1, use: (k) => ({ armor: 16 + 3 * k }) },
    { key: 'heavyarmor', name: '重甲', mainN: 3, auxN: 2, use: (k) => ({ armor: 28 + 3 * k }) },
    { key: 'codex', name: '秘典', mainN: 2, auxN: 2, use: (k) => ({ data: 5 + 2 * k }) },
    { key: 'probe', name: '勘测器', mainN: 2, auxN: 1, use: (k) => ({ scout: 8 + 2 * k }) },
  ]
  for (const eco in G.ECO_SERIES) {
    const th = ECO_THEME[eco]
    if (!th) continue
    const s = G.ECO_SERIES[eco]
    // 生态检索研究：研究后解锁该生态全部制作配方（成本随生态难度 tier 递增）
    const ecoReq = 'eco_' + eco
    G.RESEARCH_DEFS[ecoReq] = { name: eco + '制作', maxRank: 1, base: 6 + th.tier * 3, step: 0, desc: '解锁「' + eco + '」生态的全部制作配方', log: `「${eco}」制作掌握！该生态的全部制作配方已解锁，可前往制作界面制作。` }
    for (const r of s.recipes) G.RECIPE_REQ[r.id] = ecoReq
    const m = s.main.id
    const mainName = G.ITEMS[m] ? G.ITEMS[m].name : m
    const aux = s.aux
    const k = th.tier - 1
    for (const t of GEN_T) {
      const id = th.word + '_' + t.key
      if (G.ITEMS[id]) continue
      const inNeed = {}
      inNeed[m] = t.mainN
      if (t.auxN > 0) inNeed[aux[0]] = t.auxN
      const outName = th.word + t.name
      G.ITEMS[id] = { name: outName, desc: `${eco}出产：以${mainName}为主料精制的${outName}，越难获取的生态产出品质越高。`, weight: 1, eco, use: t.use(k) }
      const inNames = Object.keys(inNeed).map((x) => (G.ITEMS[x] ? G.ITEMS[x].name : x) + '×' + inNeed[x]).join('+')
      G.RECIPES.push(G.def.recipe({ id, name: outName, in: inNeed, out: { [id]: 1 }, desc: `${inNames} → 1${outName}`, eco, req: 'eco_' + eco }))
    }
  }
})();

// ===== 补齐各生态地点卡的「研究 / 基础食物」采集点：保证每生态同时具备生态材料采集、研究、基础食物获取 =====
(function () {
  const EXTRA = {
    '营地平原': [
      { id: 'camp_fossil', name: '营地化石', desc: '营地边翻出的远古化石，纹路里封存着知识。', research: { data: 3 }, stock: 2, restoreDays: 3, researchTime: 20 },
    ],
    '共生森林': [
      { id: 'bark_yearring', name: '树纹年轮', desc: '巨树截面上的年轮，记录着远古的气候。', research: { data: 4 }, stock: 2, restoreDays: 3, researchTime: 20 },
    ],
    '甲烷湖泽': [
      { id: 'lake_stele', name: '湖底碑文', desc: '湖底半埋的石碑，刻着看不懂的符号。', research: { data: 4 }, stock: 2, restoreDays: 3, researchTime: 20 },
    ],
    '地热裂谷': [
      { id: 'spring_rune', name: '热泉刻纹', desc: '热泉岩壁上的天然刻纹，蕴含信息。', research: { data: 5 }, stock: 2, restoreDays: 3, researchTime: 20 },
    ],
    '巨兽坟场': [
      { id: 'marrow_sample', name: '髓腔样本', desc: '巨兽骨髓腔中保存完好的髓质，值得研究。', research: { data: 8 }, stock: 2, restoreDays: 3, researchTime: 20 },
    ],
    '暗潮海岸': [
      { id: 'wreck_compass', name: '沉船罗盘', desc: '沉船残骸中的罗盘，指针早已失灵。', research: { data: 6 }, stock: 2, restoreDays: 3, researchTime: 20 },
    ],
    '腐化泥沼': [
      { id: 'bog_crystal_item', name: '毒沼结晶', desc: '腐沼中析出的暗绿结晶，内部流转着未知能量。', research: { data: 6 }, stock: 2, restoreDays: 3, researchTime: 20 },
    ],
    '远古遗迹': [
      { id: 'ruin_fungus', name: '遗迹菌丛', desc: '石缝中倔强生长的菌丛，可以食用。', harvest: { item: 'fungus', amount: 1 }, stock: 3, restoreDays: 1, harvestTime: 10 },
      { id: 'ruin_puddle', name: '残垣积水', desc: '残破石台凹陷处积起的雨水。', harvest: { item: 'brine', amount: 1 }, stock: 2, restoreDays: 1, harvestTime: 10 },
    ],
    '盐晶荒原': [
      { id: 'salt_fungus', name: '盐渍菌', desc: '耐盐的菌类在盐晶间生长，可以食用。', harvest: { item: 'fungus', amount: 1 }, stock: 3, restoreDays: 1, harvestTime: 10 },
    ],
    '风蚀峡谷': [
      { id: 'crack_moss', name: '岩缝苔', desc: '岩缝中潮湿的苔藓，可以食用。', harvest: { item: 'fungus', amount: 1 }, stock: 3, restoreDays: 1, harvestTime: 10 },
    ],
    '磁力高原': [
      { id: 'plateau_moss', name: '旱地藓', desc: '磁石缝隙里的旱藓，可以食用。', harvest: { item: 'fungus', amount: 1 }, stock: 3, restoreDays: 1, harvestTime: 10 },
    ],
    '熔岩深渊': [
      { id: 'magma_fungus', name: '熔隙菌', desc: '熔岩缝隙中生长的耐热菌，可以食用。', harvest: { item: 'fungus', amount: 1 }, stock: 3, restoreDays: 1, harvestTime: 10 },
    ],
  }
  for (const eco in EXTRA) {
    G.REGION_ITEMS[eco] = G.REGION_ITEMS[eco] || []
    for (const it of EXTRA[eco]) {
      if (!G.REGION_ITEMS[eco].some((x) => x.id === it.id)) G.REGION_ITEMS[eco].push(it)
    }
  }
})()

// ---- 角色定义（开局选择） ----
;(function () {
  const namePower = {}
  for (const id in G.LOCATIONS) {
    const loc = G.LOCATIONS[id]
    if (!loc) continue
    if (loc.enemies) for (const e of loc.enemies) namePower[e.name] = e.effectivePower || e.power
    if (loc.seasonal) for (const k in loc.seasonal) namePower[loc.seasonal[k].name] = loc.seasonal[k].effectivePower || loc.seasonal[k].power
  }
  for (const sc of G.SUPER_CREATURES || []) namePower[sc.name] = 10
  for (const eco in G.ECO_SUPER_CREATURES || {}) {
    const sc = G.ECO_SUPER_CREATURES[eco]
    if (sc && sc.name) namePower[sc.name] = 10
  }
  for (const id in G.EVENT_ENEMIES || {}) namePower[G.EVENT_ENEMIES[id].name] = G.EVENT_ENEMIES[id].effectivePower || G.EVENT_ENEMIES[id].power
  for (const id in G.O) {
    const o = G.O[id]
    o.star = G.organStarOf(namePower[o.source] || 1) // 器官星级由来源生物战力（effectivePower）映射，无来源信息时默认 1 星
  }
})()

// ---- 星级强度校准：器官技能数值与文本统一按星级基准（星级越高强度越高） ----
;(function () {
  // combat 为半伤害（实际伤害 = combat×2）；amount 用于元素/易伤/虚弱层数；str/dex/draw 为附加增益
  const BASE = {
    1: { combat: 4, gather: 2, research: 2, amount: 2, block: 5, heal: 2, str: 1, dex: 1, draw: 1 },
    2: { combat: 6, gather: 3, research: 2, amount: 3, block: 9, heal: 3, str: 1, dex: 1, draw: 1 },
    3: { combat: 9, gather: 3, research: 3, amount: 5, block: 14, heal: 4, str: 2, dex: 2, draw: 1 },
    4: { combat: 13, gather: 4, research: 3, amount: 7, block: 20, heal: 5, str: 2, dex: 2, draw: 2 },
    5: { combat: 18, gather: 5, research: 4, amount: 9, block: 26, heal: 6, str: 3, dex: 3, draw: 2 },
  }
  for (const id in G.O) {
    const o = G.O[id]
    const sc = o.skillCard
    if (!sc) continue
    const b = BASE[o.star] || BASE[1]
    let d = sc.desc
    if (sc.combatPower > 0) {
      sc.combatPower = b.combat
      d = d.replace(/(造成 )\d+( 点伤害)/, '$1' + b.combat * 2 + '$2')
    }
    if (sc.gatherAmount > 0) {
      sc.gatherAmount = b.gather
      d = d.replace(/(恢复 )\d+( 点耐力)/, '$1' + b.gather + '$2')
    }
    if (sc.researchValue > 0) {
      sc.researchValue = b.research
      d = d.replace(/(获得 )\d+( 点星之记忆)/, '$1' + b.research + '$2')
    }
    if (sc.block > 0) {
      sc.block = b.block
      d = d.replace(/(获得 )\d+( 点格挡)/, '$1' + b.block + '$2')
    }
    if (sc.heal > 0) {
      sc.heal = b.heal
      d = d.replace(/(恢复 )\d+( 点生命)/, '$1' + b.heal + '$2')
    }
    if (sc.elementAmount > 0) {
      sc.elementAmount = b.amount
      d = d.replace(/(施加 )\d+( 层)/, '$1' + b.amount + '$2')
    }
    if (sc.applyVuln > 0) {
      sc.applyVuln = b.amount
      d = d.replace(/(\d+)( 层易伤)/, b.amount + '$2')
    }
    if (sc.applyWeak > 0) {
      sc.applyWeak = b.amount
      d = d.replace(/(\d+)( 层虚弱)/, b.amount + '$2')
    }
    // 附加增益：力量/敏捷/抽牌也随星级缩放（宽松匹配「获得 X」/「与 X」两种表述）
    if (sc.strength > 0) {
      sc.strength = b.str
      d = d.replace(/(\d+)( 点力量)/, b.str + '$2')
    }
    if (sc.dexterity > 0) {
      sc.dexterity = b.dex
      d = d.replace(/(\d+)( 点敏捷)/, b.dex + '$2')
    }
    if (sc.draw > 0) {
      sc.draw = b.draw
      d = d.replace(/(抽 )\d+( 张牌)/, '$1' + b.draw + '$2')
    }
    o.skillCard.desc = d
    // 遗物式光环：随星级成长（只升不降）
    const a = o.aura
    if (a) {
      if (a.shieldStart) a.shieldStart = Math.max(a.shieldStart, b.block)
      if (a.blockPerTurn) a.blockPerTurn = Math.max(a.blockPerTurn, Math.max(1, Math.round(b.block / 3)))
      if (a.strengthStart) a.strengthStart = Math.max(a.strengthStart, b.str)
      if (a.dexterityStart) a.dexterityStart = Math.max(a.dexterityStart, b.dex)
      if (a.healPerTurn) a.healPerTurn = Math.max(a.healPerTurn, Math.max(1, b.heal - 1))
    }
  }
})()

// ---- 首达生态剧情：第一次进入该生态的地图时弹窗展示 ----
;(function () {
  // 合成物品集合：凡出现在某个配方产出（out）中的物品均视为「制作品」
  const made = {}
  for (const rc of G.RECIPES) {
    for (const k in rc.out) made[k] = true
  }
  // 数值补偿系数：制作食物/饮水整体调高，弥补腐烂期间的效果损失
  const BOOST = 1.35
  for (const id in G.ITEMS) {
    const it = G.ITEMS[id]
    if (!it || !it.use || !made[id]) continue
    const food = (it.use.hunger || 0) > 0
    const drink = (it.use.thirst || 0) > 0
    if (!food && !drink) continue
    if (food) it.use.hunger = Math.round(it.use.hunger * BOOST)
    if (drink) it.use.thirst = Math.round(it.use.thirst * BOOST)
    // 腐烂节点：按最终数值分档（新鲜→微腐→腐败→腐烂，阶段与系数见 store.rotInfo）
    const val = Math.max(it.use.hunger || 0, it.use.thirst || 0)
    it.rotDays = val >= 80 ? 10 : val >= 50 ? 8 : 6
    it.perish = true
  }
})();

// ---- 装备标注：use.armor/combat/scout 的物品自动归类（护甲/武器/工具），供界面与集中效果解析 ----
;(function () {
  for (const id in G.ITEMS) {
    const it = G.ITEMS[id]
    if (!it || !it.use) continue
    if (it.equipType) continue // 已显式标注则保留
    const t = G.def.equipTypeOf(it.use)
    if (t) it.equipType = t
  }
})()

