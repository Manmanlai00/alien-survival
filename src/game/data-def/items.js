/* 数据模块：items（由 data.js 拆分，结构原样保留；可用 G.def 注册器继续叠加扩展） */
var G = window.GAME.data || (window.GAME.data = {})
G.ITEMS = {
  // 基础采集物
  fungus: { name: '菌丝块', desc: '软糯的异星菌丝块。', weight: 1, material: true, use: { hunger: 25 } },
  fungus_juice: { name: '菌露汁', desc: '菌丝块榨出的清凉汁液，能解渴。', weight: 1, use: { thirst: 40 } },
  juice_mash: { name: '菌酿', desc: '酿酒坊酿出的浓烈饮品，恢复耐力与精神。', weight: 1, use: { stamina: 15, morale: 10 } },
  brine: { name: '盐水', desc: '苦涩的盐水。', weight: 1, material: true, use: { thirst: 25 } },
  metal: { name: '金属残片', desc: '破损的异星金属，用于配方合成。', weight: 1, material: true },
  fiber: { name: '异星纤维', desc: '柔韧的植物纤维，用于配方合成。', weight: 1, material: true },
  specimen: { name: '生物样本', desc: '新鲜取下的生物样本。', weight: 1, material: true, use: { data: 1 } },
  hide: { name: '兽皮', desc: '厚实的异星兽皮，用于配方合成。', weight: 2, material: true },
  wood: { name: '异星木材', desc: '坚硬而有弹性的木材，用于配方合成。', weight: 1, material: true },
  stone: { name: '燧石', desc: '锋利的燧石，用于配方合成。', weight: 1, material: true },
  bone: { name: '骸骨', desc: '坚硬完整的骸骨，用于配方合成。', weight: 2, material: true },
  clay: { name: '黏土', desc: '细腻可塑的黏土，用于配方合成。', weight: 1, material: true },
  resin: { name: '树脂', desc: '粘稠的异星树脂，用于配方合成。', weight: 1, material: true },
  gem: { name: '异星宝石', desc: '闪烁的异星宝石。', weight: 1, material: true, use: { data: 1 } },
  // 食物与水（加工品应比原料更有恢复效率）
  pure_water: { name: '净水', desc: '清澈可饮用的净水。', weight: 1, use: { thirst: 55 } },
  water_skin: { name: '水囊', desc: '装满净水的水囊。', weight: 2, use: { thirst: 80 } },
  mushmeal: { name: '菌粮团', desc: '压实的营养菌粮团。', weight: 1, use: { hunger: 60 } },
  bread: { name: '菌麦饼', desc: '烤得喷香的菌麦饼。', weight: 1, use: { hunger: 85 } },
  stew: { name: '猎人炖汤', desc: '热气腾腾的异星浓汤。', weight: 2, use: { hunger: 80, morale: 5 } },
  jerky: { name: '盐渍干粮', desc: '咸香耐储的干粮。', weight: 1, use: { hunger: 55, thirst: 20 } },
  honey: { name: '蜜菌蜜', desc: '甜腻的菌蜜，让人心情愉悦。', weight: 1, use: { hunger: 40, morale: 10 } },
  soup: { name: '浓肉汤', desc: '鲜美的浓肉汤。', weight: 2, use: { hunger: 50, thirst: 40 } },
  feast: { name: '盛宴', desc: '丰盛到不真实的宴席。', weight: 3, use: { hunger: 100, morale: 15 } },
  ration_box: { name: '军用口粮盒', desc: '密封包装的军用口粮。', weight: 2, use: { hunger: 100 } },
  stamina_bar: { name: '耐力棒', desc: '快速补充体力的棒状口粮。', weight: 1, use: { stamina: 4 } },
  // 医疗
  bandage: { name: '止血绷带', desc: '干净的止血绷带。', weight: 1, use: { bandage: 15 } },
  herb_poultice: { name: '草药敷剂', desc: '敷在伤口上的草药泥。', weight: 1, use: { heal: 15 } },
  salve: { name: '治疗药膏', desc: '温和的治疗药膏。', weight: 1, use: { heal: 12 } },
  elixir: { name: '生命药剂', desc: '散发微光的治疗药剂。', weight: 1, use: { heal: 25 } },
  great_elixir: { name: '大生命药剂', desc: '蕴含澎湃生机的药剂。', weight: 1, use: { heal: 40 } },
  tonic: { name: '补气药汤', desc: '提神补气的药汤。', weight: 1, use: { stamina: 3, heal: 5 } },
  antidote: { name: '净化剂', desc: '驱散身心不适的药剂。', weight: 1, use: { heal: 20, morale: 5 } },
  // 材料与工具
  ingot: { name: '精炼金属锭', desc: '提纯后的金属锭，用于配方合成。', weight: 1 },
  cloth: { name: '纤维布', desc: '织好的纤维布，用于配方合成。', weight: 1 },
  plank: { name: '木板', desc: '削好的木板，用于配方合成。', weight: 1 },
  brick: { name: '泥砖', desc: '烧制过的泥砖，用于配方合成。', weight: 1 },
  bone_knife: { name: '骨刀', desc: '锋利的骨制小刀，用于配方合成。', weight: 1 },
  tool_kit: { name: '工具包', desc: '一整套维修工具，用于配方合成。', weight: 2 },
  // 武器（今日战斗加成）
  stone_axe: { name: '石斧', desc: '沉重的石斧。', weight: 2, use: { combat: 1 } },
  wood_spear: { name: '木矛', desc: '削尖的木矛。', weight: 2, use: { combat: 1 } },
  flint_dagger: { name: '燧石匕首', desc: '锋利的燧石匕首。', weight: 1, use: { combat: 1 } },
  bone_spear: { name: '骨矛', desc: '以骸骨为矛尖的长矛。', weight: 2, use: { combat: 2 } },
  metal_sword: { name: '金属剑', desc: '寒光闪闪的金属剑。', weight: 2, use: { combat: 2 } },
  warpaint: { name: '战纹颜料', desc: '涂上后战意高涨。', weight: 1, use: { combat: 1 } },
  // 护甲（今日生命上限）
  leather_armor: { name: '皮甲', desc: '结实的皮革护甲。', weight: 3, use: { armor: 25 } },
  shell_armor: { name: '甲壳护甲', desc: '异星甲壳打造的护甲。', weight: 3, use: { armor: 30 } },
  bone_armor: { name: '骨甲', desc: '骸骨编织的重甲。', weight: 4, use: { armor: 40 } },
  metal_helmet: { name: '金属头盔', desc: '防护头部的金属头盔。', weight: 2, use: { armor: 20 } },
  // 精神与照明
  torch: { name: '火把', desc: '燃烧的火把。', weight: 1, use: { morale: 8 } },
  campfire: { name: '取暖火堆', desc: '温暖明亮的火堆。', weight: 3, use: { morale: 15 } },
  tent: { name: '简易帐篷', desc: '遮风挡雨的帐篷。', weight: 3, use: { stamina: 4, morale: 10 } },
  lamp: { name: '异星提灯', desc: '散发柔和光芒的提灯。', weight: 2, use: { morale: 25 } },
  shrine: { name: '图腾', desc: '安抚心灵的图腾。', weight: 3, use: { morale: 20 } },
  // 研究与探索
  notes: { name: '研究笔记', desc: '整理成册的研究笔记。', weight: 1, use: { data: 3 } },
  gem_report: { name: '宝石分析报告', desc: '对宝石的深度分析。', weight: 1, use: { data: 8 } },
  codex: { name: '知识法典', desc: '凝结异星知识的法典。', weight: 2, use: { data: 12 } },
  scout_flag: { name: '勘探旗', desc: '标记地形的勘探旗。', weight: 1, use: { scout: 5 } },
  map: { name: '简易地图', desc: '手工绘制的地图。', weight: 1, use: { scout: 10 } },
  // 深部新材料
  obsidian: { name: '黑曜石', desc: '深邃的黑色玻璃质岩石，坚硬无比。', weight: 2, material: true },
  star_dust: { name: '星尘', desc: '陨星上剥离的金属尘，蕴含星辉能量。', weight: 1, material: true },
  venom: { name: '毒液', desc: '从毒沼生物身上提取的浓稠毒液。', weight: 1, material: true },
  // 深部成品道具
  spore_bread: { name: '孢子面包', desc: '以孢子菌粉烘烤的面包。', weight: 1, use: { hunger: 70 } },
  tide_water: { name: '潮汐净水', desc: '经海藻过滤的洁净潮水。', weight: 1, use: { thirst: 70 } },
  obsidian_blade: { name: '黑曜石刃', desc: '锋利至极的黑曜石刀具。', weight: 2, use: { combat: 2 } },
  star_sword: { name: '星辉剑', desc: '以陨铁打造、星尘淬火的利剑。', weight: 2, use: { combat: 3 } },
  obsidian_armor: { name: '黑曜石甲', desc: '黑曜石鳞片编成的重甲。', weight: 4, use: { armor: 45 } },
  star_amulet: { name: '星辉护符', desc: '嵌着星尘的护符，令人心神安宁。', weight: 1, use: { data: 5, morale: 15 } },
  detox: { name: '强力解毒剂', desc: '能快速中和剧毒的药剂。', weight: 1, use: { heal: 30 } },
  venom_dart: { name: '毒液吹箭', desc: '蘸着毒液的吹箭。', weight: 1, use: { combat: 2 } },
  star_ingot: { name: '星铁锭', desc: '星尘熔炼成的特殊金属锭。', weight: 1 },
  obsidian_charm: { name: '黑曜石护符', desc: '黑曜石雕成的护身符。', weight: 1, use: { armor: 20, combat: 1 } },
  wind_whistle: { name: '风哨', desc: '风蚀峡谷采制的哨子，提振精神。', weight: 1, use: { morale: 20 } },
  magnet_boots: { name: '磁力靴', desc: '磁铁矿打的靴子，恢复耐力。', weight: 2, use: { stamina: 6 } },
  // 材料体系扩展成品
  dried_fungus: { name: '干菌', desc: '晒干的菌片，耐储存。', weight: 1, use: { hunger: 40 } },
  salt_meat: { name: '盐渍肉', desc: '盐渍封存的兽肉。', weight: 1, use: { hunger: 60, thirst: 20 } },
  stone_blade: { name: '石刀', desc: '磨制的燧石刀具。', weight: 1, use: { combat: 1 } },
  wood_shield: { name: '木盾', desc: '厚重的木盾，今日护甲。', weight: 2, use: { armor: 10 } },
  bone_ring: { name: '骨戒', desc: '骸骨雕成的戒指，蕴含记忆。', weight: 1, use: { data: 3, morale: 5 } },
  venom_arrow: { name: '毒箭', desc: '淬毒的骨箭。', weight: 1, use: { combat: 3 } },
}

