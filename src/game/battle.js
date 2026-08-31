/* ============ 卡牌战斗系统（纯 JS） ============ */
;(function () {
window.GAME = window.GAME || {}
const B = (window.GAME.battle = {})
const D = window.GAME.data
const S = window.GAME.store
const SFX = window.GAME.sound
const C = D.C
const { reactive } = Vue

B.battle = reactive({
  active: false,
  enemy: null,
  enemyHp: 0,
  enemyMaxHp: 0,
  energy: 0,
  shield: 0,
  deck: [],
  discard: [],
  hand: [],
  turn: 1,
  animTick: 0,
  floaters: [],
  battleLog: [],
  showEnemyInfo: false,
  showInfoModal: false, // 情报弹窗
  startSnapshot: null, // 开战时的玩家属性快照（结算对比用）
  summary: reactive({ show: false, victory: false, title: '', attrChanges: [], gains: [] }), // 战斗结算
  peek: null,
  enemyIntent: null,
  enemyAbilities: [],
  enemyStep: 0, // 敌人行动脚本步进（循环执行）
  enemyShield: 0, // 敌人硬化护盾：抵减你的下一次攻击
  enemyAtkBuff: 0, // 敌人狂暴叠加的攻击加成
  enemyFeint: false, // 佯攻蓄力：下一次攻击必定命中、不可格挡、攻击 +50%
  playerStatus: { fire: [], poison: 0, ice: 0, wind: 0, lightning: 0, water: 0, corrode: 0 }, // 玩家元素状态（敌人 dot 施加，不可闪避）
  enemyStatus: { fire: [], poison: 0, ice: 0, wind: 0, lightning: 0, water: 0, corrode: 0 }, // 元素状态（各自独立衰减/结算）
  playerInvuln: false, // 本回合免疫伤害
  playerDouble: 0, // 下回合攻击 ×2 剩余次数
  playerExtraTurn: false, // 风袭触发：获得额外行动回合（敌人跳过行动）
  playerEcho: 0, // 回响：本回合剩余「下一张牌效果 ×2」次数
  playerThorns: 0, // 荆棘：受击反伤（整场战斗持续）
  playerPowers: { str: 0, dex: 0, block: 0, draw: 0 }, // 能力牌：每回合开始被动（力量/敏捷/格挡/抽牌）
  tribes: {}, // 流派羁绊：激活的流派 → 档位（1/2）
  tribeBonuses: {}, // 流派增益数值（供结算处读取）
  elite: false, // 精英词缀：高难生物随机附加额外能力
  rageMode: false, // Boss 二阶段：超级生物半血狂暴变身
  rageName: '', // 狂暴形态显示名
  noDodgeWeather: false, // 沙暴：本场战斗无法闪避
  weatherStaminaLoss: 0, // 热浪：每回合开始 -1 耐力
  rewardChoices: [], // 战斗胜利三选一候选卡
  rewardPicked: false, // 本次胜利是否已选择（未选前不能关结算）
  rewardShow: false, // 三选一独立弹窗：战斗结束后先选卡，选完再进结算
  organShow: false, // 器官采集独立弹窗：选卡之后、结算之前
  organConfirm: false, // 极难生物放弃器官的二次确认状态
  stats: { cardsPlayed: 0, damageDealt: 0, maxHit: 0 }, // 战斗统计（战报用）
  organAbilities: [], // 器官能力：{ card, cooldown, maxCooldown }，不走牌库，使用后冷却固定回合恢复
  fx: [], // 战斗特效列表（命中/暴击/治疗/格挡/元素等一次性视觉特效）
  fxSeq: 0, // 特效自增序号
})

// ---- 战斗表现辅助 ----
let floaterId = 0
B.addFloater = function (text, kind) {
  const id = ++floaterId
  const top = 10 + Math.random() * 70
  B.battle.floaters.push({ id, text, kind, top })
  setTimeout(() => {
    const i = B.battle.floaters.findIndex((f) => f.id === id)
    if (i !== -1) B.battle.floaters.splice(i, 1)
  }, 1300)
}
function battleLog(msg) {
  B.battle.battleLog.push(msg)
  if (B.battle.battleLog.length > 6) B.battle.battleLog.shift()
}
B.openInfo = function () {
  B.battle.showInfoModal = true
  if (SFX) SFX.open()
}
B.closeInfo = function () {
  B.battle.showInfoModal = false
  if (SFX) SFX.close()
}
B.closeSummary = function () {
  B.battle.summary.show = false
}
B.togglePeek = function (which) {
  B.battle.peek = B.battle.peek === which ? null : which
}
B.peekSummary = function (list) {
  const map = {}
  for (const c of list) map[c.name] = (map[c.name] || 0) + 1
  return Object.keys(map).map((k) => `${k}×${map[k]}`).join('、') || '空'
}

// 器官 → 战斗机能卡（支持伤害/治疗/能量/持续伤害/免疫/蓄力翻倍）
B.organToBattleCard = function (organ) {
  const s = organ.skillCard
  if (!s) return null
  // 由技能字段任意组合成战斗卡（遗物式：攻击/防御/恢复/增益/光环技能一体）
  const c = {
    name: s.name,
    desc: s.desc,
    energyCost: Math.max(s.specialCost || 1, 1),
    damage: (s.combatPower || 0) * 2 || s.combat || 0,
    block: s.block || (s.type === D.CardType.INVULN ? (s.gatherAmount || 0) * 2 : 0),
    heal: s.heal || (s.type === D.CardType.SPECIAL ? (s.gatherAmount || 0) * 3 : 0),
    energyGain: s.type === D.CardType.RESEARCH ? 1 : 0,
    draw: s.draw || (s.type === D.CardType.RESEARCH ? (s.researchValue || 0) : 0),
    element: s.element || null,
    elementAmount: s.elementAmount || 0,
    strength: s.strength || 0,
    dexterity: s.dexterity || 0,
    applyVuln: s.applyVuln || 0,
    applyWeak: s.applyWeak || 0,
    loseLife: s.loseLife || 0,
    hits: s.hits || 0,
    pierce: s.pierce || false,
    invulnerable: s.invulnerable || s.type === D.CardType.INVULN,
    doubleNext: s.doubleNext || s.type === D.CardType.DOUBLE,
    retaliate: s.retaliate || 0,
    stun: s.stun || false,
    poisonBurst: s.poisonBurst || false,
    burstMult: s.burstMult || 0,
    lifesteal: s.lifesteal || false,
    tempStrength: s.tempStrength || 0,
    fortify: s.fortify || false,
    echo: s.echo || 0,
    thorns: s.thorns || 0,
    perTurn: s.perTurn || null,
    enemyAtkDown: s.enemyAtkDown || 0,
    rampage: s.rampage || 0,
    synergyDamage: s.synergyDamage || 0,
    discardGainBlock: s.discardGainBlock || 0,
    discardGainDamage: s.discardGainDamage || 0,
  }
  return c
}

// 遗物式光环被动：移植器官的战斗光环（开战 start / 每回合 turn 触发）
function applyOrganAuras(when) {
  if (!S.inventory || !S.inventory.transplantedOrgans) return
  for (const o of S.inventory.transplantedOrgans) {
    const a = o.aura
    if (!a) continue
    if (when === 'start') {
      if (a.startEnergy) B.battle.energy = Math.min(B.battle.energy + a.startEnergy, C.BATTLE_MAX_ENERGY)
      if (a.shieldStart) B.battle.shield += a.shieldStart
      if (a.strengthStart) B.battle.playerStrength += a.strengthStart
      if (a.dexterityStart) B.battle.playerDexterity += a.dexterityStart
      if (a.startEnergy || a.shieldStart) battleLog(`「${o.name}」的光环激活，战斗开局获得增益！`)
    } else if (when === 'turn') {
      if (a.blockPerTurn) {
        B.battle.shield += a.blockPerTurn
        B.addFloater(`光环格挡 +${a.blockPerTurn}`, 'block')
        battleLog(`「${o.name}」的光环提供 ${a.blockPerTurn} 点格挡。`)
      }
      if (a.drawPerTurn) draw(a.drawPerTurn)
      if (a.healPerTurn && S.player.life < S.getMaxLife()) {
        S.player.life = Math.min(S.player.life + a.healPerTurn, S.getMaxLife())
        B.addFloater(`+${a.healPerTurn} 回春`, 'heal')
        battleLog(`「${o.name}」的光环治愈了 ${a.healPerTurn} 点生命。`)
      }
    }
  }
}

// 战斗机能卡类型（COMBAT/DOT/INVULN/DOUBLE）；非战斗技能卡（研究/恢复）改为被动效果
function isCombatSkill(type) {
  return type === D.CardType.COMBAT || type === D.CardType.DOT || type === D.CardType.INVULN || type === D.CardType.DOUBLE
}

// ---- 动态天气的战斗效果（暴雨/沙暴/寒潮/热浪） ----
function applyWeatherBattle() {
  const wx = S.currentWeather ? S.currentWeather() : null
  if (!wx || !wx.battle) return
  // 天气战斗效果表（def.BATTLE_WEATHER_EFFECTS：新增天气战斗效果只需加表项）
  const EFFECTS = D.def && D.def.BATTLE_WEATHER_EFFECTS
  for (const k in wx.battle) {
    const fn = EFFECTS && EFFECTS[k]
    if (fn) fn(wx.battle[k], B.battle, battleLog)
  }
}

// ---- 驯化宠物：开战被动（格挡 / 抽牌） ----
function applyPetBattle() {
  let shield = 0
  let drawN = 0
  for (const id of S.pets || []) {
    const p = D.PETS[id]
    if (!p || !p.battle) continue
    if (p.battle.shieldStart) shield += p.battle.shieldStart
    if (p.battle.drawStart) drawN += p.battle.drawStart
  }
  if (shield) {
    B.battle.shield += shield
    battleLog(`宠物伙伴伸出援手：开战格挡 +${shield}。`)
  }
  if (drawN) {
    draw(drawN)
    battleLog(`宠物伙伴帮你先手抽牌：抽 ${drawN} 张。`)
  }
}

// ---- Boss 二阶段：超级生物半血狂暴变身 ----
function checkRage() {
  const e = B.battle.enemy
  if (!e || !e.super || B.battle.rageMode || !B.battle.active) return
  if (B.battle.enemyHp > Math.floor(B.battle.enemyMaxHp / 2)) return
  B.battle.rageMode = true
  B.battle.rageName = e.name + '·狂暴形态'
  B.battle.enemyAtkBuff += 3
  if (B.battle.enemyAbilities.indexOf('frenzy') === -1) B.battle.enemyAbilities.push('frenzy') // 每回合攻击+1
  B.battle.animTick++
  B.addFloater('狂暴变身！', 'dmg')
  battleLog(`「${e.name}」发出震天怒吼，血肉翻涌，进入狂暴形态！攻击大幅提升，且每回合持续增强！`)
  B.fx('enemy-crit')
  if (SFX) SFX.boss()
}

function buildDeck() {
  // 玩家自组牌库（战斗三选一积累）优先；未组建时用角色专属初始卡组
  const def = D.CHARACTER_DEFS[S.player.charId]
  const base = S.player.battleCards || (def && def.battleCards ? def.battleCards : D.BASE_BATTLE_CARDS)
  B.battle.deck = base.map((c) => Object.assign({}, c))
  // 移植器官的战斗机能卡不再进牌库：改为独立"器官能力"（见 startBattle 的 organAbilities）
}

// ---- 流派羁绊：按牌组同流派卡数量激活被动（2张=1阶 / 4张=2阶） ----
function applyTribes() {
  const counts = {}
  for (const c of B.battle.deck || []) if (c.tribe) counts[c.tribe] = (counts[c.tribe] || 0) + 1
  const act = {}
  for (const t in counts) {
    if (counts[t] >= 4) act[t] = 2
    else if (counts[t] >= 2) act[t] = 1
  }
  B.battle.tribes = act
  const bns = (B.battle.tribeBonuses = {})
  // 开战即生效的羁绊
  if (act.might) B.battle.playerStrength += act.might
  if (act.swift) B.battle.playerDexterity += act.swift
  if (act.guard) B.battle.shield += act.guard === 2 ? 10 : 5
  if (act.burst) B.battle.energy = Math.min(B.battle.energy + act.burst, C.BATTLE_MAX_ENERGY)
  if (act.cycle) { B.battle.playerPowers.draw += act.cycle; bns.cycle = act.cycle }
  // 结算类羁绊：存入 bonus 供各处读取
  bns.venom = act.venom || 0
  bns.blaze = act.blaze || 0
  bns.volt = act.volt || 0
  bns.corrode = act.corrode || 0
  bns.blood = act.blood || 0
  bns.flurry = act.flurry || 0
  bns.sacrifice = act.sacrifice || 0
  const names = Object.keys(act).map((t) => {
    const td = D.TRIBES[t]
    return td ? `${td.icon}${td.name}${act[t] === 2 ? '·II' : ''}` : t
  })
  if (names.length) battleLog(`流派羁绊激活：${names.join('、')}！`)
}

function shuffleDeck() {
  // Fisher-Yates 真随机洗牌（从弃牌堆拿牌随机抽取的保证）
  const a = B.battle.deck
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
}

function draw(count) {
  for (let i = 0; i < count; i++) {
    if (B.battle.deck.length === 0) {
      if (B.battle.discard.length === 0) break
      B.battle.deck = B.battle.discard.splice(0, B.battle.discard.length)
      shuffleDeck()
    }
    if (B.battle.hand.length >= C.BATTLE_MAX_HAND) {
      const c = B.battle.deck.shift()
      if (c) B.battle.discard.push(c)
      continue
    }
    const c = B.battle.deck.shift()
    if (c) B.battle.hand.push(c)
  }
}

// 下一回合抽牌：先拿弃牌堆（随机抽取），弃牌堆不足则洗牌库为新的弃牌堆继续抽
function drawNextTurnHand() {
  const target = Math.min(C.BATTLE_START_HAND, C.BATTLE_MAX_HAND)
  // 1. 先拿弃牌堆：随机抽取
  while (B.battle.hand.length < target && B.battle.discard.length) {
    const idx = Math.floor(Math.random() * B.battle.discard.length)
    B.battle.hand.push(B.battle.discard.splice(idx, 1)[0])
  }
  // 2. 弃牌堆不足：从牌库抽取（已洗牌，等同从新的弃牌堆拿牌）
  while (B.battle.hand.length < target && B.battle.deck.length) {
    B.battle.hand.push(B.battle.deck.shift())
  }
  // 3. 牌库也不足：把弃牌堆洗入牌库继续抽（牌组循环兜底）
  while (B.battle.hand.length < target && B.battle.discard.length) {
    B.battle.deck = B.battle.discard.splice(0, B.battle.discard.length)
    shuffleDeck()
    while (B.battle.hand.length < target && B.battle.deck.length) {
      B.battle.hand.push(B.battle.deck.shift())
    }
  }
}

// ---- 元素状态施加：每个属性叠加规则不同 ----
function applyElement(type, amount) {
  const st = B.battle.enemyStatus
  const info = D.ELEMENT_INFO[type] || { name: type, icon: '✦' }
  const bns = B.battle.tribeBonuses || {}
  if (type === 'fire') {
    // 灼烧：每次应用产生独立火层，各自持续 3 回合（灼烧流 2 阶 +1 回合）
    const turns = 3 + (bns.blaze >= 2 ? 1 : 0)
    for (let i = 0; i < amount; i++) st.fire.push({ turns })
  } else if (type === 'poison') {
    // 剧毒流：施加层数 +1/+2
    st.poison += amount + (bns.venom || 0)
  } else if (type === 'ice') {
    st.ice += amount
  } else if (type === 'wind') {
    st.wind += amount
  } else if (type === 'lightning') {
    // 雷击：上限 8 层（雷击流 2 阶 +2 上限）
    st.lightning = Math.min(st.lightning + amount, 8 + (bns.volt >= 2 ? 2 : 0))
  } else if (type === 'water') {
    st.water += amount
  } else if (type === 'corrode') {
    // 腐蚀：蔓延型 dot，每回合造成与层数等量的伤害，回合结束时层数 +1（上限 8）
    st.corrode = Math.min((st.corrode || 0) + amount, 8)
  }
  B.addFloater(`${info.icon}${info.name} +${amount}`, 'dmg')
  battleLog(`你施加了${info.name}（${amount} 层）。`)
}

// ---- 敌人元素 dot 攻击：施加到玩家身上，不可闪避、不可格挡 ----
function applyEnemyElement(type, amount) {
  const ps = B.battle.playerStatus
  const info = D.ELEMENT_INFO[type] || { name: type, icon: '✦' }
  if (type === 'fire') {
    for (let i = 0; i < amount; i++) ps.fire.push({ turns: 3 })
  } else if (type === 'poison') {
    ps.poison += amount
  } else if (type === 'lightning') {
    ps.lightning = Math.min(ps.lightning + amount, 8)
  } else if (type === 'water') {
    ps.water += amount
  } else if (type === 'corrode') {
    ps.corrode = Math.min((ps.corrode || 0) + amount, 8)
  }
  B.addFloater(`${info.icon} ${info.name} +${amount}`, 'dmg')
  battleLog(`「${B.battle.enemy.name}」向你施加了${info.name}（${amount} 层，不可闪避）！`)
  if (SFX) SFX.status()
}

// ---- 敌人能力（怪物差异化） ----
function hasAbi(abi) {
  return B.battle.enemyAbilities.indexOf(abi) !== -1
}
function setupAbilities() {
  const e = B.battle.enemy
  let list = e && e.ability ? (Array.isArray(e.ability) ? e.ability.slice() : [e.ability]) : []
  // 精英词缀：高难生物随机附加额外能力（难 40% / 极难 55% / 超级 80%）
  const power = e ? (e.effectivePower || e.power || 0) : 0
  const ELITE_POOL = ['heavy', 'frenzy', 'armor', 'regen', 'lifesteal', 'poison', 'enrage', 'thorns', 'lockdown', 'multi']
  let eliteCount = 0
  if (e && e.super) eliteCount = Math.random() < 0.8 ? 1 : 0
  else if (power >= 8) eliteCount = Math.random() < 0.55 ? (Math.random() < 0.25 ? 2 : 1) : 0
  else if (power >= 6) eliteCount = Math.random() < 0.4 ? 1 : 0
  for (let i = 0; i < eliteCount; i++) {
    const pool = ELITE_POOL.filter((a) => list.indexOf(a) === -1)
    if (!pool.length) break
    list.push(pool[Math.floor(Math.random() * pool.length)])
    B.battle.elite = true
  }
  B.battle.enemyAbilities = list
  // 重击词缀：开场攻击提升
  if (list.indexOf('heavy') !== -1) B.battle.enemyAtkBuff += 2
  if (list.length) {
    const names = list.map((a) => (D.ABILITY_INFO[a] ? D.ABILITY_INFO[a].name : a)).join('、')
    battleLog(`${B.battle.elite ? '⭐精英生物！' : '你观察到'}「${e.name}」的能力：${names}！`)
  }
}

// ---- 敌人意图（怪物专属行动脚本：按序循环执行） ----
function intentWithName(intent) {
  const i = Object.assign({}, intent)
  i.action = (D.INTENT_INFO && D.INTENT_INFO[intent.type] && D.INTENT_INFO[intent.type].name) || '攻击'
  if (intent.type === 'dot' && D.ELEMENT_INFO && D.ELEMENT_INFO[intent.element]) {
    i.action = `${D.ELEMENT_INFO[intent.element].name}侵袭`
  }
  return i
}
function getPattern() {
  const e = B.battle.enemy
  return (e && e.pattern && e.pattern.length) ? e.pattern : [{ type: 'attack', atk: e ? e.power : 1 }]
}
// 开战亮出第一个意图
function initIntent() {
  B.battle.enemyStep = 0
  B.battle.enemyIntent = intentWithName(getPattern()[0])
}
// 敌人行动后推进到下一个意图（循环）
function advanceIntent() {
  const pat = getPattern()
  B.battle.enemyStep = (B.battle.enemyStep + 1) % pat.length
  B.battle.enemyIntent = intentWithName(pat[B.battle.enemyStep])
}

// 战斗特效队列：每次攻击/受击/治疗等压入一条视觉特效，480ms 后自动移除（纯表现，不影响判定）
B.fx = function (type, arg) {
  if (!B.battle) return
  B.battle.fxSeq = (B.battle.fxSeq || 0) + 1
  const id = B.battle.fxSeq
  B.battle.fx.push({ id, type, arg })
  setTimeout(function () {
    if (!B.battle) return
    B.battle.fx = B.battle.fx.filter(function (f) { return f.id !== id })
  }, 480)
}

B.startBattle = function (enemy) {
  if (B.battle.active || !enemy) return false
  // 战斗状态工厂：统一重置全部战斗字段（字段模板见 G.def.battleState，后续业务赋值覆盖）
  Object.assign(B.battle, D.def.battleState())
  B.battle.enemy = enemy
  if (S.world) S.world.bestiaryEnemies[enemy.name] = true // 图鉴解锁该生物
  B.battle.enemyMaxHp = D.enemyMaxHp(enemy)
  B.battle.enemyHp = B.battle.enemyMaxHp
  B.battle.energy = C.BATTLE_START_ENERGY + (S.player.upg.opening || 0)
  // 战备：战斗开始获得初始格挡
  B.battle.shield = (S.player.upg.prepare || 0) * 3
  B.battle.hand = []
  B.battle.discard = []
  B.battle.turn = 1
  B.battle.animTick = 0
  B.battle.fxSeq = 0
  B.battle.fx = []
  B.battle.floaters = []
  B.battle.stats = { cardsPlayed: 0, damageDealt: 0, maxHit: 0 }
  // 器官能力：移植的战斗型器官提供独立技能（冷却固定回合后恢复，不走牌库）
  B.battle.organAbilities = []
  for (const organ of S.inventory.transplantedOrgans) {
    if (organ.skillCard && organ.battleFunction && isCombatSkill(organ.skillCard.type)) {
      B.battle.organAbilities.push({ card: B.organToBattleCard(organ), cooldown: 0, maxCooldown: 3 })
    }
  }
  B.battle.battleLog = [`遭遇了「${enemy.name}」！一场恶战开始了。`]
  B.battle.showEnemyInfo = false
  B.battle.showInfoModal = false
  B.battle.summary.show = false
  B.battle.startSnapshot = {
    life: S.player.life,
    stamina: S.player.stamina,
    hunger: S.player.hunger,
    thirst: S.player.thirst,
    morale: S.player.morale,
    timeLeft: S.player.timeLeft,
    data: S.player.data,
  }
  B.battle.peek = null
  B.battle.enemyIntent = null
  B.battle.enemyStep = 0
  B.battle.enemyShield = 0
  B.battle.enemyAtkBuff = 0
  B.battle.enemyFeint = false
  B.battle.playerStatus = { fire: [], poison: 0, ice: 0, wind: 0, lightning: 0, water: 0, corrode: 0 }
  B.battle.enemyStatus = { fire: [], poison: 0, ice: 0, wind: 0, lightning: 0, water: 0, vulnerable: 0, weak: 0, corrode: 0, atkDown: 0 }
  // 永久增益：力量（攻击+）/敏捷（格挡+），持续整场战斗
  B.battle.playerStrength = 0
  B.battle.playerDexterity = 0
  B.battle.playerInvuln = false
  B.battle.playerDouble = 0
  B.battle.playerExtraTurn = false
  B.battle.playerRetaliate = 0 // 反击：本回合受击反伤
  B.battle.enemyStun = 0 // 眩晕：敌人跳过行动回合数
  B.battle.playerTempStrength = 0 // 临时力量：仅本回合有效
  B.battle.playerFortify = false // 铁壁：本回合格挡受击不清零
  B.battle.playerEcho = 0 // 回响：下一张牌效果 ×2
  B.battle.playerThorns = 0 // 荆棘：受击反伤
  B.battle.playerPowers = { str: 0, dex: 0, block: 0, draw: 0 } // 能力牌：每回合被动
  B.battle.tribes = {} // 流派羁绊
  B.battle.tribeBonuses = {}
  B.battle.elite = false // 精英词缀
  B.battle.rageMode = false // Boss 二阶段
  B.battle.rageName = ''
  B.battle.noDodgeWeather = false // 沙暴天气
  B.battle.weatherStaminaLoss = 0 // 热浪天气
  buildDeck()
  applyTribes() // 流派羁绊：按牌组同流派卡数量激活被动
  shuffleDeck()
  draw(C.BATTLE_START_HAND)
  setupAbilities()
  initIntent()
  // 开战音效：超级生物用 boss 战音，其余用常规开战音
  if (SFX) (B.battle.enemy && B.battle.enemy.super ? SFX.boss() : SFX.battleStart())
  // 战斗专门 BGM（战斗结束后由地点音乐接管）
  if (SFX && SFX.music && SFX.music.battle) SFX.music.battle()
  // 遗物式光环：移植器官的开战增益
  applyOrganAuras('start')
  applyWeatherBattle() // 动态天气的战斗效果
  applyPetBattle() // 驯化宠物开战增益
  B.battle.active = true
  return true
}

// 卡牌/器官能力的共用效果执行（元素/免疫/蓄力/格挡/伤害/荆棘/治疗/能量）
function executeCardEffects(card, skipEcho) {
  // 弃牌流：弃置全部手牌（保留本牌），每张获得格挡/伤害
  if (card.discardGainBlock || card.discardGainDamage) {
    const others = B.battle.hand.filter((c) => c !== card)
    if (others.length) {
      B.battle.discard.push(...others)
      B.battle.hand = B.battle.hand.filter((c) => c === card)
      if (card.discardGainBlock) {
        const g = card.discardGainBlock * others.length
        B.battle.shield += g
        B.addFloater(`+${g} 弃盾`, 'block')
        battleLog(`弃置 ${others.length} 张手牌，获得 ${g} 点格挡。`)
      }
      if (card.discardGainDamage) {
        const g = card.discardGainDamage * others.length
        B.battle.enemyHp = Math.max(B.battle.enemyHp - g, 0)
        B.battle.stats.damageDealt += g
        B.addFloater(`-${g} 弃伤`, 'dmg')
        battleLog(`弃置 ${others.length} 张手牌，对敌造成 ${g} 点伤害。`)
        B.fx('enemy-hit')
      }
    } else {
      battleLog('你没有可弃置的手牌。')
    }
  }
  // 永久力量：本场战斗攻击伤害提升
  if (card.strength > 0) {
    B.battle.playerStrength += card.strength
    B.addFloater(`力量 +${card.strength}`, 'dmg')
    battleLog(`你获得 ${card.strength} 点力量（本场战斗攻击伤害 +${B.battle.playerStrength}）。`)
  }
  // 永久敏捷：本场战斗格挡提升
  if (card.dexterity > 0) {
    B.battle.playerDexterity += card.dexterity
    B.addFloater(`敏捷 +${card.dexterity}`, 'block')
    battleLog(`你获得 ${card.dexterity} 点敏捷（本场战斗格挡 +${B.battle.playerDexterity}）。`)
  }
  // 能力牌：每回合开始被动（力量/敏捷/格挡/抽牌）
  if (card.perTurn) {
    const pw = B.battle.playerPowers
    const pp = []
    if (card.perTurn.str) { pw.str += card.perTurn.str; pp.push(`每回合力量+${pw.str}`) }
    if (card.perTurn.dex) { pw.dex += card.perTurn.dex; pp.push(`每回合敏捷+${pw.dex}`) }
    if (card.perTurn.block) { pw.block += card.perTurn.block; pp.push(`每回合格挡+${pw.block}`) }
    if (card.perTurn.draw) { pw.draw += card.perTurn.draw; pp.push(`每回合抽牌+${pw.draw}`) }
    if (pp.length) {
      B.addFloater('能力觉醒', 'energy')
      battleLog(`能力牌生效：${pp.join('、')}。`)
    }
  }
  // 敌人缴械：攻击永久降低
  if (card.enemyAtkDown > 0) {
    B.battle.enemyStatus.atkDown = (B.battle.enemyStatus.atkDown || 0) + card.enemyAtkDown
    B.addFloater(`缴械 ${B.battle.enemyStatus.atkDown}`, 'block')
    battleLog(`敌人被缴械，攻击永久降低 ${card.enemyAtkDown} 点（当前 -${B.battle.enemyStatus.atkDown}）。`)
  }
  // 荆棘：受击反伤（整场战斗持续）
  if (card.thorns > 0) {
    B.battle.playerThorns += card.thorns
    B.addFloater(`荆棘 +${card.thorns}`, 'block')
    battleLog(`你长出荆棘，每次受击将反伤 ${card.thorns} 点（累计 ${B.battle.playerThorns}）。`)
  }
  // 回响：本回合下一张牌效果 ×2（回响卡本身不叠加自身）
  if (card.echo > 0 && !skipEcho) {
    B.battle.playerEcho += card.echo
    B.addFloater(`回响 ×${card.echo}`, 'energy')
    battleLog(`你获得回响：本回合下一张牌的效果将执行两次！`)
  }
  // 敌人易伤：受击伤害 +50%
  if (card.applyVuln > 0) {
    B.battle.enemyStatus.vulnerable = (B.battle.enemyStatus.vulnerable || 0) + card.applyVuln
    B.addFloater(`易伤 ${B.battle.enemyStatus.vulnerable}`, 'dmg')
    battleLog(`敌人陷入易伤，受到的所有伤害 +50%！`)
  }
  // 敌人虚弱：攻击伤害 -25%
  if (card.applyWeak > 0) {
    B.battle.enemyStatus.weak = (B.battle.enemyStatus.weak || 0) + card.applyWeak
    B.addFloater(`虚弱 ${B.battle.enemyStatus.weak}`, 'block')
    battleLog(`敌人被削弱，攻击伤害 -25%！`)
  }
  // 代价：失去生命换取强力效果
  if (card.loseLife > 0) {
    S.player.life = Math.max(S.player.life - card.loseLife, 0)
    B.addFloater(`-${card.loseLife} 代价`, 'dmg')
    battleLog(`你付出 ${card.loseLife} 点生命的代价！`)
    // 献祭流：付出代价后恢复少量生命（1 阶 +1 / 2 阶 +3）
    const sac = B.battle.tribeBonuses.sacrifice || 0
    if (sac > 0 && S.player.life > 0) {
      const sh = Math.min(sac, S.getMaxLife() - S.player.life)
      S.player.life += sh
      B.addFloater(`+${sh} 献祭`, 'heal')
      battleLog(`献祭流血脉涌动，恢复 ${sh} 点生命。`)
    }
    if (S.player.life <= 0) {
      S.player.dead = true
      S.clearSave()
      endBattle(false)
      return false
    }
  }
  // 元素状态：按属性叠加（各自不同的衰减/触发机制）
  if (card.element && card.elementAmount > 0) {
    applyElement(card.element, card.elementAmount)
  }
  // 免疫本回合伤害
  if (card.invulnerable) {
    B.battle.playerInvuln = true
    B.addFloater('免疫护体', 'block')
    battleLog('你获得护体：本回合免疫所有伤害。')
  }
  // 蓄力：下回合攻击 ×2
  if (card.doubleNext) {
    B.battle.playerDouble = 1
    B.addFloater('蓄力 ×2', 'energy')
    battleLog('你开始蓄力，下回合的攻击伤害将 ×2！')
  }
  // 反击：本回合受击反伤
  if (card.retaliate > 0) {
    B.battle.playerRetaliate += card.retaliate
    B.addFloater(`反击 ${B.battle.playerRetaliate}`, 'block')
    battleLog(`你架起反击架势，本回合受到攻击时将反伤 ${B.battle.playerRetaliate} 点。`)
  }
  // 眩晕：敌人跳过下一次行动
  if (card.stun) {
    B.battle.enemyStun += 1
    B.addFloater('眩晕', 'block')
    battleLog(`「${B.battle.enemy.name}」被眩晕，下次行动将被跳过！`)
  }
  // 剧毒引爆：立即结算当前毒层 ×倍（清除剧毒）
  if (card.poisonBurst) {
    const p = B.battle.enemyStatus.poison || 0
    if (p > 0) {
      const mult = card.burstMult || 2
      const bd = p * mult
      B.battle.enemyHp = Math.max(B.battle.enemyHp - bd, 0)
      B.battle.stats.damageDealt += bd
      if (bd > B.battle.stats.maxHit) B.battle.stats.maxHit = bd
      B.battle.enemyStatus.poison = 0
      B.addFloater(`-${bd} 引爆`, 'dmg')
      battleLog(`剧毒引爆！毒层 ${p} ×${mult} = ${bd} 点伤害，毒素消散。`)
      B.fx('enemy-crit')
      if (SFX) SFX.attack()
    } else {
      battleLog('敌人身上没有剧毒，引爆落空了。')
    }
  }
  // 铁壁：本回合格挡受击不清零
  if (card.fortify) {
    B.battle.playerFortify = true
    B.addFloater('铁壁', 'block')
    battleLog('你进入铁壁姿态，本回合格挡不会因受击而清零。')
  }
  // 临时力量：仅本回合有效
  if (card.tempStrength > 0) {
    B.battle.playerTempStrength += card.tempStrength
    B.addFloater(`临时力量 +${card.tempStrength}`, 'dmg')
    battleLog(`肾上腺素飙升，本回合攻击伤害 +${card.tempStrength}。`)
  }
  // 格挡强化 + 敏捷加成
  const blockGain = Math.round(card.block * (1 + (S.player.upg.guard || 0) * 0.25)) + (B.battle.playerDexterity || 0)
  B.battle.shield += blockGain
  if (card.block > 0) {
    B.addFloater(`格挡 +${blockGain}`, 'block')
    battleLog(`你架起防御，获得 ${blockGain} 点格挡。`)
    if (SFX) SFX.block()
  }
  // 多重打击伤害（hits 次，每次独立结算力量/易伤/暴击）
  if (card.damage > 0) {
    // 狂暴：本场战斗每次使用后伤害永久提升（记录在该卡实例上，随弃牌循环保留）
    if (card.rampage > 0) {
      card.damage += card.rampage
      battleLog(`「${card.name}」越用越猛，伤害提升至 ${card.damage}！`)
    }
    const hits = card.hits || 1
    for (let h = 0; h < hits; h++) {
      if (S.player.dead || !B.battle.active) break
      let dmg = card.damage + (S.player.traits.combatDamage || 0) + ((S.player.abilityBuff && S.player.abilityBuff.combat) || 0) + (S.player.tempCombatBonus || 0) + (B.battle.playerStrength || 0) + (B.battle.playerTempStrength || 0) + (B.battle.tribeBonuses.flurry || 0)
      // 同名增幅：牌组中每有一张同名卡，伤害 +增幅值（同名越多越强）
      if (card.synergyDamage > 0) {
        const same = countNameInBattle(card.name)
        dmg += card.synergyDamage * same
      }
      // 狂暴：生命低于一半时伤害提升
      if ((S.player.upg.ferocity || 0) > 0 && S.player.life <= S.getMaxLife() / 2) {
        dmg += (S.player.upg.ferocity || 0) * 2
      }
      // 水蚀压制：被水蚀附身时你的攻击伤害 -层数（不可驱散）
      dmg = Math.max(dmg - (B.battle.playerStatus.water || 0), 0)
      // 敌人硬化护盾：抵减本次攻击（破甲可无视）
      if (!card.pierce && B.battle.enemyShield > 0 && dmg > 0) {
        const abs = Math.min(B.battle.enemyShield, dmg)
        dmg -= abs
        B.battle.enemyShield -= abs
        B.addFloater(`-${abs} 敌盾`, 'block')
        battleLog(`敌人的硬化外壳抵挡了 ${abs} 点伤害！`)
      }
      // 蓄力翻倍：下一次攻击 ×2
      if (B.battle.playerDouble > 0) {
        dmg *= 2
        B.battle.playerDouble--
        battleLog('蓄力爆发！本击伤害 ×2！')
      }
      // 致命一击：暴击率提升，暴击伤害 ×1.5
      let critted = false
      if (dmg > 0 && (S.player.upg.crit || 0) > 0 && randint(1, 100) <= (S.player.upg.crit || 0) * 12) {
        dmg = Math.round(dmg * 1.5)
        critted = true
      }
      if (hasAbi('armor')) dmg = Math.max(dmg - 2, 0)
      // 敌人易伤：受到伤害 +50%
      if (dmg > 0 && (B.battle.enemyStatus.vulnerable || 0) > 0) {
        dmg = Math.round(dmg * 1.5)
      }
      B.battle.enemyHp = Math.max(B.battle.enemyHp - dmg, 0)
      B.battle.stats.damageDealt += dmg
      if (dmg > B.battle.stats.maxHit) B.battle.stats.maxHit = dmg
      B.addFloater(`-${dmg}`, 'dmg')
      B.battle.animTick++
      battleLog(`你发动「${card.name}」，造成 ${dmg} 点伤害${hits > 1 ? '（第' + (h + 1) + '击）' : ''}${critted ? '（致命一击！）' : ''}！`)
      if (SFX) SFX.attack()
      // 命中特效：暴击大爆裂 / 普通命中 / 元素附着
      if (dmg > 0) {
        if (critted) B.fx('enemy-crit')
        else B.fx('enemy-hit')
      }
      if (h === 0 && dmg > 0 && card.element) B.fx('enemy-element', card.element)
      // 卡牌吸血：恢复与造成伤害等量的生命（嗜血流 1/2 阶 +2/+4）
      if (card.lifesteal && dmg > 0 && S.player.life < S.getMaxLife()) {
        const lh = Math.min(dmg + (B.battle.tribeBonuses.blood || 0), S.getMaxLife() - S.player.life)
        S.player.life += lh
        B.addFloater(`+${lh} 吸血`, 'heal')
        battleLog(`「${card.name}」汲取敌人血肉，恢复 ${lh} 点生命。`)
        B.fx('player-heal')
        if (SFX) SFX.healPlayer()
      }
      // 血渴：攻击吸血
      if (dmg > 0 && (S.player.upg.vamp || 0) > 0) {
        const vh = Math.max(Math.round(dmg * (S.player.upg.vamp || 0) * 0.2), 0)
        if (vh > 0 && S.player.life < S.getMaxLife()) {
          S.player.life = Math.min(S.player.life + vh, S.getMaxLife())
          B.addFloater(`+${vh} 吸血`, 'heal')
          battleLog(`血渴汲取了敌人血肉，恢复 ${vh} 点生命。`)
          B.fx('player-heal')
          if (SFX) SFX.healPlayer()
        }
      }
      // 荆棘反伤
      if (dmg > 0 && hasAbi('thorns')) {
        S.player.life = Math.max(S.player.life - 2, 0)
        B.addFloater('-2 荆棘', 'dmg')
        battleLog('怪物身上的尖刺反震回来，你受到 2 点伤害！')
        if (S.player.life <= 0) {
          S.player.dead = true
          S.clearSave()
          endBattle(false)
          return false
        }
      }
    }
  }
  if (card.heal > 0) {
    S.player.life = Math.min(S.player.life + card.heal, S.getMaxLife())
    B.addFloater(`+${card.heal}`, 'heal')
    battleLog(`「${card.name}」为你恢复 ${card.heal} 点生命。`)
    B.fx('player-heal')
    if (SFX) SFX.healPlayer()
  }
  if (card.energyGain > 0) {
    B.battle.energy = Math.min(B.battle.energy + card.energyGain, C.BATTLE_MAX_ENERGY)
    B.addFloater(`能量 +${card.energyGain}`, 'energy')
    B.fx('energy')
  }
  return true
}

// 同名增幅：统计本场战斗牌堆/手牌/弃牌堆中同名卡数量（含本卡）
function countNameInBattle(name) {
  let c = 0
  const lists = [B.battle.deck, B.battle.hand, B.battle.discard]
  for (const l of lists) if (l) for (const x of l) if (x.name === name) c++
  return c
}

// 打出卡牌：回响（playerEcho>0）时效果执行两次，第二遍 skipEcho 只重复效果、不重复能量消耗/抽牌/弃牌；
// 使用后卡牌从手牌移除（消耗卡直接移出本场战斗，否则进入弃牌堆）；
// 最后依次判定 checkRage 狂暴（Boss 半血二阶段）与敌人死亡胜利结算
B.playCard = function (card) {
  if (!B.battle.active || B.battle.energy < card.energyCost) return
  B.battle.energy -= card.energyCost
  B.battle.stats.cardsPlayed++
  const echo = B.battle.playerEcho > 0
  if (echo) {
    B.battle.playerEcho--
    B.addFloater('回响！', 'energy')
    battleLog('回响触发：「' + card.name + '」的效果将执行两次！')
  }
  if (!executeCardEffects(card)) return
  // 回响第二遍：不重复消耗能量/抽牌/弃牌，只重复效果
  if (echo && B.battle.active && !S.player.dead) executeCardEffects(card, true)
  B.battle.hand = B.battle.hand.filter((c) => c !== card)
  if (card.exhaust) {
    // 消耗：打出后移出本场战斗
    B.addFloater('消耗', 'block')
    battleLog(`「${card.name}」被消耗，移出了本场战斗。`)
  } else {
    B.battle.discard.push(card)
  }
  if (card.draw > 0) draw(card.draw)
  checkRage() // Boss 二阶段检测（超级生物半血）
  if (B.battle.enemyHp <= 0 && B.battle.enemy) {
    S.pushLog(`「${B.battle.enemy.name}」轰然倒下！`)
    endBattle(true)
  }
}

// 器官能力：不走牌库，使用后冷却固定回合恢复
B.playOrganAbility = function (idx) {
  if (!B.battle.active) return
  const ab = B.battle.organAbilities[idx]
  if (!ab || ab.cooldown > 0) return
  if (!executeCardEffects(ab.card)) return
  ab.cooldown = ab.maxCooldown
  B.addFloater(`⏳ 冷却 ${ab.maxCooldown} 回合`, 'block')
  battleLog(`器官能力「${ab.card.name}」进入冷却（${ab.maxCooldown} 回合后恢复）。`)
  if (B.battle.enemyHp <= 0 && B.battle.enemy) {
    S.pushLog(`「${B.battle.enemy.name}」轰然倒下！`)
    endBattle(true)
  }
}

B.endTurn = function () {
  if (!B.battle.active || !B.battle.enemy) return
  const e = B.battle.enemy
  // 热浪天气：回合开始时损失耐力
  if (B.battle.weatherStaminaLoss > 0) {
    S.player.stamina = Math.max(S.player.stamina - B.battle.weatherStaminaLoss, 0)
    B.addFloater(`-${B.battle.weatherStaminaLoss} 酷暑`, 'dmg')
    battleLog(`酷暑消耗了你的体力，耐力 -${B.battle.weatherStaminaLoss}。`)
  }
  // ---- 回合开始结算：玩家元素状态（敌人 dot 不可闪避/格挡）----
  if (B.battle.playerStatus) {
    const ps = B.battle.playerStatus
    let pDmg = 0
    const pParts = []
    if (ps.fire.length) { pDmg += ps.fire.length; pParts.push(`灼烧 ${ps.fire.length}`) }
    if (ps.poison > 0) { pDmg += ps.poison; pParts.push(`剧毒 ${ps.poison}`) }
    if (ps.lightning > 0) { pDmg += ps.lightning; pParts.push(`雷击 ${ps.lightning}`) }
    if (ps.corrode > 0) { pDmg += ps.corrode; pParts.push(`腐蚀 ${ps.corrode}`) }
    if (pDmg > 0) {
      S.player.life = Math.max(S.player.life - pDmg, 0)
      B.addFloater(`-${pDmg} 元素`, 'dmg')
      battleLog(`元素侵蚀着你，你损失 ${pDmg} 点生命（${pParts.join('、')}，不可闪避）。`)
      if (SFX) SFX.hurt()
      if (S.player.life <= 0) {
        S.player.dead = true
        S.clearSave()
        endBattle(false)
        return
      }
    }
    if (ps.fire.length) {
      for (const f of ps.fire) f.turns--
      ps.fire = ps.fire.filter((f) => f.turns > 0)
    }
    if (ps.poison > 0) ps.poison = Math.max(ps.poison - 2, 0)
    if (ps.water > 0) ps.water = Math.max(ps.water - 1, 0)
    // 腐蚀蔓延：每回合结算后层数 +1（上限 8）
    if (ps.corrode > 0) ps.corrode = Math.min(ps.corrode + 1, 8)
  }
  if (hasAbi('regen') && B.battle.enemyHp > 0 && B.battle.enemyHp < B.battle.enemyMaxHp) {
    B.battle.enemyHp = Math.min(B.battle.enemyHp + 3, B.battle.enemyMaxHp)
    B.addFloater('+3 再生', 'heal')
    battleLog(`「${e.name}」的伤口快速愈合，恢复 3 点生命。`)
  }
  // ---- 元素持续状态结算：灼烧/剧毒/雷击伤害 + 冰封即死 + 风袭额外回合 ----
  if (B.battle.enemyHp > 0) {
    const st = B.battle.enemyStatus
    const tB = B.battle.tribeBonuses || {}
    let dmg = 0
    const parts = []
    // 流派增益：灼烧流每层伤害+1；雷击流2阶每层伤害+1；腐蚀流2阶每层伤害+1
    if (st.fire.length) { dmg += st.fire.length + (tB.blaze || 0); parts.push(`灼烧 ${st.fire.length}`) }
    if (st.poison > 0) { dmg += st.poison; parts.push(`剧毒 ${st.poison}`) }
    if (st.lightning > 0) { dmg += st.lightning + (tB.volt >= 2 ? 1 : 0); parts.push(`雷击 ${st.lightning}`) }
    if (st.corrode > 0) { dmg += st.corrode + (tB.corrode >= 2 ? st.corrode : 0); parts.push(`腐蚀 ${st.corrode}`) }
    if (dmg > 0) {
      B.battle.enemyHp = Math.max(B.battle.enemyHp - dmg, 0)
      B.addFloater(`-${dmg} 元素`, 'dmg')
      battleLog(`元素侵蚀，「${e.name}」损失 ${dmg} 点生命（${parts.join('、')}）。`)
    }
    // 灼烧层倒计时：各自 3 回合后消失
    if (st.fire.length) {
      for (const f of st.fire) f.turns--
      st.fire = st.fire.filter((f) => f.turns > 0)
    }
    // 剧毒衰减：每回合结算后层数 -2（前期爆发、逐渐消退）
    if (st.poison > 0) st.poison = Math.max(st.poison - 2, 0)
    // 水蚀衰减：每回合结算后层数 -1（压制效果更持久）
    if (st.water > 0) st.water = Math.max(st.water - 1, 0)
    // 腐蚀蔓延：每回合结算后层数 +1（腐蚀流 +1/+2 层/回合，上限 8）
    if (st.corrode > 0) {
      const before = st.corrode
      st.corrode = Math.min(st.corrode + 1 + (tB.corrode || 0), 8)
      if (st.corrode > before) battleLog(`腐蚀在「${e.name}」身上蔓延，层数升至 ${st.corrode}。`)
    }
    // 冰封即死：层数超过敌人当前生命时立即处决
    if (st.ice > 0 && B.battle.enemyHp > 0 && st.ice > B.battle.enemyHp) {
      battleLog(`冰封层数（${st.ice}）超过了「${e.name}」的生命（${B.battle.enemyHp}），将其彻底冻结！`)
      B.battle.enemyHp = 0
      B.addFloater('❄️ 冰封处决！', 'dmg')
      if (SFX) SFX.status()
    }
    // 风袭：达到 8 层自动清零，获得额外行动回合（单次施加层数少、需多回合积累）
    if (st.wind >= 8) {
      st.wind = 0
      B.battle.playerExtraTurn = true
      battleLog('风势叠加到极限！你抢占先机，获得一个额外行动回合。')
      if (SFX) SFX.extraTurn()
    }
    if (B.battle.enemyHp <= 0) {
      battleLog(`「${e.name}」倒下了！`)
      if (SFX) SFX.enemyDie()
      endBattle(true)
      return
    }
    checkRage() // 元素结算后检测 Boss 二阶段（半血狂暴）
  }
  // 兜底：若敌人已死（进入本回合时血量已为 0，正常路径之外），立即结束战斗
  if (B.battle.enemyHp <= 0) {
    battleLog(`「${e.name}」倒下了！`)
    if (SFX) SFX.enemyDie()
    endBattle(true)
    return
  }
  // ---- 敌人按已展示的"意图"行动（风袭额外回合 / 眩晕时跳过），行动后亮出下一个意图 ----
  if (B.battle.playerExtraTurn) {
    B.battle.playerExtraTurn = false
    B.addFloater('风势压制', 'block')
    battleLog(`风势未散，「${e.name}」僵在原地，本回合无法行动！`)
  } else if (B.battle.enemyStun > 0) {
    B.battle.enemyStun--
    B.addFloater('眩晕压制', 'block')
    battleLog(`「${e.name}」被眩晕僵在原地，本回合无法行动！`)
    if (SFX) SFX.block()
    advanceIntent()
  } else {
    const intent = B.battle.enemyIntent || { type: 'attack', atk: e.power }
    const action = intent.action
    // 难度攻击系数：高阶生物攻击显著更高（大幅拉开难度区分度）
    const atkMult = D.enemyAtkMult(e)
    let atk = Math.round((intent.atk || 0) * atkMult)
    // Boss 二阶段：狂暴形态攻击 +30%
    if (B.battle.rageMode) atk = Math.round(atk * 1.3)
    // 虚弱：敌人被削弱，攻击伤害 -25%
    if ((B.battle.enemyStatus.weak || 0) > 0) {
      atk = Math.round(atk * 0.75)
    }
    // 缴械：敌人攻击永久降低（不可驱散）
    if ((B.battle.enemyStatus.atkDown || 0) > 0) {
      atk = Math.max(atk - B.battle.enemyStatus.atkDown, 0)
    }
    const doAttack = intent.type === 'attack' || intent.type === 'heavy' || intent.type === 'multi'
    // 堡垒型：每回合补满临时护盾（至少 turnShield 点）
    if (e.turnShield) B.battle.enemyShield = Math.max(B.battle.enemyShield, e.turnShield)
    // 狂怒词缀：每回合攻击 +1（越战越猛）
    if (hasAbi('frenzy')) {
      B.battle.enemyAtkBuff = Math.min(B.battle.enemyAtkBuff + 1, 10)
      battleLog(`「${e.name}」的狂怒不断攀升，攻击 +1（当前 +${B.battle.enemyAtkBuff}）。`)
    }
    // 元素 dot 攻击：施加到玩家身上，不可闪避、不可格挡
    if (intent.type === 'dot') {
      applyEnemyElement(intent.element, intent.amount)
      B.fx('player-element', intent.element)
    } else if (intent.type === 'heal') {
      B.battle.enemyHp = Math.min(B.battle.enemyHp + intent.amount, B.battle.enemyMaxHp)
      B.addFloater(`+${intent.amount} 再生`, 'heal')
      battleLog(`「${e.name}」汲取养分，恢复 ${intent.amount} 点生命。`)
      B.fx('enemy-heal')
    } else if (intent.type === 'shield') {
      B.battle.enemyShield += intent.amount
      B.addFloater(`护盾 +${intent.amount}`, 'block')
      battleLog(`「${e.name}」硬化外壳，获得 ${intent.amount} 点护盾！`)
      B.fx('enemy-shield')
    } else if (intent.type === 'feint') {
      B.battle.animTick++
      B.battle.enemyFeint = true
      battleLog(`「${e.name}」${action}，虚晃一枪寻找破绽——下一击将必定命中、不可格挡！`)
      B.fx('enemy-buff')
    } else if (intent.type === 'buff') {
      B.battle.enemyAtkBuff = Math.min(B.battle.enemyAtkBuff + intent.amount, 5)
      B.addFloater(`攻击 +${intent.amount}`, 'dmg')
      battleLog(`「${e.name}」狂暴觉醒，攻击力 +${intent.amount}！（累计 +${B.battle.enemyAtkBuff}）`)
      if (SFX) SFX.powerup()
    }
    // 攻击类行动（含连击）：可闪避/格挡/护体
    if (doAttack) {
      // 佯攻蓄力：攻击 +50%，本击不可格挡、不可闪避，随后消耗
      const feint = B.battle.enemyFeint
      B.battle.enemyFeint = false
      if (feint) atk = Math.round(atk * 1.5)
      // 狂暴：生命低于一半时攻击 +2
      if (hasAbi('enrage') && B.battle.enemyHp <= B.battle.enemyMaxHp / 2) atk += 2
      // 狂暴觉醒叠加的攻击加成
      atk += B.battle.enemyAtkBuff
      // 水蚀压制：每层使敌人攻击伤害 -1
      atk = Math.max(atk - (B.battle.enemyStatus.water || 0), 0)
      // 锁定：攻击无法被闪避；佯攻蓄力同样无法闪避
      const noDodge = hasAbi('lockdown') || feint
      // 连击次数：脚本指定（迅捷型）或「连击」能力
      const hits = intent.hits || (hasAbi('multi') ? 2 : 1)
  for (let i = 0; i < hits; i++) {
    if (S.player.dead || !B.battle.active) break
    const hitAtk = intent.hits ? Math.max(1, atk) : (hits > 1 ? Math.max(1, Math.round(atk * 0.6)) : atk)
    const dmg = Math.max(hitAtk - (feint ? 0 : B.battle.shield), 0)
    if (!feint && !B.battle.playerFortify) B.battle.shield = 0
    B.battle.animTick++
    if (feint && hitAtk > 0) B.addFloater('破绽命中！', 'dmg')
    if (hitAtk > 0) battleLog(`「${e.name}」${action}${hits > 1 ? '（第' + (i + 1) + '击）' : ''}！`)
    let finalDmg = dmg
    let dodged = false
    // 护体免疫：本回合不受伤
    if (B.battle.playerInvuln && finalDmg > 0) {
      finalDmg = 0
      B.addFloater('护体抵挡', 'block')
      battleLog('护体免疫了这次伤害！')
      if (SFX) SFX.block()
    } else if (dmg > 0 && !noDodge && !B.battle.noDodgeWeather && (S.player.attrs.agi || 0) > 0 && randint(1, 100) <= (S.player.attrs.agi || 0) * 2 + (S.player.upg.reflex || 0) * 8) {
      finalDmg = 0
      dodged = true
    }
    // 硬化皮肤：减免受击伤害
    if (finalDmg > 0 && (S.player.upg.tough || 0) > 0) {
      finalDmg = Math.max(finalDmg - (S.player.upg.tough || 0), 0)
    }
    // 反击：本回合架势生效，敌人每次挥击都受到反伤
    if (B.battle.playerRetaliate > 0 && B.battle.enemyHp > 0 && hitAtk > 0 && !dodged) {
      const rt = B.battle.playerRetaliate
      B.battle.enemyHp = Math.max(B.battle.enemyHp - rt, 0)
      B.addFloater(`-${rt} 反击`, 'dmg')
      battleLog(`你的反击刺伤「${e.name}」，造成 ${rt} 点伤害！`)
      B.fx('enemy-hit')
      if (B.battle.enemyHp <= 0) {
        S.pushLog(`「${B.battle.enemy.name}」被反击击倒！`)
        endBattle(true)
        return
      }
    }
    if (finalDmg > 0) {
      S.player.life = Math.max(S.player.life - finalDmg, 0)
      B.addFloater(`-${finalDmg}`, 'dmg')
      battleLog(`你受到 ${finalDmg} 点伤害！`)
      S.pushLog(`「${e.name}」${action}，你受到 ${finalDmg} 点伤害！`)
      B.fx('player-hit')
      if (SFX) SFX.hurt()
      // 荆棘皮肤：受击反伤
      if ((S.player.upg.thorns || 0) > 0 && B.battle.enemyHp > 0) {
        const th = (S.player.upg.thorns || 0) * 2
        B.battle.enemyHp = Math.max(B.battle.enemyHp - th, 0)
        B.addFloater(`-${th} 反伤`, 'dmg')
        battleLog(`你的荆棘皮肤反伤敌人 ${th} 点伤害！`)
        B.fx('enemy-hit')
        if (B.battle.enemyHp <= 0 && B.battle.enemy) {
          S.pushLog(`「${B.battle.enemy.name}」被反伤击倒！`)
          endBattle(true)
          return
        }
      }
      // 卡牌荆棘：受击反伤（整场战斗持续）
      if (B.battle.playerThorns > 0 && B.battle.enemyHp > 0) {
        const th = B.battle.playerThorns
        B.battle.enemyHp = Math.max(B.battle.enemyHp - th, 0)
        B.addFloater(`-${th} 荆棘`, 'dmg')
        battleLog(`荆棘反震，对「${e.name}」造成 ${th} 点伤害！`)
        B.fx('enemy-hit')
        if (B.battle.enemyHp <= 0) {
          S.pushLog(`「${B.battle.enemy.name}」被荆棘反伤击倒！`)
          endBattle(true)
          return
        }
      }
      // 吸血：命中回复等量生命
      if (hasAbi('lifesteal') && B.battle.enemyHp > 0) {
        const heal = Math.min(finalDmg, B.battle.enemyMaxHp - B.battle.enemyHp)
        B.battle.enemyHp += heal
        B.addFloater(`+${heal} 吸血`, 'heal')
        battleLog(`「${e.name}」汲取了你的血肉，恢复 ${heal} 点生命。`)
      }
      // 剧毒：命中附加毒层
      if (hasAbi('poison')) {
        B.battle.playerStatus.poison += 2
        battleLog(`「${e.name}」的毒素渗入你的伤口！（毒层 ${B.battle.playerStatus.poison}）`)
      }
      if (!S.player.bleeding && randint(1, 100) <= (C.BLEED_CHANCE - (S.player.traits.bleedReduction || 0))) {
        S.player.bleeding = true
        battleLog('你受了伤，伤口正在流血！')
        S.pushLog('你受了伤，伤口正在流血！需要用止血绷带处理。')
      }
    } else if (dodged) {
      battleLog(`你凭借敏捷闪开了「${e.name}」的攻击！`)
      B.addFloater('闪避', 'block')
      B.fx('player-dodge')
      if (SFX) SFX.dodge()
    } else {
      battleLog(hitAtk === 0 ? `「${e.name}」的${action}落空了！` : `你格挡住了「${e.name}」的${action}！`)
      B.addFloater('格挡成功', 'block')
      if (hitAtk > 0) B.fx('player-block')
      if (SFX) SFX.block()
    }
    if (S.player.life <= 0) {
      S.player.dead = true
      S.clearSave()
      endBattle(false)
      return
    }
  }
    }
    // 亮出下一个意图（行动脚本循环）
    advanceIntent()
  }
  // ---- 回合刷新：清除本回合临时效果 → 回能量 → 光环/战术防御 → 冷却递减 → 弃牌抽牌 → 能力牌生效 ----
  // 本回合免疫效果结束
  B.battle.playerInvuln = false
  // 仅本回合生效的效果结束（反击/临时力量/铁壁/回响）
  B.battle.playerRetaliate = 0
  B.battle.playerTempStrength = 0
  B.battle.playerFortify = false
  B.battle.playerEcho = 0
  B.battle.energy = Math.min(B.battle.energy + C.BATTLE_ENERGY_PER_TURN + (S.player.upg.focus || 0), C.BATTLE_MAX_ENERGY)
  // 战术防御：每回合开始获得格挡
  if ((S.player.upg.tactics || 0) > 0) {
    B.battle.shield += (S.player.upg.tactics || 0) * 2
    B.addFloater(`格挡 +${(S.player.upg.tactics || 0) * 2}`, 'block')
  }
  // 遗物式光环：移植器官的每回合效果
  applyOrganAuras('turn')
  B.battle.turn++
  // 器官能力冷却递减
  for (const ab of B.battle.organAbilities || []) {
    if (ab.cooldown > 0) ab.cooldown--
  }
  // 回合结束：手牌丢弃到弃牌堆（「保留」卡留在手牌）；下一回合先拿弃牌堆（随机抽取），不足再从新的弃牌堆（洗牌库）拿
  B.battle.discard.push(...B.battle.hand.filter((c) => !c.retain))
  B.battle.hand = B.battle.hand.filter((c) => c.retain)
  drawNextTurnHand()
  // 能力牌：每回合开始被动（力量/敏捷/格挡/抽牌）——在新手牌后补抽
  const pw = B.battle.playerPowers
  if (pw && (pw.str || pw.dex || pw.block || pw.draw)) {
    const pp = []
    if (pw.str) { B.battle.playerStrength += pw.str; pp.push(`力量+${pw.str}`) }
    if (pw.dex) { B.battle.playerDexterity += pw.dex; pp.push(`敏捷+${pw.dex}`) }
    if (pw.block) { B.battle.shield += pw.block; pp.push(`格挡+${pw.block}`) }
    if (pw.draw) { draw(pw.draw); pp.push(`抽牌+${pw.draw}`) }
    battleLog(`能力牌生效：${pp.join('、')}。`)
  }
  battleLog(`回合结束，抽了 ${B.battle.hand.length} 张牌。`)
}

B.retreat = function () {
  if (!B.battle.active) return
  battleLog('你选择了撤退，生命 -5。')
  S.pushLog('你从战斗中撤退了，代价是 5 点生命。')
  if (SFX) SFX.defeat()
  S.player.life = Math.max(S.player.life - 5, 0)
  if (S.player.life <= 0) {
    S.player.dead = true
    S.clearSave()
  }
  endBattle(false)
}

// 根据开战快照与当前属性构建结算对比
function buildSummary() {
  const snap = B.battle.startSnapshot || {}
  const p = S.player
  const defs = [
    { label: '生命', key: 'life' },
    { label: '耐力', key: 'stamina' },
    { label: '时间', key: 'timeLeft' },
    { label: '饥饿', key: 'hunger' },
    { label: '饥渴', key: 'thirst' },
    { label: '精神', key: 'morale' },
    { label: '星之记忆', key: 'data' },
  ]
  B.battle.summary.attrChanges = defs.map((d) => {
    const before = snap[d.key]
    const after = p[d.key]
    return {
      label: d.label,
      before: before === undefined ? '—' : before,
      after: after === undefined ? '—' : after,
      diff: before === undefined || after === undefined ? null : after - before,
    }
  })
  // 战斗战报统计
  const st = B.battle.stats || { cardsPlayed: 0, damageDealt: 0, maxHit: 0 }
  B.battle.summary.stats = {
    turns: B.battle.turn,
    cardsPlayed: st.cardsPlayed,
    damageDealt: st.damageDealt,
    maxHit: st.maxHit,
  }
}

function endBattle(victory) {
  if (!B.battle.active) return
  B.battle.active = false
  B.battle.hand = []
  B.battle.deck = []
  B.battle.discard = []
  B.battle.enemyIntent = null
  B.battle.enemyAbilities = []
  B.battle.enemyStep = 0
  B.battle.enemyShield = 0
  B.battle.enemyAtkBuff = 0
  B.battle.enemyFeint = false
  B.battle.playerStatus = { fire: [], poison: 0, ice: 0, wind: 0, lightning: 0, water: 0, corrode: 0 }
  B.battle.enemyStatus = { fire: [], poison: 0, ice: 0, wind: 0, lightning: 0, water: 0, vulnerable: 0, weak: 0, corrode: 0, atkDown: 0 }
  // 永久增益：力量（攻击+）/敏捷（格挡+），持续整场战斗
  B.battle.playerStrength = 0
  B.battle.playerDexterity = 0
  B.battle.playerInvuln = false
  B.battle.playerDouble = 0
  B.battle.playerExtraTurn = false
  B.battle.playerRetaliate = 0 // 反击：本回合受击反伤
  B.battle.enemyStun = 0 // 眩晕：敌人跳过行动回合数
  B.battle.playerTempStrength = 0 // 临时力量：仅本回合有效
  B.battle.playerFortify = false // 铁壁：本回合格挡受击不清零
  B.battle.playerEcho = 0 // 回响：下一张牌效果 ×2
  B.battle.playerThorns = 0 // 荆棘：受击反伤
  B.battle.playerPowers = { str: 0, dex: 0, block: 0, draw: 0 } // 能力牌：每回合被动
  B.battle.tribes = {} // 流派羁绊
  B.battle.tribeBonuses = {}
  B.battle.elite = false // 精英词缀
  B.battle.rageMode = false // Boss 二阶段
  B.battle.rageName = ''
  B.battle.noDodgeWeather = false // 沙暴天气
  B.battle.weatherStaminaLoss = 0 // 热浪天气
  // 战斗胜利三选一与首次剧情线索：首次击败先弹线索，关闭后再进入 三选一 → 器官采集 → 结算
  let firstKill = false
  if (victory) {
    const enemy = B.battle.enemy
    firstKill = enemy && !S.world.defeatedEnemies[enemy.name]
    if (firstKill) {
      S.world.defeatedEnemies[enemy.name] = true
      // 初次击败：检索一段剧情线索（收录进图鉴）
      S.collectLore(enemy.name)
    }
    // 猎手直觉：战斗胜利后总结经验，获得星之记忆
    if ((S.player.upg.hunter || 0) > 0) {
      S.player.data += S.player.upg.hunter
      S.pushLog(`猎手直觉：从这场战斗中总结经验，星之记忆 +${S.player.upg.hunter}。`)
    }
  }
  // 首次击败且有剧情线索：先弹窗展示，关闭后再进入三选一/器官/结算流程
  const firstLore = victory && firstKill && B.battle.enemy && S.player.charId !== 'debugger' ? (D.LORE && D.LORE[B.battle.enemy.name]) : null
  if (firstLore && S.world.lore[B.battle.enemy.name]) {
    S.showStory('📡 脉动回声 ·「' + firstLore.t + '」', firstLore.s, finishBattle)
    S.pushLog(victory ? '战斗胜利！' : '战斗结束了。')
    // 战斗结束：恢复当前地点的生态背景音乐
    S.playLocationMusic()
    return
  }
  finishBattle()
  S.pushLog(victory ? '战斗胜利！' : '战斗结束了。')
  // 战斗结束：恢复当前地点的生态背景音乐
  S.playLocationMusic()

  function finishBattle() {
    // 三选一：首次击败该物种必定触发；此后按难度概率出现（易10% / 中20% / 难30% / 极难与超级100%）
    // 命中则先弹出独立选卡弹窗（rewardShow），选完/放弃后再进入结算
    let rewardOffered = false
    if (victory) {
      const enemy = B.battle.enemy
      if (firstKill || Math.random() < D.rewardChance(enemy)) {
        B.battle.rewardChoices = generateRewards()
        B.battle.rewardPicked = false
        B.battle.rewardShow = true
        rewardOffered = true
      } else {
        B.battle.rewardChoices = []
        B.battle.rewardPicked = true
        B.battle.rewardShow = false
      }
    } else {
      B.battle.rewardChoices = []
      B.battle.rewardPicked = true
      B.battle.rewardShow = false
    }
    B.battle.summary.victory = victory
    B.battle.summary.title = victory ? '战斗胜利' : S.player.dead ? '你倒下了' : '战斗失利'
    B.battle.summary.gains = []
    // 战利品器官：独立采集弹窗（流程：选卡 → 采集器官 → 结算）；已在背包/已移植的器官不再弹出采集
    const hasOrgan = victory && B.battle.enemy && B.battle.enemy.organ && !S.hasOrgan(B.battle.enemy.organ.id)
    B.battle.summary.organ = hasOrgan ? B.battle.enemy.organ : null
    B.battle.summary.organCollected = false
    B.battle.organShow = false
    B.battle.organConfirm = false
    S.player.abilityBuff = null
    S.onBattleEnded(victory)
    buildSummary()
    // 无三选一弹窗时：有器官先进采集弹窗，否则直接结算（有三选一则等选完再决定）
    if (!rewardOffered) {
      if (hasOrgan) B.battle.organShow = true
      else B.battle.summary.show = true
    }
  }
}

// 胜利奖励三选一：从奖励卡池随机抽 3 张不重复
// 敌人难度 → 掉落卡牌星级池：易★1-2 / 中★2-3 / 难★3-4 / 极难★4-5 / 超级必定★5
function rewardStarPool(e) {
  const p = e ? (e.effectivePower || e.power) : 0
  if (p >= 10) return [5]
  if (p >= 8) return [4, 5]
  if (p >= 6) return [3, 4]
  if (p >= 4) return [2, 3]
  return [1, 2]
}
function generateRewards() {
  const stars = rewardStarPool(B.battle.enemy)
  const pool = []
  for (const s of stars) {
    const arr = D.REWARD_CARDS && D.REWARD_CARDS[s]
    if (arr) pool.push.apply(pool, arr)
  }
  // 兜底：池意外为空时退回 1 星池
  if (!pool.length && D.REWARD_CARDS) pool.push.apply(pool, D.REWARD_CARDS[1] || [])
  const out = []
  while (out.length < 3 && pool.length) {
    const idx = randint(0, pool.length - 1)
    out.push(Object.assign({}, pool[idx]))
    pool.splice(idx, 1)
  }
  return out
}

// 选卡完成后推进流程：有器官先进采集弹窗，否则直接结算
B.advanceAfterReward = function () {
  B.battle.rewardShow = false
  if (B.battle.summary.organ) {
    B.battle.organShow = true
    B.battle.organConfirm = false
  } else {
    B.battle.summary.show = true
  }
}
// 选择一张奖励卡加入自组牌库
B.chooseReward = function (card) {
  if (!card || !B.battle.rewardChoices || B.battle.rewardPicked) return
  if (!S.player.battleCards) {
    // 首次：以角色初始卡组为底，构建自组牌库
    const def = D.CHARACTER_DEFS[S.player.charId]
    S.player.battleCards = (def && def.battleCards ? def.battleCards : D.BASE_BATTLE_CARDS).map((c) => Object.assign({}, c))
  }
  S.player.battleCards.push(Object.assign({}, card))
  B.battle.rewardChoices = []
  B.battle.rewardPicked = true
  B.battle.summary.gains.push(`强化卡「${card.name}」`)
  S.pushLog(`战斗强化：你学会了新牌「${card.name}」！`)
  if (SFX) SFX.craft()
  B.advanceAfterReward()
}
// 跳过三选一
B.skipReward = function () {
  if (!B.battle.rewardChoices || B.battle.rewardPicked) return
  B.battle.rewardChoices = []
  B.battle.rewardPicked = true
  B.advanceAfterReward()
}
// 器官已拥有/采集完成：进入结算（器官必须采集，无放弃按钮）
B.finishOrgan = function () {
  if (!B.battle.organShow) return
  B.battle.organConfirm = false
  B.battle.organShow = false
  B.battle.summary.show = true
}

function randint(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a
}
})()
