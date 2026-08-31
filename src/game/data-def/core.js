/* 数据模块：core（由 data.js 拆分，结构原样保留；可用 G.def 注册器继续叠加扩展） */
var G = window.GAME.data || (window.GAME.data = {})
G.CardType = { MOVE: 0, EXPLORE: 1, HARVEST: 2, COMBAT: 3, RESEARCH: 4, SPECIAL: 5, DOT: 6, INVULN: 7, DOUBLE: 8 }
// 战斗机能卡类型判断（研究/恢复类技能卡算被动，不进战斗）
G.isCombatSkill = function (type) {
  return type === G.CardType.COMBAT || type === G.CardType.DOT || type === G.CardType.INVULN || type === G.CardType.DOUBLE
}
// ---- 元素状态定义：每个属性的持续伤害 / 衰减 / 特殊效果各不相同 ----
G.ELEMENT_INFO = {
  fire: { name: '灼烧', icon: '🔥', color: '#ff7a3c', desc: '每层持续 3 回合，回合末每层造成 1 点伤害，到期消失', decay: true },
  poison: { name: '剧毒', icon: '☠️', color: '#9be15d', desc: '每回合造成与层数等量的伤害，随后层数 -2（衰减）', decay: true },
  ice: { name: '冰封', icon: '❄️', color: '#7fd4ff', desc: '层数不衰减也不造成伤害，层数超过敌人生命时立即处决', decay: false },
  wind: { name: '风袭', icon: '🍃', color: '#b8e6a8', desc: '层数不衰减，达到 8 层时清零并额外获得一个行动回合（单次施加层数少）', decay: false },
  lightning: { name: '雷击', icon: '⚡', color: '#ffd98a', desc: '层数不衰减，每回合造成与层数等量的伤害（最多 8 层，单次施加层数少）', decay: false },
  water: { name: '水蚀', icon: '💧', color: '#6bc8ff', desc: '每回合压制敌人攻击（每层使攻击伤害 -1），随后层数 -1（衰减）', decay: true },
  corrode: { name: '腐蚀', icon: '🧪', color: '#c8ff7a', desc: '每回合造成与层数等量的伤害，回合结束时层数 +1 蔓延（上限 8 层）', decay: false, spread: true },
}
G.ResourceType = { FOOD: 0, WATER: 1, MATERIALS: 2, DATA: 3 }

// ---- 状态病系统：持续负面状态（每日结算），用药/物品治疗 ----
// days: 总病程天数（>=10，到期自然消退）；forever: 永久（永不消退，仅用药可治愈，剩余天数存 999 以便存档）
// stages: 阶段列表（按剩余天数 min 递减匹配，越拖越重）；daily: 永久病固定每日损失；cures: 可治疗物品 id（通用 + 各生态特效药）
G.DISEASES = {
  infection: {
    name: '伤口感染', icon: '🩸', desc: '伤口感染化脓，10 天内逐日恶化，需及时处理', days: 10,
    stages: [
      { min: 7, daily: { life: 2 }, label: '初染' },
      { min: 3, daily: { life: 3 }, label: '恶化' },
      { min: 0, daily: { life: 5 }, label: '危重' },
    ],
    cures: ['bandage', 'salve', 'antidote', 'plains_med', 'forest_balm', 'bone_dressing'],
  },
  poisoning: {
    name: '体内中毒', icon: '☠️', desc: '剧毒入髓，永不消退，仅净化药剂可解', forever: true, days: 999, daily: { life: 4 },
    cures: ['antidote', 'detox', 'herb_poultice', 'lake_antidote', 'relic_salve', 'cave_powder', 'vein_purify', 'magnet_pill'],
  },
  frostbite: {
    name: '冻伤', icon: '🧊', desc: '冻伤侵蚀四肢，10 天内逐日加重，需热敷处理', days: 10,
    stages: [
      { min: 7, daily: { life: 1 }, label: '轻冻' },
      { min: 3, daily: { life: 2, stamina: 1 }, label: '深冻' },
      { min: 0, daily: { life: 4, stamina: 1 }, label: '坏疽' },
    ],
    cures: ['geo_heat', 'alpine_balm', 'tundra_warm', 'lava_warm'],
  },
  heatstroke: {
    name: '中暑', icon: '☀️', desc: '中暑脱水，10 天内逐日加重，需补水降温', days: 10,
    stages: [
      { min: 7, daily: { thirst: 1 }, label: '晕眩' },
      { min: 3, daily: { thirst: 2, stamina: 1 }, label: '虚脱' },
      { min: 0, daily: { thirst: 4, stamina: 2 }, label: '热射' },
    ],
    cures: ['pure_water', 'tide_water', 'salt_drink', 'tide_cool', 'wind_balm', 'desert_dew'],
  },
  spore: {
    name: '孢子感染', icon: '🍄', desc: '迷障孢子扎根肺部，永不消退，仅除孢药剂可愈', forever: true, days: 999, daily: { life: 3, stamina: 1 },
    cures: ['antidote', 'detox', 'spore_cure', 'bog_cure', 'star_purify'],
  },
}