// ---- 物品使用效果描述（供配方/道具栏展示） ----
G.itemUseText = function (itemId) {
  const it = G.ITEMS[itemId]
  if (!it || !it.use) return ''
  const u = it.use
  const parts = []
  if (u.hunger) parts.push(`饥饿 +${u.hunger}`)
  if (u.thirst) parts.push(`饥渴 +${u.thirst}`)
  if (u.data) parts.push(`星之记忆 +${u.data}`)
  if (u.heal) parts.push(`生命 +${u.heal}`)
  if (u.morale) parts.push(`精神 +${u.morale}`)
  if (u.stamina) parts.push(`耐力 +${u.stamina}`)
  if (u.bandage) parts.push(`止血并回复 ${u.bandage} 生命`)
  if (u.armor) parts.push(`今日护甲 +${u.armor}`)
  if (u.combat) parts.push(`今日战斗伤害 +${u.combat}`)
  if (u.scout) parts.push(`勘探进度 +${u.scout}`)
  // 生态专属物品：标注生态使用系数（本生态增强 / 异生态减弱；通用物品恒 1 不标注；物品级 use.sameCoef/otherCoef 可覆盖全局）
  if (it.eco) {
    const same = (u.sameCoef || it.sameCoef) || (G.C && G.C.ECO_USE_COEF_SAME) || 1.5
    const other = (u.otherCoef || it.otherCoef) || (G.C && G.C.ECO_USE_COEF_OTHER) || 0.7
    parts.push(`生态效果：本生态×${same}／异生态×${other}`)
  }
  return parts.join('、')
}

// ---- 物品/配方大类（道具栏与制作栏 tab 切换） ----
G.ITEM_CATS = [
  { key: 'food', name: '食物' },
  { key: 'drink', name: '饮水' },
  { key: 'medic', name: '医疗' },
  { key: 'weapon', name: '武器' },
  { key: 'armor', name: '护甲' },
  { key: 'research', name: '研究' },
  { key: 'explore', name: '探索' },
  { key: 'supply', name: '补给' },
  { key: 'material', name: '材料' },
]
G.itemCat = function (def) {
  const u = def && def.use
  if (!u) return 'material'
  if (u.hunger) return 'food'
  if (u.thirst) return 'drink'
  if (u.heal || u.bandage) return 'medic'
  if (u.combat) return 'weapon'
  if (u.armor) return 'armor'
  if (u.scout) return 'explore'
  if (u.data) return 'research'
  return 'supply'
}
G.recipeCat = function (rc) {
  const outId = rc && rc.out ? Object.keys(rc.out)[0] : null
  return G.itemCat(outId ? G.ITEMS[outId] : null)
}
