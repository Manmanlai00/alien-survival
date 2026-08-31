/* 数据模块：research（由 data.js 拆分）
   每个研究项可定义两个可选字段，新增研究无需改动核心逻辑：
   - log: 完成日志（字符串，或 (rank, S) => 字符串；缺省用「名称」+desc）
   - effect: 专属效果（ctx => void，ctx = { S, player, id, rank }；缺省仅升等级 upg[id]++） */
var G = window.GAME.data || (window.GAME.data = {})
G.RESEARCH_DEFS = G.RESEARCH_DEFS || {}

G.RESEARCH_DEFS = Object.assign(G.RESEARCH_DEFS || {}, {
  // ===== 基础强化 =====
  cell: {
    name: '强化细胞', maxRank: 3, base: 12, step: 8, desc: '生命上限+10',
    effect(ctx) { ctx.player.lifeBonus += 10; ctx.player.life = Math.min(ctx.player.life + 10, ctx.S.getMaxLife()) },
    log(r, S) { return `强化细胞完成！生命上限 +10（现为 ${S.getMaxLife()}）。` },
  },
  circuit: {
    name: '能量回路', maxRank: 3, base: 10, step: 6, desc: '耐力上限+2',
    effect(ctx) { ctx.player.energyBonus += 2; ctx.player.stamina = Math.min(ctx.player.stamina + 2, ctx.S.getMaxEnergy()) },
    log(r, S) { return `能量回路完成！耐力上限 +2（现为 ${S.getMaxEnergy()}）。` },
  },
  metabolism: {
    name: '代谢优化', maxRank: 1, base: 15, step: 0, desc: '每日饥渴消耗-10',
    effect(ctx) { ctx.player.metabolismBonus = 10 },
    log: '代谢优化完成！每日饥饿/饥渴消耗 -10。',
  },
  resonance: {
    name: '器官共鸣', maxRank: 1, base: 18, step: 0, desc: '器官维持消耗-1',
    effect(ctx) { ctx.player.maintReduction = 1 },
    log: '器官共鸣完成！每个移植器官每日维持消耗 -1（最低 1）。',
  },
  muscle: {
    name: '肌肉强化', maxRank: 3, base: 20, step: 14, desc: '战斗伤害+1',
    effect(ctx) { ctx.player.traits.combatDamage = (ctx.player.traits.combatDamage || 0) + 1 },
    log(r, S) { return `肌肉强化完成！战斗伤害 +1（现 +${S.player.traits.combatDamage}）。` },
  },
  regenerate: {
    name: '细胞再生', maxRank: 1, base: 22, step: 0, desc: '免疫流血',
    effect(ctx) { ctx.player.traits.bleedReduction = 25 },
    log: '细胞再生完成！你的伤口将不再流血。',
  },
  // ===== 生存基础 =====
  sleep: { name: '深度休息', maxRank: 2, base: 14, step: 10, desc: '休息恢复+2耐力', log: (r) => `深度休息完成！每次休息恢复 +${r * 2} 耐力。` },
  forage: { name: '采集技巧', maxRank: 2, base: 16, step: 12, desc: '采集获得+1资源', log: (r) => `采集技巧完成！每次采集获得 +${r} 资源。` },
  lung: { name: '呼吸强化', maxRank: 2, base: 12, step: 8, desc: '探索饥饿/饥渴消耗-1', log: (r) => `呼吸强化完成！探索的饥饿/饥渴消耗 -${r}。` },
  absorb: { name: '采集效率', maxRank: 2, base: 14, step: 9, desc: '采集时间-5', log: (r) => `采集效率提升！采集时间 -${r * 5}。` },
  insight: { name: '洞察', maxRank: 2, base: 14, step: 10, desc: '研究获得星之记忆+1', log: (r) => `洞察提升！研究获得的星之记忆 +${r}。` },
  wander: { name: '远行', maxRank: 3, base: 12, step: 8, desc: '负重上限+5', log: (r) => `远行能力增强！负重上限 +${r * 5}。` },
  quick: { name: '迅捷', maxRank: 2, base: 15, step: 10, desc: '移动时间-5', log: (r) => `迅捷提升！移动时间 -${r * 5}。` },
  // ===== 工艺解锁 =====
  cook: { name: '烹饪工艺', maxRank: 1, base: 24, step: 0, desc: '解锁高级食物配方', log: '烹饪工艺掌握！高级食物配方已解锁。' },
  smelt: { name: '冶炼工艺', maxRank: 1, base: 26, step: 0, desc: '解锁金属与深部矿石配方', log: '冶炼工艺掌握！金属与深部矿石配方已解锁。' },
  weave: { name: '纺织工艺', maxRank: 1, base: 24, step: 0, desc: '解锁织物与护甲配方', log: '纺织工艺掌握！织物与护甲配方已解锁。' },
  aqua: { name: '水下呼吸', maxRank: 1, base: 30, step: 0, desc: '获得潜水能力，可探索深海区域', log: '你掌握了水下呼吸！可以探索深海区域了。' },
  flight: { name: '飞行', maxRank: 1, base: 40, step: 0, desc: '获得飞行能力，可探索高空区域', log: '你掌握了飞行！可以探索高空区域了。' },
  dig: { name: '地底探索', maxRank: 1, base: 30, step: 0, desc: '获得地底穿行能力，可探索地下区域', log: '你掌握了地底探索！可以探索地下区域了。' },
  // ===== 体质扩展 =====
  density: { name: '骨质强化', maxRank: 2, base: 14, step: 10, desc: '负重上限 +4', log: (r) => `骨质强化完成！负重上限 +4（现 +${r * 4}）。` },
  immune: { name: '免疫强化', maxRank: 2, base: 18, step: 12, desc: '状态病持续天数 -1', log: (r) => `免疫强化完成！状态病持续天数 -${r}。` },
  stomach: { name: '消化强化', maxRank: 2, base: 14, step: 9, desc: '食物恢复效果 +20%', log: (r) => `消化强化完成！食物恢复效果 +${r * 20}%。` },
  hydrate: { name: '储水体质', maxRank: 2, base: 14, step: 9, desc: '饮水恢复效果 +20%', log: (r) => `储水体质完成！饮水恢复效果 +${r * 20}%。` },
  vein: {
    name: '血脉循环', maxRank: 3, base: 12, step: 8, desc: '每日饥饿/饥渴消耗 -3',
    effect(ctx) { ctx.player.traits.metabolism = (ctx.player.traits.metabolism || 0) + 3 },
    log: (r) => `血脉循环完成！每日饥饿/饥渴消耗 -${r * 3}。`,
  },
  tough: { name: '硬化皮肤', maxRank: 2, base: 20, step: 14, desc: '战斗受击伤害 -1', log: (r) => `硬化皮肤完成！战斗受击伤害 -${r}。` },
  vital: { name: '生命之源', maxRank: 2, base: 16, step: 11, desc: '每日恢复生命 +1', log: (r) => `生命之源完成！每日恢复生命 +${r}。`, daily(ctx) { ctx.player.life = Math.min(ctx.player.life + ctx.rank, ctx.S.getMaxLife()) } },
  restful: { name: '休养', maxRank: 2, base: 12, step: 8, desc: '休息额外恢复生命 +3', log: (r) => `休养完成！休息额外恢复生命 +${r * 3}。` },
  // ===== 战斗扩展 =====
  focus: { name: '专注', maxRank: 2, base: 18, step: 12, desc: '每回合战斗能量+1', log: (r) => `专注强化！战斗每回合能量 +${r}。` },
  opening: { name: '先手', maxRank: 1, base: 20, step: 0, desc: '战斗初始能量+1', log: (r) => `先手战术！战斗初始能量 +${r}。` },
  resilient: { name: '韧性', maxRank: 3, base: 16, step: 11, desc: '每日恢复生命+2', log: (r) => `韧性增强！每日恢复生命 +${r * 2}。`, daily(ctx) { ctx.player.life = Math.min(ctx.player.life + ctx.rank * 2, ctx.S.getMaxLife()) } },
  crit: { name: '致命一击', maxRank: 2, base: 22, step: 15, desc: '暴击率 +12%', log: (r) => `致命一击完成！暴击率 +${r * 12}%。` },
  vamp: { name: '血渴', maxRank: 2, base: 24, step: 16, desc: '攻击伤害 20% 转为治疗', log: (r) => `血渴完成！攻击伤害 ${r * 20}% 转为治疗。` },
  thorns: { name: '荆棘皮肤', maxRank: 2, base: 22, step: 15, desc: '受击反伤 +2', log: (r) => `荆棘皮肤完成！受击反伤 +${r * 2}。` },
  guard: { name: '格挡强化', maxRank: 2, base: 18, step: 12, desc: '格挡值 +25%', log: (r) => `格挡强化完成！格挡值 +${r * 25}%。` },
  reflex: { name: '闪避反射', maxRank: 2, base: 20, step: 14, desc: '闪避率 +8%', log: (r) => `闪避反射完成！闪避率 +${r * 8}%。` },
  ferocity: { name: '狂暴', maxRank: 2, base: 22, step: 15, desc: '生命低于一半时伤害 +2', log: (r) => `狂暴完成！生命低于一半时伤害 +${r * 2}。` },
  prepare: { name: '战备', maxRank: 1, base: 24, step: 0, desc: '战斗开始获得 3 格挡', log: (r) => `战备完成！战斗开始获得 ${r * 3} 格挡。` },
  tactics: { name: '战术防御', maxRank: 2, base: 16, step: 11, desc: '每回合开始获得 2 格挡', log: (r) => `战术防御完成！每回合开始获得 ${r * 2} 格挡。` },
  // ===== 生存扩展 =====
  desert: { name: '沙漠适应', maxRank: 2, base: 16, step: 11, desc: '干旱过夜水耗 -1', log: (r) => `沙漠适应完成！干旱过夜水耗 -${r}。` },
  coldproof: { name: '极寒防护', maxRank: 2, base: 16, step: 11, desc: '严寒过夜伤害 -5', log: (r) => `极寒防护完成！严寒过夜伤害 -${r * 5}。` },
  thermal: { name: '地热适应', maxRank: 2, base: 14, step: 10, desc: '过夜耐力恢复 +1', log: (r) => `地热适应完成！过夜耐力恢复 +${r}。` },
  bunk: { name: '露营术', maxRank: 2, base: 12, step: 8, desc: '过夜恢复生命 +5', log: (r) => `露营术完成！过夜恢复生命 +${r * 5}。` },
  probe: { name: '地质勘探', maxRank: 2, base: 14, step: 10, desc: '勘探进度获取 +20%', log: (r) => `地质勘探完成！勘探进度获取 +${r * 20}%。` },
  herb: { name: '草药辨识', maxRank: 2, base: 14, step: 9, desc: '采集额外获得菌丝块 +1', log: (r) => `草药辨识完成！采集额外获得菌丝块 +${r}。` },
  scavenge: { name: '拾荒者', maxRank: 2, base: 14, step: 9, desc: '采集额外获得随机基础材料 +1', log: (r) => `拾荒者完成！采集额外获得随机基础材料 +${r}。` },
  hunter: { name: '猎手直觉', maxRank: 2, base: 16, step: 11, desc: '战斗胜利后星之记忆 +1', log: (r) => `猎手直觉完成！战斗胜利后星之记忆 +${r}。` },
  sprint: { name: '冲刺', maxRank: 2, base: 14, step: 10, desc: '移动耐力消耗 -1', log: (r) => `冲刺完成！移动耐力消耗 -${r}。` },
  meditate: { name: '冥想', maxRank: 2, base: 12, step: 8, desc: '休息额外恢复精神 +3', log: (r) => `冥想完成！休息额外恢复精神 +${r * 3}。` },
  // ===== 工艺扩展 =====
  alchemy: { name: '药剂学', maxRank: 1, base: 26, step: 0, desc: '解锁炼金药剂配方', log: '药剂学掌握！炼金药剂配方已解锁。' },
  leather: { name: '制皮工艺', maxRank: 1, base: 24, step: 0, desc: '解锁皮革制品配方', log: '制皮工艺掌握！皮革制品配方已解锁。' },
  bonecraft: { name: '骨雕工艺', maxRank: 1, base: 24, step: 0, desc: '解锁骨制装备配方', log: '骨雕工艺掌握！骨制装备配方已解锁。' },
  crystalwork: { name: '晶工', maxRank: 1, base: 26, step: 0, desc: '解锁晶体制品配方', log: '晶工掌握！晶体制品配方已解锁。' },
  glasswork: { name: '玻璃工艺', maxRank: 1, base: 24, step: 0, desc: '解锁净水容器配方', log: '玻璃工艺掌握！净水容器配方已解锁。' },
  mechanism: { name: '机关术', maxRank: 1, base: 28, step: 0, desc: '解锁工具制造配方', log: '机关术掌握！工具制造配方已解锁。' },
  masonry: { name: '石工', maxRank: 1, base: 22, step: 0, desc: '解锁石制建材配方', log: '石工掌握！石制建材配方已解锁。' },
  botany: { name: '植物学', maxRank: 1, base: 24, step: 0, desc: '解锁药草制品配方', log: '植物学掌握！药草制品配方已解锁。' },
  chemistry: { name: '化学', maxRank: 1, base: 26, step: 0, desc: '解锁合成净化配方', log: '化学掌握！合成净化配方已解锁。' },
  sculpt: { name: '雕刻工艺', maxRank: 1, base: 22, step: 0, desc: '解锁饰品配方', log: '雕刻工艺掌握！饰品配方已解锁。' },
  // ===== 能力扩展 =====
  symbiosis: { name: '深度共生', maxRank: 1, base: 32, step: 0, desc: '肢体移植槽位 +1', log: '深度共生完成！肢体移植槽位 +1。' },
  organmaster: {
    name: '器官大师', maxRank: 1, base: 28, step: 0, desc: '器官维持消耗再 -1',
    effect(ctx) { ctx.player.maintReduction += 1 },
    log: '器官大师完成！器官维持消耗再 -1。',
  },
  translate: { name: '生态翻译', maxRank: 2, base: 16, step: 11, desc: '每日额外获得星之记忆 +1', log: (r) => `生态翻译完成！每日额外获得星之记忆 +${r}。`, daily(ctx) { ctx.player.data += ctx.rank; ctx.S.pushLog(`生态翻译为你解析了地表低语，星之记忆 +${ctx.rank}。`) } },
  echo: { name: '回响感知', maxRank: 2, base: 14, step: 10, desc: '探索额外获得星之记忆 +1', log: (r) => `回响感知完成！探索额外获得星之记忆 +${r}。` },
})