// ---- 敌人行动类型信息（图鉴展示 / 战斗意图共用） ----
G.INTENT_INFO = {
  attack: { name: '扑咬攻击' },
  heavy: { name: '蓄力重击' },
  feint: { name: '虚晃佯攻' },
  dot: { name: '元素侵袭' },
  heal: { name: '汲取再生' },
  shield: { name: '硬化防御' },
  multi: { name: '连续扑击' },
  buff: { name: '狂暴觉醒' },
}
G.Season = { STABLE: 0, SCORCHING: 1, TURMOIL: 2, COLD: 3 }
G.SlotType = { LIMB: 0, INTERNAL: 1 }
G.BuildingState = { NONE: 0, HAS_CORE: 1, HATCHED: 2 }
G.SEASON_NAMES = ['平稳期', '燥热期', '暴动期', '冷寂期']
G.RESOURCE_NAMES = ['食物', '水', '材料', '星之记忆']

// ---- 营地设施（基地建造）：消耗材料建造，可升级 1-3 级，每日自动生效 ----
// lv: 各级效果（Lv1/2/3）；chance: 各级产出概率；upgCost: 升级消耗（[Lv1→2, Lv2→3]）；rest: 休息加成（数组按级）
// special: 特殊建筑效果（tameChance 驯化概率+/brewery 酿酒/fort 防御）
G.FACILITIES = {
  warm_fire: { name: '暖火堆', icon: '🔥', desc: '驱散寒意的营火，每日恢复耐力。', cost: { wood: 2, stone: 1 }, lv: [{ stamina: 3 }, { stamina: 5 }, { stamina: 8 }], upgCost: [{ wood: 2, stone: 1 }, { wood: 3, stone: 2 }] },
  rain_collector: { name: '集雨器', icon: '🌧', desc: '收集雨露的容器，每日产出盐水。', cost: { metal: 2, fiber: 1 }, lv: [{ brine: 1 }, { brine: 2 }, { brine: 3 }], upgCost: [{ metal: 1, fiber: 1 }, { metal: 2, fiber: 1 }] },
  fungus_patch: { name: '菌菇圃', icon: '🍄', desc: '培育可食菌菇，每日产出菌丝块。', cost: { wood: 2, fungus: 2 }, lv: [{ fungus: 1 }, { fungus: 2 }, { fungus: 3 }], upgCost: [{ wood: 1, fungus: 2 }, { wood: 2, fungus: 3 }] },
  forge: { name: '熔铸台', icon: '⚒', desc: '熔炼金属残片，每日概率产出金属。', cost: { metal: 3, stone: 2 }, lv: [{ metal: 1 }, { metal: 2 }, { metal: 3 }], chance: [0.5, 0.7, 0.9], upgCost: [{ metal: 2, stone: 1 }, { metal: 3, stone: 2 }] },
  hunt_trap: { name: '捕猎陷阱', icon: '🪤', desc: '自动捕捉小型生物，每日概率产出菌丝块。', cost: { wood: 2, fiber: 2 }, lv: [{ fungus: 2 }, { fungus: 3 }, { fungus: 4 }], chance: [0.5, 0.7, 1], upgCost: [{ wood: 1, fiber: 2 }, { wood: 2, fiber: 2 }] },
  tent: { name: '休憩帐篷', icon: '⛺', desc: '舒适的宿营帐篷，休息恢复更多耐力。', cost: { fiber: 3, wood: 2 }, rest: [5, 8, 12], upgCost: [{ fiber: 2, wood: 1 }, { fiber: 3, wood: 2 }] },
  study_table: { name: '观测台', icon: '🔭', desc: '观测星辰解析记忆，每日概率产出星之记忆。', cost: { wood: 2, metal: 2 }, lv: [{ data: 1 }, { data: 2 }, { data: 3 }], chance: [0.3, 0.5, 0.7], upgCost: [{ wood: 1, metal: 2 }, { wood: 2, metal: 3 }] },
  // 特殊建筑（建造即可，不可升级）
  stable: { name: '兽栏', icon: '🐾', desc: '驯化生物更加亲近：驯化概率 +20%。', cost: { wood: 4, fiber: 3 }, special: { tameChance: 0.2 } },
  brewery: { name: '酿酒坊', icon: '🍶', desc: '每日将 1 菌丝块 + 1 盐水酿成菌酿（恢复耐力与精神）。', cost: { metal: 2, stone: 2, fungus: 2 }, special: { brewery: true } },
  fort: { name: '防御工事', icon: '🛡', desc: '野兽夜袭与严寒伤害减半。', cost: { metal: 4, stone: 3 }, special: { fort: true } },
}

