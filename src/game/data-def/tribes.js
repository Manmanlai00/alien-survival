/* 数据模块：tribes（由 data.js 拆分，结构原样保留；可用 G.def 注册器继续叠加扩展） */
var G = window.GAME.data || (window.GAME.data = {})
G.TRIBES = {
  might: { name: '力量流', icon: '💪', tier1: '开战力量+1', tier2: '开战力量+2' },
  swift: { name: '敏捷流', icon: '🌪', tier1: '开战敏捷+1', tier2: '开战敏捷+2' },
  venom: { name: '剧毒流', icon: '☠', tier1: '剧毒施加层数+1', tier2: '剧毒施加层数+2' },
  corrode: { name: '腐蚀流', icon: '🧪', tier1: '腐蚀蔓延每回合+2层', tier2: '蔓延更快且每层伤害+1' },
  blaze: { name: '灼烧流', icon: '🔥', tier1: '灼烧每层伤害+1', tier2: '伤害+1且持续+1回合' },
  volt: { name: '雷击流', icon: '⚡', tier1: '雷击上限+2层', tier2: '上限+2且每层伤害+1' },
  guard: { name: '铁壁流', icon: '🛡', tier1: '开战格挡+5', tier2: '开战格挡+10' },
  cycle: { name: '过牌流', icon: '🃏', tier1: '每回合抽牌+1', tier2: '每回合抽牌+2' },
  burst: { name: '爆发流', icon: '💥', tier1: '开战能量+1', tier2: '开战能量+2' },
  blood: { name: '嗜血流', icon: '🩸', tier1: '吸血量+2', tier2: '吸血量+4' },
  flurry: { name: '连击流', icon: '⚔', tier1: '每次连击伤害+1', tier2: '每次连击伤害+2' },
  sacrifice: { name: '献祭流', icon: '🕯', tier1: '付出代价后恢复1点生命', tier2: '付出代价后恢复3点生命' },
}
// 自动为奖励卡牌打流派标签（一张卡只归入一个流派，元素优先）
G.tribeText = function (id) {
  const t = G.TRIBES[id]
  return t ? `${t.icon}${t.name}：${t.tier1}；4张：${t.tier2}` : ''
}

// ---- 卡牌升级（+）：数值提升 / 降费，仅可升级一次 ----
G.upgradeCard = function (card) {
  if (!card || card.upgraded) return card
  const c = Object.assign({}, card, { upgraded: true })
  if (c.damage) c.damage += 3
  if (c.block) c.block += 2
  if (c.heal) c.heal += 2
  if (c.energyGain) c.energyGain = Math.min(c.energyGain + 1, 3)
  if (c.draw) c.draw += 1
  if (c.elementAmount) c.elementAmount += 1
  if (c.energyCost > 1) c.energyCost -= 1 // 降费
  if (c.name && c.name.indexOf('+') === -1) c.name = c.name + '+'
  return c
}

// ---- 身体槽位表（14 个，随存活天数解锁） ----