// ---- 动态天气：每日随机，影响探索消耗 / 战斗 / 过夜 ----
// cost: 探索/移动额外耐力；scout: 勘探进度加成；brine: 过夜收集盐水；water: 过夜额外水耗；life: 过夜额外冻伤
// battle: 战斗效果（enemyAtkDown 敌人攻击- / enemyAtkUp 敌人攻击+ / noDodge 无法闪避 / staminaLoss 每回合-耐力）
G.WEATHERS = {
  clear: { name: '晴朗', icon: '☀️', desc: '风和日丽，一切如常。', cost: 0 },
  mist: { name: '灵雾', icon: '🌫', desc: '迷蒙灵雾笼罩，探索勘探进度提升。', cost: 0, scout: 2 },
  light_rain: { name: '细雨', icon: '🌦', desc: '细雨绵绵，过夜时自动收集到盐水。', cost: 0, brine: 1 },
  storm: { name: '暴雨', icon: '⛈', desc: '暴雨倾盆！行动耐力 +1，过夜水耗 +1，战斗时敌人攻击 -1（雨势迟缓）。', cost: 1, water: 1, battle: { enemyAtkDown: 1 } },
  sandstorm: { name: '沙暴', icon: '🌪', desc: '漫天沙暴！行动耐力 +1，过夜水耗 +1，战斗时你无法闪避攻击。', cost: 1, water: 1, battle: { noDodge: true } },
  coldwave: { name: '寒潮', icon: '❄️', desc: '寒潮来袭！行动耐力 +1，过夜生命 -3，战斗时敌人攻击 +1（你在严寒中迟钝）。', cost: 1, life: 3, battle: { enemyAtkUp: 1 } },
  heatwave: { name: '热浪', icon: '🌡', desc: '酷热难耐！过夜水耗 +1，战斗时每回合开始 -1 耐力。', cost: 0, water: 1, battle: { staminaLoss: 1 } },
}

// 季节天气池：season → [[天气id, 权重], ...]（rollWeather 轮盘随机，可叠加注册扩展）
G.WEATHER_POOL = {
  0: [['clear', 40], ['mist', 20], ['light_rain', 25], ['storm', 10], ['sandstorm', 5]],
  1: [['clear', 30], ['heatwave', 35], ['sandstorm', 25], ['storm', 10]],
  2: [['storm', 35], ['sandstorm', 25], ['heatwave', 15], ['clear', 15], ['mist', 10]],
  3: [['coldwave', 40], ['light_rain', 25], ['clear', 20], ['storm', 15]],
}

// ---- 驯化生物：击败对应生物有概率驯化幼崽，提供被动增益（每日产出 / 负重 / 战斗开战） ----
// source: 来源生物；chance: 驯化概率；daily: 每日产出；carry: 负重加成；explore: 探索耐力减免；battle: 开战效果
G.PETS = {
  spore_bunny: { name: '孢兔', icon: '🐇', desc: '温顺的孢兔，每天带来菌丝块。', source: '孢兔', chance: 0.25, daily: { fungus: 1 } },
  snow_goat: { name: '雪羊', icon: '🐐', desc: '耐寒的雪羊，帮你驮运物资（负重 +5）。', source: '高山雪羊', chance: 0.2, carry: 5 },
  tide_crab: { name: '潮汐蟹', icon: '🦀', desc: '铠甲蟹，开战时提供格挡 +4。', source: '潮汐蟹', chance: 0.2, battle: { shieldStart: 4 } },
  reef_fish: { name: '礁石鱼', icon: '🐟', desc: '灵巧的礁石鱼，开战时帮你抽 1 张牌。', source: '礁石鱼', chance: 0.2, battle: { drawStart: 1 } },
  wind_bat: { name: '风蝠', icon: '🦇', desc: '轻盈的风蝠，探索耐力消耗 -1。', source: '风刃蝠', chance: 0.15, explore: 1 },
  cinder_mouse: { name: '星尘鼠', icon: '🐭', desc: '聪慧的星尘鼠，每日星之记忆 +1。', source: '星尘鼠', chance: 0.15, daily: { data: 1 } },
}

// ---- 平衡常量 ----
G.C = {
  MAX_TIME_PER_DAY: 100,
  MAX_STAMINA: 10,
  MAX_LIFE: 80,
  MAX_HUNGER: 120,
  MAX_THIRST: 120,
  SEASON_LENGTH_DAYS: 20,
  HUNGER_DRAIN: 22,
  THIRST_DRAIN: 22,
  HUNGER_DAMAGE: 10,
  THIRST_DAMAGE: 15,
  // 生态使用系数：生态专属物品在本生态地图使用效果提高，异生态降低；通用物品恒为 1
  ECO_USE_COEF_SAME: 1.5,
  ECO_USE_COEF_OTHER: 0.7,
  // 季节饥饿/饥渴消耗系数：燥热更渴 / 严寒更饿 / 暴动双增 / 平稳基准
  SEASON_COST: {
    0: { hunger: 1, thirst: 1 }, // 平稳期
    1: { hunger: 1, thirst: 1.6 }, // 燥热期：更缺水
    2: { hunger: 1.3, thirst: 1.3 }, // 暴动期：双增
    3: { hunger: 1.6, thirst: 1 }, // 严寒期：更缺食物
  },
  EXPLORE_TIME: 10,
  MOVE_TIME: 30,
  MOVE_SPECIAL: 1,
  // 探索 / 交互的饥渴消耗
  EXPLORE_HUNGER: 4,
  EXPLORE_THIRST: 4,
  ACTION_HUNGER: 3,
  ACTION_THIRST: 3,
  ITEM_HARVEST_TIME: 15,
  ITEM_RESEARCH_TIME: 20,
  // 地区产出点（采集点）：最大可采次数；默认恢复 1 份所需天数
  ITEM_STOCK_MAX: 3,
  ITEM_RESTORE_DAILY: 2,
  // 休息
  REST_TIME: 40,
  REST_HUNGER: 2,
  REST_THIRST: 2,
  REST_RECOVER: 4,
  REST_MORALE: 6,
  // 精神状态
  MAX_MORALE: 100,
  MORALE_DRAIN_DAY: 6,
  MORALE_LOW: 25,
  MORALE_LOW_DAMAGE: 5,
  // 伤口流血
  BLEED_DAMAGE: 8,
  BLEED_CHANCE: 25,
  BANDAGE_HEAL: 10,
  // 资源使用 / 配方制作
  USE_TIME: 5,
  CRAFT_TIME: 10,
  // 负重
  BASE_CARRY: 20,
  CARRY_PER_STR: 3,
  COMBAT_TIME: 40,
  BATTLE_STAMINA: 2,
  RESEARCH_TIME: 15,
  RESEARCH_GAIN: 3,
  FEED_TIME: 12,
  TRANSPLANT_TIME: 50,
  UPGRADE_TIME: 35,
  ORGAN_HARVEST_TIME: 10, // 战斗胜利后采集器官所需时间
  // ---- 战斗常量：每回合 2 能量、能量上限 5、初始 3 能量、手牌 4/7、敌人生命=战力^1.4×6 ----
  BATTLE_MAX_ENERGY: 5,
  BATTLE_START_ENERGY: 3,
  BATTLE_MAX_HAND: 7,
  BATTLE_START_HAND: 4,
  BATTLE_ENERGY_PER_TURN: 2,
  ENEMY_HP_MULT: 8,
  BUILDING_FEED_COST: 2,
  BUILDING_STAGE_THRESHOLDS: [10, 25, 45, 70],
  POP_RECOVER: { 0: 30, 1: 15, 2: 50, 3: 0 },
  // 勘探解锁周边道路（每 5 进度 1 次探索；4 阶段 × 5 次 = 20 次探索解锁全部）
  SCOUT_NEEDED: 100,
  SCOUT_PER_EXPLORE: 5,
  SCOUT_PER_HUNT: 3,
  SCOUT_PER_HARVEST: 1,
}

// ---- 战斗胜利三选一奖励卡池（对标杀戮尖塔：战后选 1 张强化卡加入牌库） ----
G.SEASONAL_CLIMATE = {
  frozen_wilds: { 3: { waterCost: 1, lifeDamage: 5, note: '冷寂期冰雪加剧，严寒彻骨' }, 1: { waterCost: 1, note: '融雪泥泞，水分流失' } },
  salt_plain: { 1: { waterCost: 2, note: '酷热令盐原蒸发加剧' } },
  geo_spring: { 3: { energyBonus: 5, note: '冷寂期热泉格外温暖' } },
  reed_marsh: { 1: { waterCost: 1, note: '沼泽在燥热期干涸萎缩' } },
  lake_deep: { 3: { waterCost: 1, note: '湖面结起薄冰' } },
}

// ---- 季节事件池 ----
G.SEASON_EVENT_POOL = {
  0: ['gentle_rain', 'pollen_drift', 'mushroom_boom'],
  1: ['heat_wave', 'fohn_gale', 'lava_seep'],
  2: ['beast_tide', 'night_raid', 'blood_moon'],
  3: ['aurora', 'blizzard', 'ice_fall'],
}
G.EVENT_NAMES = {
  gentle_rain: '【平稳期·气候事件】和风细雨，水洼积起盐水 +1。',
  pollen_drift: '【平稳期·气候事件】花粉随风飘散，星之记忆 +1。',
  mushroom_boom: '【平稳期·气候事件】菌菇疯长，你收获了菌丝块 +2。',
  heat_wave: '【燥热期·气候事件】热浪袭来，额外消耗 1 份盐水。',
  fohn_gale: '【燥热期·气候事件】焚风过境，额外消耗 2 份盐水！',
  lava_seep: '【燥热期·气候事件】熔岩渗涌冷却成矿，你拾起了一块燧石。',
  beast_tide: '【暴动期·气候事件】兽潮涌动！你收获了菌丝块 +2，多个生物群落暴涨。',
  night_raid: '【暴动期·气候事件】野兽夜袭营地！生命 -5。',
  blood_moon: '【暴动期·气候事件】血月当空，生物群落急剧繁衍。',
  aurora: '【冷寂期·气候事件】极光之夜，灵感涌现，星之记忆 +2。',
  blizzard: '【冷寂期·气候事件】暴风雪来袭，额外消耗 1 点水。',
  ice_fall: '【冷寂期·气候事件】冰川崩裂露出远古骸骨，你拾起了一根。',
}

// ---- 抉择事件：探索/休息/战斗后触发，多选项决策 ----
// result/win/lose 字段：资源(fungus/brine/metal/wood/stone/bone/fiber)、data 星忆、life/stamina/morale 增减、disease 疾病、lore 解锁随机线索
// check: 属性判定 { attr: str/agi/con/int, value, win, lose }；cost: 前置消耗；tame: 驯化一只随机未驯化宠物
G.SPECIAL_META = {
  aqua: { name: '深海', icon: '🌊', desc: '需研究「水下呼吸」' },
  flight: { name: '悬空', icon: '⛰', desc: '需研究「飞行」' },
  dig: { name: '地底', icon: '🕳', desc: '需研究「地底探索」' },
}
// ---- 基础战斗卡（人类本能） ----
G.BASE_BATTLE_CARDS = [
  { name: '拳击', desc: '挥拳猛击，造成 4 点伤害。', energyCost: 1, damage: 4, block: 0, heal: 0, energyGain: 0, draw: 0 },
  { name: '拳击', desc: '挥拳猛击，造成 4 点伤害。', energyCost: 1, damage: 4, block: 0, heal: 0, energyGain: 0, draw: 0 },
  { name: '拳击', desc: '挥拳猛击，造成 4 点伤害。', energyCost: 1, damage: 4, block: 0, heal: 0, energyGain: 0, draw: 0 },
  { name: '踢击', desc: '重踢要害，造成 6 点伤害。', energyCost: 2, damage: 6, block: 0, heal: 0, energyGain: 0, draw: 0 },
  { name: '踢击', desc: '重踢要害，造成 6 点伤害。', energyCost: 2, damage: 6, block: 0, heal: 0, energyGain: 0, draw: 0 },
  { name: '防御', desc: '双臂护住要害，获得 8 点格挡。', energyCost: 1, damage: 0, block: 8, heal: 0, energyGain: 0, draw: 0 },
  { name: '防御', desc: '双臂护住要害，获得 8 点格挡。', energyCost: 1, damage: 0, block: 8, heal: 0, energyGain: 0, draw: 0 },
  { name: '深呼吸', desc: '调整呼吸，凝聚战斗能量 +2。', energyCost: 0, damage: 0, block: 0, heal: 0, energyGain: 2, draw: 0 },
  { name: '深呼吸', desc: '调整呼吸，凝聚战斗能量 +2。', energyCost: 0, damage: 0, block: 0, heal: 0, energyGain: 2, draw: 0 },
  // 攻击卡扩充
  { name: '刺拳', desc: '快如闪电的试探攻击，造成 2 点伤害。', energyCost: 0, damage: 2, block: 0, heal: 0, energyGain: 0, draw: 0 },
  { name: '膝撞', desc: '近距离膝击，造成 5 点伤害。', energyCost: 1, damage: 5, block: 0, heal: 0, energyGain: 0, draw: 0 },
  { name: '上勾拳', desc: '全力上勾，造成 7 点伤害。', energyCost: 2, damage: 7, block: 0, heal: 0, energyGain: 0, draw: 0 },
  { name: '旋身斩', desc: '转身挥砍，造成 8 点伤害。', energyCost: 2, damage: 8, block: 0, heal: 0, energyGain: 0, draw: 0 },
  { name: '重踏', desc: '猛踩地面重击，造成 11 点伤害。', energyCost: 3, damage: 11, block: 0, heal: 0, energyGain: 0, draw: 0 },
  { name: '断骨击', desc: '蓄力重击，造成 13 点伤害。', energyCost: 3, damage: 13, block: 0, heal: 0, energyGain: 0, draw: 0 },
  { name: '组合拳', desc: '连续出拳，造成 4 点伤害并抽 1 张牌。', energyCost: 2, damage: 4, block: 0, heal: 0, energyGain: 0, draw: 1 },
  { name: '反击架势', desc: '攻守兼备，造成 6 点伤害并获得 4 点格挡。', energyCost: 2, damage: 6, block: 4, heal: 0, energyGain: 0, draw: 0 },
]

// ---- 难度分级 ----
G.difficultyName = function (power) {
  if (power <= 3) return '易'
  if (power <= 5) return '中'
  if (power <= 6) return '难'
  return '极难'
}
// 材料稀有度：按来源生物分级（普通/稀有/史诗/传说）
G.materialRarity = function (e) {
  if (e && e.super) return '传说'
  const p = e ? (e.effectivePower || e.power) : 0
  if (p <= 3) return '普通'
  if (p <= 5) return '稀有'
  return '史诗'
}

// ---- 难度星之记忆系数：大幅拉开不同战力生物的星之记忆区分度 ----
// 生命：战力越高生命指数增长（power^1.4），p2=16 / p4=42 / p6=74 / p8=110 / p9=130 / 超级 200-430
G.enemyMaxHp = function (e) {
  const p = e ? (e.effectivePower || e.power) : 0
  return Math.round(Math.pow(p, 1.4) * 6 * (e.hpMult || 1))
}
// 攻击系数：高阶生物攻击显著更高（p≤3=1 / p4-5=1.25 / p6-7=1.6 / p8-9=2 / 超级=2.4）
G.enemyAtkMult = function (e) {
  const p = e ? (e.effectivePower || e.power) : 0
  if (p <= 3) return 1
  if (p <= 5) return 1.25
  if (p <= 7) return 1.6
  if (p <= 9) return 2
  return 2.4
}
// 战斗胜利三选一：必定触发（100%）
G.rewardChance = function (e) {
  return 1
}
// 星之记忆掉落：按生物星级（难度战力）区分——★1=2 / ★2=3 / ★3=5 / ★4=8 / ★5=12
G.dataReward = function (e) {
  const p = e ? (e.effectivePower || e.power) : 0
  const star = G.organStarOf(p)
  return { 1: 2, 2: 3, 3: 5, 4: 8, 5: 12 }[star] || 2
}

// ---- 器官星级：按来源生物难度划分（1-5 星），决定器官强化次数上限 ----
G.organStarOf = function (power) {
  if (power >= 10) return 5
  if (power >= 8) return 4
  if (power >= 6) return 3
  if (power >= 4) return 2
  return 1
}
