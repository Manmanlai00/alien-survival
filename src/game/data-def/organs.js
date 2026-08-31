/* 数据模块：organs（由 data.js 拆分，结构原样保留；可用 G.def 注册器继续叠加扩展） */
var G = window.GAME.data || (window.GAME.data = {})
G.LIMB_SLOT_MAX = 6
G.INTERNAL_SLOT_MAX = 7
G.BODY_SLOTS = [
  { name: '右臂', type: 0, unlockDay: 1 },
  { name: '腺体', type: 1, unlockDay: 1 },
  { name: '肺', type: 1, unlockDay: 1 },
  { name: '左臂', type: 0, unlockDay: 7 },
  { name: '胃', type: 1, unlockDay: 13 },
  { name: '心脏', type: 1, unlockDay: 19 },
  { name: '右腿', type: 0, unlockDay: 25 },
  { name: '眼', type: 0, unlockDay: 31 },
  { name: '躯干', type: 1, unlockDay: 37 },
  { name: '左腿', type: 0, unlockDay: 43 },
  { name: '神经', type: 1, unlockDay: 49 },
  { name: '脑', type: 1, unlockDay: 55 },
  { name: '胸甲', type: 0, unlockDay: 61 },
]

// ---- 器官工厂 ----
// 器官固定身体槽位映射（每个器官对应唯一且合理的槽位）
const ORGAN_SLOT = {
  // 肺
  leaf_lung: '肺', water_lung: '肺', deep_gill: '肺', ice_gill: '肺', lake_shark_gill: '肺',
  reef_gill: '肺', wind_lung: '肺', ash_lung: '肺', crater_gill: '肺', abyss_sea_dragon_gill: '肺',
  // 眼
  crystal_eye: '眼', mesa_eye: '眼', star_eye: '眼', desert_eye: '眼', snow_owl_eye: '眼',
  // 胸甲（护甲类）
  bark_skin: '胸甲', shell_spine: '胸甲', fat_layer: '胸甲', boil_scale: '胸甲', snow_wool: '胸甲',
  salt_armor: '胸甲', canyon_scales: '胸甲', magnet_armor: '胸甲', magnet_mane: '胸甲',
  poison_shell: '胸甲', chest_armor: '胸甲', waste_snake_hide: '胸甲', cave_drake_scale: '胸甲', desert_wyrm_scale: '胸甲',
  // 右臂（主手攻击类）
  vine_tendril: '右臂', acid_gland: '右臂', spore_muscle: '右臂', tide_claw: '右臂', iron_fang: '右臂',
  iron_horn: '右臂', meteor_shard: '右臂', star_crown: '右臂', fire_crystal: '右臂', sand_stinger: '右臂', tomb_marrow: '右臂', bog_croc_fang: '右臂',
  // 左臂（副手攻击类）
  bone_molar: '左臂', wing_membrane: '左臂', salt_plume: '左臂', frost_fang: '左臂', spore_venom: '左臂',
  spore_wing: '左臂', jelly_venom: '左臂', blade_wing: '左臂', toxic_gland: '左臂', sand_mandible: '左臂', storm_eagle_wing: '左臂',
  // 右腿
  eel_spine: '右腿', relic_titan_core: '右腿',
  // 腺体
  heat_gland: '腺体', regen_gland: '腺体', salt_gland: '腺体', venom_sac: '腺体', spore_gland: '腺体',
  abyss_gland: '腺体', lava_gland: '腺体', mirage_gland: '腺体', heat_demon_core: '腺体', salt_golem_core: '腺体',
  // 神经
  sonar_sac: '神经', geo_marrow: '神经', salt_marrow: '神经', levitation_core: '神经', decay_core: '神经', magma_vein: '神经', tyrant_spine: '神经', vein_dragon_bone: '神经', bone_king_marrow: '神经',
  // 心脏
  rage_crystal: '心脏', spore_core: '心脏', tide_heart: '心脏', storm_core: '心脏', venom_heart: '心脏', star_core: '心脏', obsidian_core: '心脏', meteor_heart: '心脏', dragon_core: '心脏',
  tundra_beast_heart: '心脏', spore_mother_heart: '心脏', magnet_mountain_core: '心脏', lava_dragon_heart: '心脏',
  // 胃
  bone_stomach: '胃', bog_bladder: '胃', swamp_croc_stomach: '胃',
  // 脑
  jade_leaf: '脑', flower_crown: '脑', star_vault_core: '脑',
  // 躯干
  forest_tree_heart: '躯干',
}
function makeOrgan(cfg) {
  return {
    id: cfg.id,
    name: cfg.name,
    desc: cfg.desc,
    source: cfg.source,
    slotType: cfg.slot !== undefined ? cfg.slot : 1,
    slotName: ORGAN_SLOT[cfg.id] || (cfg.slot === 0 ? '右臂' : '躯干'), // 固定身体槽位
    foodCost: cfg.food,
    dataCost: cfg.data,
    maint: cfg.maint,
    battleFunction: cfg.battle !== false,
    passive: {
      food: (cfg.passive && cfg.passive.food) || 0, water: (cfg.passive && cfg.passive.water) || 0,
      energy: (cfg.passive && cfg.passive.energy) || 0, data: (cfg.passive && cfg.passive.data) || 0,
      str: (cfg.passive && cfg.passive.str) || 0, agi: (cfg.passive && cfg.passive.agi) || 0,
      con: (cfg.passive && cfg.passive.con) || 0, int: (cfg.passive && cfg.passive.int) || 0,
      combat: (cfg.passive && cfg.passive.combat) || 0,
    },
    passiveDays: cfg.passiveDays || 1, // 被动产出间隔天数：每 N 天获取一次
    // 遗物式光环被动：移植后战斗中持续生效（start 开战 / turn 每回合）
    aura: cfg.aura || null,
    skillCard: {
      name: cfg.skill.name,
      desc: cfg.skill.desc,
      type: cfg.skill.type,
      timeCost: cfg.skill.time !== undefined ? cfg.skill.time : 1,
      specialCost: cfg.skill.special || 0,
      combatPower: cfg.skill.combat || 0,
      gatherAmount: cfg.skill.gather || 0,
      researchValue: cfg.skill.research || 0,
      dot: cfg.skill.dot || 0, // 持续伤害（每回合）
      dotTurns: cfg.skill.dotTurns || 3, // 持续伤害回合数（独立计时）
      element: cfg.skill.element || null, // 元素属性（fire/poison/ice/wind/lightning/water）
      elementAmount: cfg.skill.amount || 0, // 施加的元素层数
      // 遗物式技能效果字段（与战斗卡牌机制一致，任意组合）
      block: cfg.skill.block || 0, // 直接格挡
      heal: cfg.skill.heal || 0, // 直接治疗
      draw: cfg.skill.draw || 0, // 抽牌
      strength: cfg.skill.strength || 0, // 获得力量
      dexterity: cfg.skill.dexterity || 0, // 获得敏捷
      applyVuln: cfg.skill.applyVuln || 0, // 施加易伤
      applyWeak: cfg.skill.applyWeak || 0, // 施加虚弱
      loseLife: cfg.skill.loseLife || 0, // 代价
      hits: cfg.skill.hits || 0, // 多重打击
      pierce: cfg.skill.pierce || false, // 破甲
      invulnerable: cfg.skill.invulnerable || false, // 本回合免疫
      doubleNext: cfg.skill.doubleNext || false, // 下回合攻击×2
    },
  }
}

G.O = {
  leaf_lung: makeOrgan({ id: 'leaf_lung', name: '共生叶肺', desc: '来自菌须兽。能像植物一样从光与风中解析知识，每日产出微量星之记忆。', source: '菌须兽', food: 1, data: 0, maint: 1, battle: false, passive: { data: 1 }, skill: { name: '光合解析', desc: '解析光与风的记忆，获得 2 点星之记忆。', type: 4, research: 2 } }),
  bark_skin: makeOrgan({ id: 'bark_skin', name: '木化皮', desc: '来自树冠兽。木质的皮肤能储存阳光的能量，也让你更结实。', source: '树冠兽', food: 1, data: 0, maint: 1, battle: false, passive: { food: 1, con: 1 }, skill: { name: '木质愈合', desc: '唤醒木质组织，恢复 2 点耐力。', type: 5, gather: 2 } }),
  vine_tendril: makeOrgan({ id: 'vine_tendril', name: '藤蔓触手', desc: '来自捕藤兽。能像鞭子一样抽击猎物，抽击中蕴含力量。', source: '捕藤兽', slot: 0, food: 1, data: 1, maint: 1, skill: { name: '狂藤抽击', desc: '藤鞭猛抽，造成 6 点伤害并获得 1 点力量。', type: 6, special: 1, combat: 6, strength: 1 } }),
  water_lung: makeOrgan({ id: 'water_lung', name: '湖沼水肺', desc: '来自湖沼巨螯。能从体液中过滤出可利用的能量，也让体质更坚韧。', source: '湖沼巨螯', food: 1, data: 0, maint: 1, battle: false, passive: { water: 1, con: 1 }, skill: { name: '滤能呼吸', desc: '过滤体液，恢复 2 点耐力。', type: 5, gather: 2 } }),
  sonar_sac: makeOrgan({ id: 'sonar_sac', name: '声呐囊', desc: '来自雾隐蛙。能用声波读取环境的记忆，也让心智更聪慧。', source: '雾隐蛙', food: 1, data: 0, maint: 1, battle: false, passive: { data: 1, int: 1 }, skill: { name: '回声解析', desc: '用声呐解析环境，获得 2 点星之记忆。', type: 4, research: 2 } }),
  deep_gill: makeOrgan({ id: 'deep_gill', name: '深水腮', desc: '来自渊鲛。能在高压深水中循环能量，也让体质更坚韧。', source: '渊鲛', food: 2, data: 1, maint: 1, battle: false, passive: { energy: 1, con: 1 }, skill: { name: '深水呼吸', desc: '深水能量循环，恢复 3 点耐力。', type: 5, gather: 3 } }),
  shell_spine: makeOrgan({ id: 'shell_spine', name: '甲壳脊', desc: '来自遗迹甲卫。坚硬的脊骨既能防御又能反震。', source: '遗迹甲卫', slot: 0, food: 1, data: 1, maint: 1, skill: { name: '甲脊壁垒', desc: '脊甲护体并反击，获得 8 点格挡并造成 4 点伤害。', type: 6, special: 2, combat: 4, block: 8 } }),
  bone_molar: makeOrgan({ id: 'bone_molar', name: '食骸臼齿', desc: '来自回廊食骸。能碾碎骸骨，也碾碎敌人的防线。', source: '回廊食骸', slot: 0, food: 2, data: 1, maint: 1, skill: { name: '骸齿碎甲', desc: '撕咬露出破绽，造成 5 点伤害并施加 3 层易伤。', type: 6, special: 2, combat: 5, applyVuln: 3 } }),
  acid_gland: makeOrgan({ id: 'acid_gland', name: '酸液腺', desc: '来自洞穴爬行者。喷吐的酸雾能侵蚀敌人的攻势。', source: '洞穴爬行者', food: 1, data: 1, maint: 1, skill: { name: '酸雾削弱', desc: '喷吐酸雾，造成 3 点伤害并施加 2 层虚弱（攻击 -25%）。', type: 6, special: 2, combat: 3, applyWeak: 2 } }),
  crystal_eye: makeOrgan({ id: 'crystal_eye', name: '晶辉瞳', desc: '来自晶辉蜥。瞳孔中封存着磷光的记忆，也让心智更聪慧。', source: '晶辉蜥', food: 1, data: 1, maint: 1, battle: false, passive: { data: 1, int: 1 }, skill: { name: '磷光解析', desc: '解析磷光记忆，获得 2 点星之记忆。', type: 4, research: 2 } }),
  heat_gland: makeOrgan({ id: 'heat_gland', name: '熔壳热腺', desc: '来自熔壳兽。源源不断产生热量，移植后能抵御严寒，也让力量更充盈。', source: '熔壳兽', food: 2, data: 1, maint: 2, battle: false, passive: { energy: 1, str: 1 }, aura: { shieldStart: 4 }, skill: { name: '热流涌动', desc: '释放储存的地热，恢复 3 点耐力。', type: 5, gather: 3 } }),
  geo_marrow: makeOrgan({ id: 'geo_marrow', name: '地脉髓', desc: '来自脉动石蟒。骨髓中流淌着地脉的记忆，也让心智更聪慧。', source: '脉动石蟒', food: 2, data: 2, maint: 2, battle: false, passive: { data: 1, int: 1 }, passiveDays: 2, skill: { name: '地脉记忆', desc: '聆听地脉记忆，获得 3 点星之记忆。', type: 4, research: 3 } }),
  wing_membrane: makeOrgan({ id: 'wing_membrane', name: '羽翼膜', desc: '来自雪崖枭。轻薄的翼膜能滑翔借风恢复能量，也让身手更敏捷。', source: '雪崖枭', slot: 0, food: 1, data: 1, maint: 1, battle: false, passive: { energy: 1, agi: 1 }, skill: { name: '滑翔恢复', desc: '滑翔一段，恢复 2 点耐力。', type: 5, gather: 2 } }),
  regen_gland: makeOrgan({ id: 'regen_gland', name: '再生腺体', desc: '来自山顶掠食者。能加速身体组织修复，也让体质更坚韧。', source: '山顶掠食者', food: 2, data: 1, maint: 2, battle: false, passive: { energy: 1, con: 1 }, aura: { healPerTurn: 1 }, skill: { name: '快速再生', desc: '催动再生腺体，恢复 3 点耐力。', type: 5, gather: 3 } }),
  fat_layer: makeOrgan({ id: 'fat_layer', name: '厚脂层', desc: '来自冻原巨獠。厚重的皮下脂肪能扛下冲击，移植后能抵御严寒。', source: '冻原巨獠', slot: 0, food: 2, data: 1, maint: 2, skill: { name: '厚脂冲撞', desc: '脂肪护体冲撞，造成 6 点伤害并获得 6 点格挡。', type: 6, special: 2, combat: 6, block: 6 } }),
  salt_gland: makeOrgan({ id: 'salt_gland', name: '盐晶腺', desc: '来自盐晶收割者。能析出体液中的盐分，也让体质更坚韧。', source: '盐晶收割者', food: 2, data: 1, maint: 1, battle: false, passive: { data: 1, con: 1 }, skill: { name: '盐析提纯', desc: '提纯晶体中的记忆，获得 2 点星之记忆。', type: 4, research: 2 } }),
  salt_plume: makeOrgan({ id: 'salt_plume', name: '盐鳞羽', desc: '来自盐鳞秃鹫。盐晶羽毛能在风中积蓄能量，也让身手更敏捷。', source: '盐鳞秃鹫', slot: 0, food: 1, data: 1, maint: 1, battle: false, passive: { energy: 1, agi: 1 }, skill: { name: '盐风回旋', desc: '盐风裹身，恢复 2 点耐力。', type: 5, gather: 2 } }),
  bone_stomach: makeOrgan({ id: 'bone_stomach', name: '噬骨胃', desc: '来自腐骨吞噬者。能消化骸骨，提取残留的神经记忆，也让心智更聪慧。', source: '腐骨吞噬者', food: 2, data: 2, maint: 2, battle: false, passive: { data: 1, int: 1 }, passiveDays: 2, skill: { name: '骸骨追忆', desc: '消化骨中的记忆，获得 3 点星之记忆。', type: 4, research: 3 } }),
  eel_spine: makeOrgan({ id: 'eel_spine', name: '巨鳗脊骨', desc: '来自骨海龙鳗。一节节脊骨能爆发出横扫千军的力量。', source: '骨海龙鳗', slot: 0, food: 2, data: 2, maint: 2, skill: { name: '巨鳗横扫', desc: '带电脊骨横扫，造成 10 点伤害并施加 2 层雷击。', type: 6, element: 'lightning', amount: 2, special: 2, combat: 10 } }),
  jade_leaf: makeOrgan({ id: 'jade_leaf', name: '翠冠叶', desc: '来自翠冠鹿群。鹿角上的叶片封存着森林的记忆，也让心智更聪慧。', source: '翠冠鹿群', food: 1, data: 0, maint: 1, battle: false, passive: { data: 1, int: 1 }, passiveDays: 2, skill: { name: '翠冠追忆', desc: '读取翠冠叶中的记忆，获得 2 点星之记忆。', type: 4, research: 2 } }),
  venom_sac: makeOrgan({ id: 'venom_sac', name: '毒腺囊', desc: '来自狂躁蛙群。毒囊能刺激身体机能，也让力量更充盈。', source: '狂躁蛙群', food: 1, data: 1, maint: 1, battle: false, passive: { energy: 1, str: 1 }, skill: { name: '毒液激涌', desc: '毒液刺激机体，恢复 2 点耐力。', type: 5, gather: 2 } }),
  salt_marrow: makeOrgan({ id: 'salt_marrow', name: '盐晶髓', desc: '来自盐晶领主。骨髓是纯粹的晶体记忆，也让心智更聪慧。', source: '盐晶领主', food: 2, data: 2, maint: 2, battle: false, passive: { data: 1, int: 1 }, passiveDays: 2, skill: { name: '晶髓回响', desc: '聆听晶髓回响，获得 3 点星之记忆。', type: 4, research: 3 } }),
  frost_fang: makeOrgan({ id: 'frost_fang', name: '霜牙', desc: '来自霜牙兽。能冻结血肉的利齿。', source: '霜牙兽', slot: 0, food: 2, data: 2, maint: 2, skill: { name: '霜牙破隙', desc: '冻结之牙撕咬，造成 5 点伤害并施加 3 层易伤。', type: 6, special: 2, combat: 5, applyVuln: 3 } }),
  ice_gill: makeOrgan({ id: 'ice_gill', name: '冰鳃', desc: '来自冰渊鲛。能在冰水中滤出净水，也让心智更清明。', source: '冰渊鲛', food: 2, data: 1, maint: 1, battle: false, passive: { water: 1, int: 1 }, skill: { name: '冰息循环', desc: '循环冰息，恢复 3 点耐力。', type: 5, gather: 3 } }),
  boil_scale: makeOrgan({ id: 'boil_scale', name: '沸鳞', desc: '来自沸鳞鱼群。鳞片能储存地热转化为能量，也让思绪更活跃。', source: '沸鳞鱼群', food: 1, data: 1, maint: 1, battle: false, passive: { energy: 1, int: 1 }, skill: { name: '沸能转化', desc: '转化鳞片中的地热，恢复 3 点耐力。', type: 5, gather: 3 } }),
  rage_crystal: makeOrgan({ id: 'rage_crystal', name: '狂乱晶核', desc: '来自暴走晶兽。躁动的晶体能爆发出撕裂之力。', source: '暴走晶兽', slot: 0, food: 2, data: 1, maint: 2, skill: { name: '晶刺淬力', desc: '暴躁晶体爆发，造成 5 点伤害并施加 3 层灼烧，获得 1 点力量。', type: 6, element: 'fire', amount: 3, special: 2, combat: 5, strength: 1 } }),
  flower_crown: makeOrgan({ id: 'flower_crown', name: '花冠绒', desc: '来自花冠鹿。绒冠中沉淀着花粉的记忆，也让心智更聪慧。', source: '花冠鹿', food: 1, data: 0, maint: 1, battle: false, passive: { data: 1, int: 1 }, passiveDays: 2, skill: { name: '花粉解析', desc: '解析花粉记忆，获得 2 点星之记忆。', type: 4, research: 2 } }),
  lake_shark_gill: makeOrgan({ id: 'lake_shark_gill', name: '巨鲨鳃', desc: '来自湖渊巨鲨。能在深水中蓄能。', source: '湖渊巨鲨', food: 1, data: 1, maint: 1, battle: false, passive: { water: 1 }, skill: { name: '深水蓄能', desc: '深水循环，恢复 2 点耐力。', type: 5, gather: 2 } }),
  snow_wool: makeOrgan({ id: 'snow_wool', name: '雪羊绒', desc: '来自高山雪羊。绒毛细密，能锁住体温，也让体质更坚韧。', source: '高山雪羊', food: 1, data: 1, maint: 2, battle: false, passive: { energy: 1, con: 1 }, passiveDays: 2, skill: { name: '绒毛保温', desc: '绒毛锁住体温，恢复 2 点耐力。', type: 5, gather: 2 } }),
  salt_armor: makeOrgan({ id: 'salt_armor', name: '盐甲', desc: '来自盐甲兽。盐晶硬甲能支撑一次猛击。', source: '盐甲兽', slot: 0, food: 2, data: 1, maint: 2, skill: { name: '盐晶淬力', desc: '盐晶硬甲冲撞，造成 4 点伤害并获得 1 点力量。', type: 6, special: 2, combat: 4, strength: 1 } }),
  // ===== 深部新区器官 =====
  spore_gland: makeOrgan({ id: 'spore_gland', name: '孢子腺', desc: '来自孢兔。能解析孢子中的生机记忆，也让心智更聪慧。', source: '孢兔', food: 1, data: 0, maint: 1, battle: false, passive: { data: 1, int: 1 }, skill: { name: '孢子解析', desc: '解析孢子记忆，获得 2 点星之记忆。', type: 4, research: 2 } }),
  spore_muscle: makeOrgan({ id: 'spore_muscle', name: '菌丝肌', desc: '来自菌猎手。菌丝缠绕的肌肉爆发出强力一击。', source: '菌猎手', slot: 0, food: 2, data: 1, maint: 1, skill: { name: '菌丝缠杀', desc: '菌丝骤缠猛击，造成 5 点伤害并抽 1 张牌。', type: 6, special: 2, combat: 5, draw: 1 } }),
  spore_venom: makeOrgan({ id: 'spore_venom', name: '孢子毒腺', desc: '来自孢子蟒。能喷吐带孢子的毒雾。', source: '孢子蟒', slot: 0, food: 2, data: 1, maint: 2, skill: { name: '孢子瘴气', desc: '喷吐孢子瘴气，造成 4 点伤害并施加 2 层虚弱（攻击 -25%）。', type: 6, special: 2, combat: 4, applyWeak: 2 } }),
  spore_wing: makeOrgan({ id: 'spore_wing', name: '菌翼膜', desc: '来自冠巢鹰。菌翼能积蓄养分，也让身手更敏捷。', source: '冠巢鹰', slot: 0, food: 1, data: 1, maint: 1, battle: false, passive: { food: 1, agi: 1 }, skill: { name: '菌翼滑翔', desc: '借菌翼滑翔，恢复 3 点耐力。', type: 5, gather: 3 } }),
  spore_core: makeOrgan({ id: 'spore_core', name: '菌核', desc: '来自菌甲巨兽。整片菌林的记忆核心。', source: '菌甲巨兽', food: 2, data: 2, maint: 2, battle: false, passive: { data: 1 }, passiveDays: 2, aura: { drawPerTurn: 1 }, skill: { name: '菌核共鸣', desc: '聆听菌林记忆，获得 3 点星之记忆。', type: 4, research: 3 } }),
  tide_claw: makeOrgan({ id: 'tide_claw', name: '潮汐螯', desc: '来自潮汐蟹。能汇聚潮汐之力猛击。', source: '潮汐蟹', slot: 0, food: 2, data: 1, maint: 1, skill: { name: '潮汐开隙', desc: '钳开破绽，造成 3 点伤害并施加 2 层易伤。', type: 6, special: 1, combat: 3, applyVuln: 2 } }),
  reef_gill: makeOrgan({ id: 'reef_gill', name: '礁石鳃', desc: '来自礁石鱼。能在浅海循环能量。', source: '礁石鱼', food: 1, data: 1, maint: 1, battle: false, passive: { water: 1 }, skill: { name: '礁石滤能', desc: '过滤海水恢复 2 点耐力。', type: 5, gather: 2 } }),
  jelly_venom: makeOrgan({ id: 'jelly_venom', name: '水母毒囊', desc: '来自暗潮水母。毒刺能麻痹血肉，注入持续剧毒。', source: '暗潮水母', slot: 0, food: 1, data: 1, maint: 1, skill: { name: '麻痹蜇刺', desc: '麻痹之刺，造成 4 点伤害并施加 4 层剧毒与 1 层虚弱。', type: 6, element: 'poison', amount: 4, special: 1, combat: 4, applyWeak: 1 } }),
  abyss_gland: makeOrgan({ id: 'abyss_gland', name: '深渊腺', desc: '来自深渊海蜥。深海中沉淀着古老的记忆，每两日涌出星之记忆。', source: '深渊海蜥', food: 2, data: 2, maint: 2, battle: false, passive: { data: 2 }, passiveDays: 2, skill: { name: '深渊回响', desc: '聆听深渊记忆，获得 3 点星之记忆。', type: 4, research: 3 } }),
  tide_heart: makeOrgan({ id: 'tide_heart', name: '古潮之心', desc: '来自古潮领主。心跳与潮汐共鸣，能量源源不绝。', source: '古潮领主', food: 2, data: 2, maint: 2, battle: false, passive: { energy: 1 }, passiveDays: 2, aura: { healPerTurn: 2 }, skill: { name: '潮汐脉搏', desc: '借潮汐脉搏恢复 3 点耐力。', type: 5, gather: 3 } }),
  wind_lung: makeOrgan({ id: 'wind_lung', name: '风肺', desc: '来自风翼蜥。能储存狂风之力，每两日涌出一股能量。', source: '风翼蜥', food: 1, data: 1, maint: 1, battle: false, passive: { energy: 2 }, passiveDays: 2, skill: { name: '风息蓄能', desc: '吸入狂风恢复 3 点耐力。', type: 5, gather: 3 } }),
  canyon_scales: makeOrgan({ id: 'canyon_scales', name: '峡谷鳞', desc: '来自峡谷巨蜥。坚硬的鳞甲能扛下冲击并免疫一回合伤害。', source: '峡谷巨蜥', slot: 0, food: 2, data: 1, maint: 2, skill: { name: '峡谷壁垒', desc: '鳞甲护体：获得 6 点格挡，本回合免疫伤害。', type: 7, special: 2, block: 6 } }),
  blade_wing: makeOrgan({ id: 'blade_wing', name: '风刃翼', desc: '来自风刃蝠。翅缘如刀刃般锋利。', source: '风刃蝠', slot: 0, food: 1, data: 1, maint: 1, skill: { name: '风刃连切', desc: '风刃连环切割，造成 4 点伤害并抽 1 张牌。', type: 6, special: 2, combat: 4, draw: 1 } }),
  mesa_eye: makeOrgan({ id: 'mesa_eye', name: '台地瞳', desc: '来自台地枭。高台之眼能洞察一切记忆。', source: '台地枭', food: 1, data: 0, maint: 1, battle: false, passive: { data: 1 }, skill: { name: '高台洞察', desc: '洞察台地记忆，获得 2 点星之记忆。', type: 4, research: 2 } }),
  storm_core: makeOrgan({ id: 'storm_core', name: '风暴核', desc: '来自雷暴天兽。核心里封存着雷电。', source: '雷暴天兽', slot: 0, food: 2, data: 2, maint: 2, aura: { startEnergy: 1 }, skill: { name: '雷暴轰击', desc: '引爆雷暴，造成 10 点伤害并施加 2 层雷击。', type: 6, element: 'lightning', amount: 2, special: 2, combat: 10 } }),
  magnet_armor: makeOrgan({ id: 'magnet_armor', name: '磁甲', desc: '来自磁甲兽。磁力吸附的甲壳能格挡冲击并免疫一回合伤害。', source: '磁甲兽', slot: 0, food: 2, data: 1, maint: 2, skill: { name: '磁力护盾', desc: '磁甲护体：获得 4 点格挡，本回合免疫伤害。', type: 7, special: 2, block: 4 } }),
  iron_fang: makeOrgan({ id: 'iron_fang', name: '铁牙', desc: '来自铁刺蛇。能咬穿金属的利齿。', source: '铁刺蛇', slot: 0, food: 1, data: 1, maint: 1, skill: { name: '铁齿破壳', desc: '铁齿咬穿护壳，造成 3 点伤害并无视敌人护盾。', type: 6, special: 1, combat: 3, pierce: true } }),
  iron_horn: makeOrgan({ id: 'iron_horn', name: '铁冠角', desc: '来自铁冠兽。能顶碎岩壁的硬角，蓄力后下回合攻击翻倍。', source: '铁冠兽', slot: 0, food: 2, data: 1, maint: 2, skill: { name: '铁冠突刺', desc: '顶碎防线：获得 1 点力量，并蓄力使下回合攻击伤害 ×2。', type: 8, special: 2, strength: 1 } }),
  magnet_mane: makeOrgan({ id: 'magnet_mane', name: '磁鬃', desc: '来自磁暴狮。鬃毛能积蓄磁场能量，也让身手更敏捷、战斗更凶狠。', source: '磁暴狮', food: 2, data: 1, maint: 2, battle: false, passive: { energy: 1, agi: 1, combat: 1 }, skill: { name: '磁场蓄能', desc: '蓄积磁场恢复 3 点耐力。', type: 5, gather: 3 } }),
  levitation_core: makeOrgan({ id: 'levitation_core', name: '悬浮核', desc: '来自浮空晶主。悬浮之理让思维与身法都更轻盈。', source: '浮空晶主', food: 2, data: 2, maint: 2, battle: false, passive: { data: 1, agi: 1 }, aura: { dexterityStart: 2 }, skill: { name: '悬浮领域', desc: '解析悬浮之理，获得 3 点星之记忆。', type: 4, research: 3 } }),
  bog_bladder: makeOrgan({ id: 'bog_bladder', name: '腐沼囊', desc: '来自腐沼蛙。腐沼发酵出养分与能量。', source: '腐沼蛙', food: 1, data: 0, maint: 1, battle: false, passive: { food: 1, energy: 1 }, skill: { name: '腐沼冲击', desc: '喷吐腐沼恢复 3 点耐力。', type: 5, gather: 3 } }),
  toxic_gland: makeOrgan({ id: 'toxic_gland', name: '毒腺', desc: '来自毒沼蜥。能榨取剧毒注入攻击，让敌人持续中毒。', source: '毒沼蜥', slot: 0, food: 2, data: 1, maint: 1, skill: { name: '毒腺循环', desc: '喷射毒液，造成 3 点伤害并抽 1 张牌。', type: 6, special: 1, combat: 3, draw: 1 } }),
  venom_heart: makeOrgan({ id: 'venom_heart', name: '毒心', desc: '来自毒液蛇。剧毒中孕育的生机记忆。', source: '毒液蛇', food: 2, data: 2, maint: 2, battle: false, passive: { data: 1 }, passiveDays: 2, skill: { name: '毒心共鸣', desc: '聆听毒心记忆，获得 3 点星之记忆。', type: 4, research: 3 } }),
  poison_shell: makeOrgan({ id: 'poison_shell', name: '毒壳', desc: '来自毒甲巨龟。浸毒的硬壳能撞碎敌人。', source: '毒甲巨龟', slot: 0, food: 2, data: 1, maint: 2, skill: { name: '毒壳威压', desc: '毒壳冲撞，造成 5 点伤害并施加 2 层虚弱（攻击 -25%）。', type: 6, special: 2, combat: 5, applyWeak: 2 } }),
  decay_core: makeOrgan({ id: 'decay_core', name: '朽核', desc: '来自朽木君王。朽木中封存着久远的记忆，每三日沉淀出星之记忆。', source: '朽木君王', food: 2, data: 2, maint: 2, battle: false, passive: { data: 2 }, passiveDays: 3, skill: { name: '朽木追忆', desc: '解析朽木记忆，获得 3 点星之记忆。', type: 4, research: 3 } }),
  star_eye: makeOrgan({ id: 'star_eye', name: '星瞳', desc: '来自星尘鼠。瞳孔映着群星的记忆。', source: '星尘鼠', food: 1, data: 0, maint: 1, battle: false, passive: { data: 1 }, skill: { name: '星辉洞察', desc: '洞察星辉记忆，获得 2 点星之记忆。', type: 4, research: 2 } }),
  meteor_shard: makeOrgan({ id: 'meteor_shard', name: '陨晶片', desc: '来自陨晶兽。陨晶碎片能撕裂护甲。', source: '陨晶兽', slot: 0, food: 2, data: 1, maint: 2, skill: { name: '陨晶淬力', desc: '陨晶灼身，造成 5 点伤害并施加 2 层灼烧，获得 1 点力量。', type: 6, element: 'fire', amount: 2, special: 2, combat: 5, strength: 1 } }),
  crater_gill: makeOrgan({ id: 'crater_gill', name: '陨水鳃', desc: '来自陨水兽。能在陨坑水中循环能量。', source: '陨水兽', food: 1, data: 1, maint: 1, battle: false, passive: { water: 1 }, skill: { name: '陨水滤能', desc: '过滤陨水恢复 2 点耐力。', type: 5, gather: 2 } }),
  star_core: makeOrgan({ id: 'star_core', name: '星核', desc: '来自星核蜥。核心中的星光缓缓流淌。', source: '星核蜥', food: 2, data: 2, maint: 2, battle: false, passive: { data: 1 }, passiveDays: 2, skill: { name: '星核回响', desc: '聆听星核记忆，获得 3 点星之记忆。', type: 4, research: 3 } }),
  star_crown: makeOrgan({ id: 'star_crown', name: '星冠', desc: '来自星冠巨兽。冠冕上凝结着群星之力。', source: '星冠巨兽', slot: 0, food: 2, data: 2, maint: 2, skill: { name: '星冠轰击', desc: '凝聚星辉轰击，造成 8 点伤害。', type: 3, special: 2, combat: 8 } }),
  lava_gland: makeOrgan({ id: 'lava_gland', name: '熔岩腺', desc: '来自熔岩蜥。能储存熔岩的热能，也让力量更充盈。', source: '熔岩蜥', food: 1, data: 1, maint: 1, battle: false, passive: { energy: 1, str: 1 }, skill: { name: '熔岩蓄能', desc: '汲取熔岩热恢复 3 点耐力。', type: 5, gather: 3 } }),
  ash_lung: makeOrgan({ id: 'ash_lung', name: '灰烬肺', desc: '来自灰烬兽。能滤出灰烬中的能量，也让力量更充盈。', source: '灰烬兽', food: 2, data: 1, maint: 2, battle: false, passive: { energy: 1, str: 1 }, skill: { name: '灰烬滤能', desc: '滤出灰烬能量恢复 2 点耐力。', type: 5, gather: 2 } }),
  magma_vein: makeOrgan({ id: 'magma_vein', name: '岩浆脉', desc: '来自岩浆巨蟒。脉管中流淌着地心记忆，也让力量更充盈。', source: '岩浆巨蟒', food: 2, data: 2, maint: 2, battle: false, passive: { data: 1, str: 1 }, skill: { name: '地脉追踪', desc: '追踪地脉记忆，获得 3 点星之记忆。', type: 4, research: 3 } }),
  fire_crystal: makeOrgan({ id: 'fire_crystal', name: '火晶', desc: '来自火晶兽。燃烧的晶体能爆发出烈焰。', source: '火晶兽', slot: 0, food: 2, data: 1, maint: 2, skill: { name: '烈焰余烬', desc: '引爆烈焰，造成 5 点伤害并施加 3 层灼烧，抽 1 张牌。', type: 6, element: 'fire', amount: 3, special: 2, combat: 5, draw: 1 } }),
  obsidian_core: makeOrgan({ id: 'obsidian_core', name: '黑曜核', desc: '来自黑曜石魔。黑曜石心脏，蓄力后下回合攻击翻倍。', source: '黑曜石魔', slot: 0, food: 2, data: 2, maint: 2, skill: { name: '黑曜破绽', desc: '黑曜震击露出破绽：施加 2 层易伤，并蓄力使下回合攻击伤害 ×2。', type: 8, special: 2, applyVuln: 2 } }),
  sand_stinger: makeOrgan({ id: 'sand_stinger', name: '沙尾针', desc: '来自沙蝎。蕴含麻痹毒素的尾针，能让敌人持续中毒。', source: '沙蝎', slot: 0, food: 1, data: 1, maint: 1, skill: { name: '尾针麻痹', desc: '尾针注入毒液，造成 3 点伤害并施加 2 层虚弱（攻击 -25%）。', type: 6, special: 1, combat: 3, applyWeak: 2 } }),
  sand_mandible: makeOrgan({ id: 'sand_mandible', name: '沙颚', desc: '来自沙海巨蠕。能碾碎沙石的巨颚。', source: '沙海巨蠕', slot: 0, food: 1, data: 1, maint: 1, skill: { name: '沙颚裂痕', desc: '巨颚撕咬，造成 5 点伤害并施加 2 层易伤。', type: 6, special: 2, combat: 5, applyVuln: 2 } }),
  desert_eye: makeOrgan({ id: 'desert_eye', name: '荒漠瞳', desc: '来自废墟秃鹫。能看穿热浪中的记忆。', source: '废墟秃鹫', food: 1, data: 0, maint: 1, battle: false, passive: { data: 1 }, skill: { name: '热浪洞察', desc: '洞察荒漠记忆，获得 2 点星之记忆。', type: 4, research: 2 } }),
  mirage_gland: makeOrgan({ id: 'mirage_gland', name: '幻沙腺', desc: '来自沙魇兽。幻象能指引你找到水源，也让身手更敏捷。', source: '沙魇兽', food: 2, data: 1, maint: 1, battle: false, passive: { water: 1, agi: 1 }, skill: { name: '幻沙迷障', desc: '释放幻沙恢复 3 点耐力。', type: 5, gather: 3 } }),
  tomb_marrow: makeOrgan({ id: 'tomb_marrow', name: '墓髓', desc: '来自墓穴巨像。千年古墓封存的骸骨之髓。', source: '墓穴巨像', slot: 0, food: 2, data: 2, maint: 2, skill: { name: '墓髓横扫', desc: '以墓髓之力横扫，造成 9 点伤害。', type: 3, special: 2, combat: 9 } }),
  chest_armor: makeOrgan({ id: 'chest_armor', name: '岩甲壳', desc: '来自岩背兽。坚硬的岩石背甲，移植于胸甲能抵御冲击。', source: '岩背兽', slot: 0, food: 2, data: 1, maint: 2, skill: { name: '岩甲护体', desc: '展开岩甲护体，重击敌人，造成 4 点伤害。', type: 3, special: 2, combat: 4 } }),
  // ===== 超级生物专属器官（流星事件掉落，顶级） =====
  meteor_heart: makeOrgan({ id: 'meteor_heart', name: '流星之心', desc: '来自流星巨兽。燃烧的星核在胸腔中搏动，灌注力量与热量。', source: '流星巨兽', food: 3, data: 3, maint: 3, passive: { energy: 1, str: 1 }, skill: { name: '流星爆发', desc: '引爆星核之力，造成 10 点伤害并施加 3 层灼烧与抽 1 张牌。', type: 6, element: 'fire', amount: 3, special: 2, combat: 10, draw: 1 } }),
  tyrant_spine: makeOrgan({ id: 'tyrant_spine', name: '暴君脊骨', desc: '来自陨星暴君。一节节骨节迸发着暴虐的雷光。', source: '陨星暴君', food: 3, data: 3, maint: 3, passive: { data: 1, str: 1 }, skill: { name: '暴君雷击', desc: '雷光贯穿，造成 9 点伤害并施加 2 层雷击，获得 1 点力量。', type: 6, element: 'lightning', amount: 2, special: 2, combat: 9, strength: 1 } }),
  dragon_core: makeOrgan({ id: 'dragon_core', name: '龙核', desc: '来自星核巨龙。心脏般的星核缓缓搏动，蓄积毁灭之力。', source: '星核巨龙', food: 3, data: 3, maint: 3, passive: { data: 1, int: 1 }, skill: { name: '龙威蓄力', desc: '龙威压制敌人：施加 3 层虚弱（攻击 -25%），并蓄力使下回合攻击伤害 ×2。', type: 8, special: 2, applyWeak: 3 } }),
  // ===== 生态超级生物专属器官（各自唯一） =====
  waste_snake_hide: makeOrgan({ id: 'waste_snake_hide', name: '荒蟒鳞皮', desc: '来自荒原巨蟒。铁一般的鳞皮，淬满剧毒。', source: '荒原巨蟒', food: 3, data: 3, maint: 3, passive: { con: 1, energy: 1 }, skill: { name: '荒蟒毒噬', desc: '喷射荒蟒毒液，造成 7 点伤害并施加 3 层易伤。', type: 6, special: 2, combat: 7, applyVuln: 3 } }),
  forest_tree_heart: makeOrgan({ id: 'forest_tree_heart', name: '古树之心', desc: '来自古森树王。千年古树的心脏仍在跳动。', source: '古森树王', food: 3, data: 3, maint: 3, passive: { food: 1, con: 1 }, skill: { name: '古树缠绕', desc: '古树风灵缠绕，造成 6 点伤害并抽 1 张牌。', type: 6, special: 2, combat: 6, draw: 1 } }),
  bog_croc_fang: makeOrgan({ id: 'bog_croc_fang', name: '深渊鳄牙', desc: '来自深渊古鳄。能咬碎湖底岩层的巨牙。', source: '深渊古鳄', food: 3, data: 3, maint: 3, passive: { water: 1, str: 1 }, skill: { name: '深渊鳄威', desc: '深渊鳄牙撕咬，造成 7 点伤害并施加 2 层虚弱（攻击 -25%）。', type: 6, special: 2, combat: 7, applyWeak: 2 } }),
  relic_titan_core: makeOrgan({ id: 'relic_titan_core', name: '泰坦岩核', desc: '来自石像泰坦。驱动远古巨像的心脏岩核。', source: '石像泰坦', food: 3, data: 3, maint: 3, passive: { con: 1, int: 1 }, skill: { name: '泰坦岩盾', desc: '展开泰坦岩盾，获得 8 点格挡，本回合免疫伤害。', type: 7, special: 2, block: 8 } }),
  cave_drake_scale: makeOrgan({ id: 'cave_drake_scale', name: '洞窟龙鳞', desc: '来自洞窟龙蟒。灼热的龙鳞，散发硫磺气息。', source: '洞窟龙蟒', food: 3, data: 3, maint: 3, passive: { con: 1, energy: 1 }, skill: { name: '龙鳞引火', desc: '洞窟龙鳞灼烧，造成 7 点伤害并施加 3 层灼烧，抽 1 张牌。', type: 6, element: 'fire', amount: 3, special: 2, combat: 7, draw: 1 } }),
  heat_demon_core: makeOrgan({ id: 'heat_demon_core', name: '炎魔之核', desc: '来自地心炎魔。持续燃烧的地心之火。', source: '地心炎魔', food: 3, data: 3, maint: 3, passive: { energy: 1, str: 1 }, skill: { name: '炎魔淬力', desc: '引爆炎魔之核，造成 8 点伤害并施加 3 层灼烧，获得 1 点力量。', type: 6, element: 'fire', amount: 3, special: 2, combat: 8, strength: 1 } }),
  vein_dragon_bone: makeOrgan({ id: 'vein_dragon_bone', name: '地脉龙骨', desc: '来自地脉祖龙。承载整片大地记忆的龙骨。', source: '地脉祖龙', food: 3, data: 3, maint: 3, passive: { data: 1, int: 1 }, skill: { name: '地脉蓄能', desc: '汲取大地之力：获得 1 点力量与 1 点敏捷，并蓄力使下回合攻击伤害 ×2。', type: 8, special: 2, strength: 1, dexterity: 1 } }),
  snow_owl_eye: makeOrgan({ id: 'snow_owl_eye', name: '雪枭之瞳', desc: '来自雪山巨枭。能看穿暴风雪的眼瞳。', source: '雪山巨枭', food: 3, data: 3, maint: 3, passive: { data: 1, agi: 1 }, skill: { name: '雪瞳凝望', desc: '雪枭之瞳凝望，造成 7 点伤害并施加 3 层易伤。', type: 6, special: 2, combat: 7, applyVuln: 3 } }),
  tundra_beast_heart: makeOrgan({ id: 'tundra_beast_heart', name: '冰原之心', desc: '来自冰原巨兽。在永冻之地跳动的心脏。', source: '冰原巨兽', food: 3, data: 3, maint: 3, passive: { energy: 1, con: 1 }, skill: { name: '冰原轰鸣', desc: '冰原之心轰鸣，造成 8 点伤害并获得 5 点格挡。', type: 6, special: 2, combat: 8, block: 5 } }),
  salt_golem_core: makeOrgan({ id: 'salt_golem_core', name: '盐晶核心', desc: '来自盐晶巨像。纯度极高的盐晶之心。', source: '盐晶巨像', food: 3, data: 3, maint: 3, passive: { water: 1, con: 1 }, skill: { name: '盐晶壁垒', desc: '盐晶之力迸发，造成 7 点伤害并获得 6 点格挡。', type: 6, special: 2, combat: 7, block: 6 } }),
  bone_king_marrow: makeOrgan({ id: 'bone_king_marrow', name: '君王骨髓', desc: '来自骸骨君王。千年骸骨淬炼出的骨髓。', source: '骸骨君王', food: 3, data: 3, maint: 3, passive: { data: 1, str: 1 }, skill: { name: '君王之毒', desc: '君王之毒侵骨，造成 8 点伤害并施加 4 层易伤。', type: 6, special: 2, combat: 8, applyVuln: 4 } }),
  spore_mother_heart: makeOrgan({ id: 'spore_mother_heart', name: '菌母之心', desc: '来自菌母古树。孕育整片雨林的孢子之心。', source: '菌母古树', food: 3, data: 3, maint: 3, passive: { food: 1, int: 1 }, skill: { name: '孢子破绽', desc: '菌母孢子喷涌，造成 8 点伤害并施加 4 层易伤。', type: 6, special: 2, combat: 8, applyVuln: 4 } }),
  abyss_sea_dragon_gill: makeOrgan({ id: 'abyss_sea_dragon_gill', name: '海龙之鳃', desc: '来自深渊海龙。能呼吸深渊海水的鳃。', source: '深渊海龙', food: 3, data: 3, maint: 3, passive: { water: 1, agi: 1 }, skill: { name: '深渊潮涌', desc: '海龙之息席卷，造成 8 点伤害并抽 1 张牌。', type: 6, special: 2, combat: 8, draw: 1 } }),
  storm_eagle_wing: makeOrgan({ id: 'storm_eagle_wing', name: '风暴之翼', desc: '来自风暴巨鹰。翼展遮天的风暴之羽。', source: '风暴巨鹰', food: 3, data: 3, maint: 3, passive: { energy: 1, agi: 1 }, skill: { name: '风暴之羽', desc: '风暴之翼切割，造成 8 点伤害并获得 1 点敏捷。', type: 6, special: 2, combat: 8, dexterity: 1 } }),
  magnet_mountain_core: makeOrgan({ id: 'magnet_mountain_core', name: '磁山核心', desc: '来自磁山巨兽。整座磁山的重力凝聚于此。', source: '磁山巨兽', food: 3, data: 3, maint: 3, passive: { energy: 1, con: 1 }, skill: { name: '磁山引力', desc: '磁山之力爆发，造成 8 点伤害并获得 1 点力量。', type: 6, special: 2, combat: 8, strength: 1 } }),
  swamp_croc_stomach: makeOrgan({ id: 'swamp_croc_stomach', name: '腐沼之胃', desc: '来自腐沼巨鳄。能消化腐沼毒物的胃。', source: '腐沼巨鳄', food: 3, data: 3, maint: 3, passive: { food: 1, con: 1 }, skill: { name: '腐沼威压', desc: '腐沼毒气喷吐，造成 7 点伤害并施加 3 层虚弱（攻击 -25%）。', type: 6, special: 2, combat: 7, applyWeak: 3 } }),
  star_vault_core: makeOrgan({ id: 'star_vault_core', name: '星穹之核', desc: '来自星穹巨兽。凝缩了群星光辉的核。', source: '星穹巨兽', food: 3, data: 3, maint: 3, passive: { data: 1, int: 1 }, skill: { name: '星穹之智', desc: '星穹之力倾泻，造成 8 点伤害并抽 1 张牌。', type: 6, special: 2, combat: 8, draw: 1 } }),
  lava_dragon_heart: makeOrgan({ id: 'lava_dragon_heart', name: '熔岩龙心', desc: '来自熔岩古龙。仍在灼烧的龙之心脏。', source: '熔岩古龙', food: 3, data: 3, maint: 3, passive: { energy: 1, str: 1 }, skill: { name: '熔岩龙鳞', desc: '熔岩龙息喷吐，造成 8 点伤害并施加 3 层灼烧，获得 6 点格挡。', type: 6, element: 'fire', amount: 3, special: 2, combat: 8, block: 6 } }),
  desert_wyrm_scale: makeOrgan({ id: 'desert_wyrm_scale', name: '沙漠蠕鳞', desc: '来自沙漠蠕王。能引动流沙的鳞片。', source: '沙漠蠕王', food: 3, data: 3, maint: 3, passive: { water: 1, con: 1 }, skill: { name: '流沙裂痕', desc: '沙漠蠕鳞激射，造成 7 点伤害并施加 3 层易伤。', type: 6, special: 2, combat: 7, applyVuln: 3 } }),
}

// ---- 敌人/地点构建辅助 ----
// 怪物能力映射（按名字集中维护，cfg.ability 可覆盖；支持单个或数组）
const ABILITY_BY_NAME = {
  '树冠兽': 'armor',
  '捕藤兽': 'regen',
  '毒刺藤兽': 'poison',
  '湖沼巨螯': 'armor',
  '浅滩蟹': 'armor',
  '雾隐蛙': 'lockdown',
  '沼泽巨蚺': 'lifesteal',
  '渊鲛': 'lifesteal',
  '湖渊巨鲨': 'enrage',
  '遗迹甲卫': 'armor',
  '石像守卫': 'thorns',
  '回廊食骸': 'lifesteal',
  '浮雕傀儡': 'enrage',
  '洞穴爬行者': 'poison',
  '穴居蝠': 'lockdown',
  '晶辉蜥': 'armor',
  '晶甲虫': 'thorns',
  '熔壳兽': 'armor',
  '硫磺蜥': 'poison',
  '脉动石蟒': 'regen',
  '岩浆巨蠕': 'thorns',
  '地脉核心母体': ['enrage', 'thorns', 'regen'],
  '雪崖枭': 'multi',
  '高山雪羊': 'enrage',
  '山顶掠食者': 'lifesteal',
  '巨翼秃鹫': 'multi',
  '冻原巨獠': 'armor',
  '冰原狼': 'multi',
  '盐晶收割者': 'enrage',
  '盐甲兽': 'armor',
  '盐鳞秃鹫': 'armor',
  '晶翼鹰': 'lockdown',
  '腐骨吞噬者': 'lifesteal',
  '白骨兽': 'thorns',
  '骨海龙鳗': 'multi',
  // 季节怪
  '狂躁蛙群': 'enrage',
  '冰渊鲛': 'armor',
  '沸鳞鱼群': 'thorns',
  '暴走晶兽': 'enrage',
  '霜牙兽': 'lifesteal',
  '盐晶领主': ['armor', 'enrage'],
  // 深部新区敌人
  '孢兔': 'regen',
  '菌猎手': 'poison',
  '孢子蟒': 'thorns',
  '冠巢鹰': 'multi',
  '菌甲巨兽': ['armor', 'regen'],
  '潮汐蟹': 'armor',
  '滩涂兽': 'enrage',
  '礁石鱼': 'thorns',
  '暗潮水母': 'poison',
  '深渊海蜥': 'lifesteal',
  '古潮领主': ['armor', 'enrage'],
  '风翼蜥': 'multi',
  '岩背兽': 'armor',
  '峡谷巨蜥': 'enrage',
  '风刃蝠': 'thorns',
  '台地枭': 'lockdown',
  '雷暴天兽': ['multi', 'enrage'],
  '磁甲兽': 'armor',
  '铁刺蛇': 'thorns',
  '铁冠兽': 'enrage',
  '磁暴狮': 'lifesteal',
  '浮空晶主': ['regen', 'armor'],
  '腐沼蛙': 'poison',
  '毒沼蜥': 'armor',
  '毒液蛇': 'poison',
  '毒甲巨龟': 'thorns',
  '朽木君王': ['regen', 'thorns'],
  '星尘鼠': 'regen',
  '陨晶兽': 'armor',
  '陨水兽': 'lifesteal',
  '星核蜥': 'enrage',
  '星冠巨兽': ['multi', 'armor'],
  '熔岩蜥': 'enrage',
  '灰烬兽': 'thorns',
  '岩浆巨蟒': 'lifesteal',
  '火晶兽': 'armor',
  '黑曜石魔': ['enrage', 'thorns', 'armor'],
  '沙蝎': 'poison',
  '沙海巨蠕': 'lifesteal',
  '废墟秃鹫': 'multi',
  '沙魇兽': 'lockdown',
  '墓穴巨像': ['armor', 'enrage', 'regen'],
}
G.ABILITY_INFO = {
  regen: { name: '再生', icon: '♻', desc: '每回合开始恢复 3 点生命' },
  armor: { name: '重甲', icon: '🛡', desc: '受到你的伤害 -2' },
  lifesteal: { name: '吸血', icon: '🩸', desc: '攻击命中时回复等量生命' },
  poison: { name: '剧毒', icon: '☠', desc: '攻击命中使你中毒，每回合受毒伤（可叠层）' },
  enrage: { name: '狂暴', icon: '🔥', desc: '生命低于一半时攻击 +2' },
  thorns: { name: '荆棘', icon: '🌵', desc: '你攻击它时反伤 2 点' },
  lockdown: { name: '锁定', icon: '🎯', desc: '攻击无法被闪避' },
  multi: { name: '连击', icon: '⚡', desc: '一次行动攻击两次' },
  // 精英词缀（高难生物随机附加）
  heavy: { name: '重击', icon: '💥', desc: '开场攻击 +2' },
  frenzy: { name: '狂怒', icon: '🔥', desc: '每回合攻击 +1' },
}
// ---- 怪物原型（行动风格）----
const ARCHETYPE_NAMES = {
  normal: '均衡型',
  elemental: '元素型',
  brute: '重装型',
  swift: '迅捷型',
  bulwark: '堡垒型',
  frenzy: '狂暴型',
}

// ---- 全生物手写行动脚本表（按生物名，符合难度与设定，不随机生成）----
// 原型 a：normal 均衡 / elemental 元素 / brute 重装(血×1.5) / swift 迅捷 / bulwark 堡垒(每回合护盾2) / frenzy 狂暴
// 行动 p：attack 扑咬 / heavy 蓄力 / multi 连击(hits) / dot 元素侵袭(element+amount) / heal 回复 / shield 护盾 / buff 狂暴 / feint 佯攻
const HAND_PATTERNS = {
  // ===== 营地平原 / 共生森林 =====
  '菌须兽': { a: 'normal', p: [{ type: 'attack', atk: 2 }, { type: 'attack', atk: 2 }, { type: 'heavy', atk: 4 }] },
  '林地鼬': { a: 'swift', p: [{ type: 'attack', atk: 2 }, { type: 'multi', atk: 1, hits: 2 }, { type: 'attack', atk: 2 }] },
  '树冠兽': { a: 'brute', p: [{ type: 'heavy', atk: 6 }, { type: 'attack', atk: 3 }, { type: 'attack', atk: 3 }] },
  '花冠鹿': { a: 'swift', p: [{ type: 'attack', atk: 3 }, { type: 'feint' }, { type: 'attack', atk: 3 }] },
  '捕藤兽': { a: 'elemental', p: [{ type: 'dot', element: 'poison', amount: 3 }, { type: 'attack', atk: 4 }, { type: 'heavy', atk: 7 }, { type: 'attack', atk: 4 }] },
  '毒刺藤兽': { a: 'elemental', p: [{ type: 'dot', element: 'poison', amount: 4 }, { type: 'attack', atk: 4 }, { type: 'attack', atk: 4 }, { type: 'heavy', atk: 7 }] },
  // ===== 甲烷湖泽 =====
  '湖沼巨螯': { a: 'brute', p: [{ type: 'heavy', atk: 6 }, { type: 'attack', atk: 3 }, { type: 'attack', atk: 3 }] },
  '浅滩蟹': { a: 'normal', p: [{ type: 'attack', atk: 2 }, { type: 'attack', atk: 2 }, { type: 'heavy', atk: 4 }] },
  '雾隐蛙': { a: 'elemental', p: [{ type: 'dot', element: 'poison', amount: 3 }, { type: 'attack', atk: 3 }, { type: 'feint' }] },
  '沼泽巨蚺': { a: 'elemental', p: [{ type: 'attack', atk: 4 }, { type: 'heavy', atk: 7 }, { type: 'dot', element: 'poison', amount: 3 }, { type: 'attack', atk: 4 }] },
  '渊鲛': { a: 'swift', p: [{ type: 'multi', atk: 3, hits: 2 }, { type: 'attack', atk: 5 }, { type: 'heavy', atk: 8 }, { type: 'attack', atk: 5 }] },
  '湖渊巨鲨': { a: 'frenzy', p: [{ type: 'attack', atk: 6 }, { type: 'heavy', atk: 9 }, { type: 'multi', atk: 4, hits: 2 }, { type: 'attack', atk: 6 }, { type: 'buff', amount: 1 }] },
  // ===== 远古遗迹 =====
  '遗迹甲卫': { a: 'bulwark', p: [{ type: 'shield', amount: 3 }, { type: 'attack', atk: 5 }, { type: 'heavy', atk: 8 }, { type: 'attack', atk: 5 }] },
  '石像守卫': { a: 'brute', p: [{ type: 'heavy', atk: 8 }, { type: 'attack', atk: 5 }, { type: 'attack', atk: 5 }, { type: 'heavy', atk: 8 }] },
  '回廊食骸': { a: 'frenzy', p: [{ type: 'dot', element: 'poison', amount: 3 }, { type: 'attack', atk: 6 }, { type: 'buff', amount: 1 }, { type: 'heavy', atk: 9 }, { type: 'attack', atk: 6 }] },
  '浮雕傀儡': { a: 'bulwark', p: [{ type: 'attack', atk: 5 }, { type: 'multi', atk: 3, hits: 2 }, { type: 'shield', amount: 2 }, { type: 'attack', atk: 5 }] },
  // ===== 幽深洞窟 =====
  '洞穴爬行者': { a: 'elemental', p: [{ type: 'dot', element: 'poison', amount: 4 }, { type: 'attack', atk: 4 }, { type: 'attack', atk: 4 }, { type: 'heavy', atk: 7 }] },
  '穴居蝠': { a: 'swift', p: [{ type: 'multi', atk: 2, hits: 2 }, { type: 'attack', atk: 3 }, { type: 'attack', atk: 3 }] },
  '晶辉蜥': { a: 'elemental', p: [{ type: 'attack', atk: 5 }, { type: 'heavy', atk: 8 }, { type: 'dot', element: 'lightning', amount: 2 }, { type: 'attack', atk: 5 }] },
  '晶甲虫': { a: 'normal', p: [{ type: 'attack', atk: 3 }, { type: 'heavy', atk: 6 }, { type: 'attack', atk: 3 }] },
  '熔壳兽': { a: 'elemental', p: [{ type: 'dot', element: 'fire', amount: 3 }, { type: 'attack', atk: 5 }, { type: 'heavy', atk: 8 }, { type: 'attack', atk: 5 }] },
  '硫磺蜥': { a: 'elemental', p: [{ type: 'dot', element: 'fire', amount: 2 }, { type: 'attack', atk: 4 }, { type: 'attack', atk: 4 }, { type: 'heavy', atk: 7 }] },
  '脉动石蟒': { a: 'elemental', p: [{ type: 'heavy', atk: 9 }, { type: 'attack', atk: 7 }, { type: 'dot', element: 'fire', amount: 3 }, { type: 'attack', atk: 7 }, { type: 'buff', amount: 1 }] },
  '岩浆巨蠕': { a: 'elemental', p: [{ type: 'dot', element: 'fire', amount: 3 }, { type: 'multi', atk: 4, hits: 2 }, { type: 'attack', atk: 6 }, { type: 'heavy', atk: 9 }] },
  '地脉核心母体': { a: 'brute', p: [{ type: 'heavy', atk: 10 }, { type: 'attack', atk: 8 }, { type: 'dot', element: 'fire', amount: 4 }, { type: 'shield', amount: 4 }, { type: 'buff', amount: 1 }, { type: 'attack', atk: 8 }] },
  // ===== 极高山脉 =====
  '雪崖枭': { a: 'swift', p: [{ type: 'multi', atk: 3, hits: 2 }, { type: 'attack', atk: 5 }, { type: 'heavy', atk: 8 }, { type: 'feint' }] },
  '高山雪羊': { a: 'brute', p: [{ type: 'heavy', atk: 7 }, { type: 'attack', atk: 4 }, { type: 'attack', atk: 4 }] },
  '山顶掠食者': { a: 'swift', p: [{ type: 'multi', atk: 4, hits: 2 }, { type: 'attack', atk: 6 }, { type: 'heavy', atk: 9 }, { type: 'attack', atk: 6 }] },
  '巨翼秃鹫': { a: 'frenzy', p: [{ type: 'attack', atk: 6 }, { type: 'multi', atk: 4, hits: 2 }, { type: 'attack', atk: 6 }, { type: 'buff', amount: 1 }] },
  // ===== 冰封冻野 =====
  '冻原巨獠': { a: 'brute', p: [{ type: 'heavy', atk: 9 }, { type: 'attack', atk: 6 }, { type: 'buff', amount: 1 }, { type: 'attack', atk: 6 }, { type: 'heavy', atk: 9 }] },
  '冰原狼': { a: 'swift', p: [{ type: 'multi', atk: 3, hits: 2 }, { type: 'attack', atk: 5 }, { type: 'attack', atk: 5 }, { type: 'heavy', atk: 8 }] },
  // ===== 盐晶荒原 =====
  '盐晶收割者': { a: 'elemental', p: [{ type: 'attack', atk: 5 }, { type: 'heavy', atk: 8 }, { type: 'attack', atk: 5 }, { type: 'dot', element: 'poison', amount: 3 }] },
  '盐甲兽': { a: 'bulwark', p: [{ type: 'shield', amount: 2 }, { type: 'attack', atk: 4 }, { type: 'heavy', atk: 7 }] },
  '盐鳞秃鹫': { a: 'swift', p: [{ type: 'multi', atk: 4, hits: 2 }, { type: 'attack', atk: 6 }, { type: 'heavy', atk: 9 }, { type: 'attack', atk: 6 }] },
  '晶翼鹰': { a: 'swift', p: [{ type: 'attack', atk: 5 }, { type: 'feint' }, { type: 'multi', atk: 3, hits: 2 }, { type: 'attack', atk: 5 }] },
  // ===== 巨兽坟场 =====
  '腐骨吞噬者': { a: 'frenzy', p: [{ type: 'dot', element: 'poison', amount: 4 }, { type: 'attack', atk: 7 }, { type: 'buff', amount: 1 }, { type: 'heavy', atk: 10 }, { type: 'attack', atk: 7 }] },
  '白骨兽': { a: 'elemental', p: [{ type: 'attack', atk: 5 }, { type: 'heavy', atk: 8 }, { type: 'attack', atk: 5 }, { type: 'dot', element: 'poison', amount: 3 }] },
  '骨海龙鳗': { a: 'frenzy', p: [{ type: 'multi', atk: 5, hits: 2 }, { type: 'attack', atk: 8 }, { type: 'dot', element: 'poison', amount: 4 }, { type: 'heavy', atk: 10 }, { type: 'attack', atk: 8 }] },
  // ===== 孢子雨林 =====
  '孢兔': { a: 'swift', p: [{ type: 'attack', atk: 2 }, { type: 'multi', atk: 1, hits: 2 }, { type: 'attack', atk: 2 }] },
  '毒菇兽': { a: 'elemental', p: [{ type: 'dot', element: 'poison', amount: 3 }, { type: 'attack', atk: 3 }, { type: 'attack', atk: 3 }] },
  '菌猎手': { a: 'elemental', p: [{ type: 'dot', element: 'poison', amount: 4 }, { type: 'attack', atk: 5 }, { type: 'multi', atk: 3, hits: 2 }, { type: 'attack', atk: 5 }] },
  '孢子蟒': { a: 'elemental', p: [{ type: 'dot', element: 'poison', amount: 4 }, { type: 'attack', atk: 6 }, { type: 'heavy', atk: 9 }, { type: 'attack', atk: 6 }, { type: 'buff', amount: 1 }] },
  '冠巢鹰': { a: 'swift', p: [{ type: 'multi', atk: 4, hits: 2 }, { type: 'attack', atk: 6 }, { type: 'feint' }, { type: 'heavy', atk: 9 }] },
  '菌甲巨兽': { a: 'brute', p: [{ type: 'heavy', atk: 10 }, { type: 'attack', atk: 8 }, { type: 'shield', amount: 4 }, { type: 'dot', element: 'poison', amount: 4 }, { type: 'attack', atk: 8 }, { type: 'buff', amount: 1 }] },
  // ===== 暗潮海岸 =====
  '潮汐蟹': { a: 'bulwark', p: [{ type: 'attack', atk: 3 }, { type: 'shield', amount: 2 }, { type: 'attack', atk: 3 }] },
  '滩涂兽': { a: 'brute', p: [{ type: 'heavy', atk: 7 }, { type: 'attack', atk: 4 }, { type: 'attack', atk: 4 }] },
  '礁石鱼': { a: 'swift', p: [{ type: 'attack', atk: 4 }, { type: 'multi', atk: 3, hits: 2 }, { type: 'attack', atk: 4 }] },
  '暗潮水母': { a: 'elemental', p: [{ type: 'dot', element: 'poison', amount: 4 }, { type: 'attack', atk: 5 }, { type: 'attack', atk: 5 }, { type: 'heavy', atk: 8 }] },
  '深渊海蜥': { a: 'elemental', p: [{ type: 'attack', atk: 7 }, { type: 'heavy', atk: 10 }, { type: 'dot', element: 'water', amount: 3 }, { type: 'attack', atk: 7 }, { type: 'buff', amount: 1 }] },
  '古潮领主': { a: 'bulwark', p: [{ type: 'heavy', atk: 10 }, { type: 'attack', atk: 8 }, { type: 'dot', element: 'water', amount: 4 }, { type: 'shield', amount: 3 }, { type: 'multi', atk: 5, hits: 2 }, { type: 'attack', atk: 8 }] },
  // ===== 风蚀峡谷 =====
  '风翼蜥': { a: 'swift', p: [{ type: 'attack', atk: 4 }, { type: 'multi', atk: 3, hits: 2 }, { type: 'attack', atk: 4 }] },
  '岩背兽': { a: 'brute', p: [{ type: 'heavy', atk: 6 }, { type: 'attack', atk: 3 }, { type: 'attack', atk: 3 }] },
  '峡谷巨蜥': { a: 'brute', p: [{ type: 'attack', atk: 6 }, { type: 'heavy', atk: 9 }, { type: 'buff', amount: 1 }, { type: 'attack', atk: 6 }] },
  '风刃蝠': { a: 'swift', p: [{ type: 'multi', atk: 3, hits: 2 }, { type: 'attack', atk: 5 }, { type: 'feint' }, { type: 'attack', atk: 5 }] },
  '台地枭': { a: 'swift', p: [{ type: 'multi', atk: 4, hits: 2 }, { type: 'attack', atk: 6 }, { type: 'heavy', atk: 9 }, { type: 'attack', atk: 6 }] },
  '雷暴天兽': { a: 'elemental', p: [{ type: 'dot', element: 'lightning', amount: 2 }, { type: 'attack', atk: 8 }, { type: 'multi', atk: 5, hits: 2 }, { type: 'heavy', atk: 10 }, { type: 'attack', atk: 8 }] },
  // ===== 磁力高原 =====
  '磁甲兽': { a: 'bulwark', p: [{ type: 'shield', amount: 2 }, { type: 'attack', atk: 4 }, { type: 'heavy', atk: 7 }] },
  '铁刺蛇': { a: 'elemental', p: [{ type: 'dot', element: 'poison', amount: 3 }, { type: 'attack', atk: 3 }, { type: 'attack', atk: 3 }] },
  '铁冠兽': { a: 'brute', p: [{ type: 'heavy', atk: 9 }, { type: 'attack', atk: 6 }, { type: 'shield', amount: 2 }, { type: 'attack', atk: 6 }] },
  '磁暴狮': { a: 'elemental', p: [{ type: 'dot', element: 'lightning', amount: 2 }, { type: 'attack', atk: 7 }, { type: 'buff', amount: 1 }, { type: 'heavy', atk: 10 }, { type: 'attack', atk: 7 }] },
  '浮空晶主': { a: 'elemental', p: [{ type: 'attack', atk: 8 }, { type: 'dot', element: 'lightning', amount: 2 }, { type: 'multi', atk: 5, hits: 2 }, { type: 'heavy', atk: 10 }, { type: 'shield', amount: 3 }] },
  // ===== 腐化泥沼 =====
  '腐沼蛙': { a: 'elemental', p: [{ type: 'dot', element: 'poison', amount: 3 }, { type: 'attack', atk: 3 }, { type: 'attack', atk: 3 }] },
  '毒沼蜥': { a: 'elemental', p: [{ type: 'dot', element: 'poison', amount: 4 }, { type: 'attack', atk: 4 }, { type: 'attack', atk: 4 }] },
  '毒液蛇': { a: 'elemental', p: [{ type: 'dot', element: 'poison', amount: 4 }, { type: 'attack', atk: 5 }, { type: 'heavy', atk: 8 }, { type: 'attack', atk: 5 }] },
  '毒甲巨龟': { a: 'bulwark', p: [{ type: 'dot', element: 'poison', amount: 4 }, { type: 'attack', atk: 6 }, { type: 'shield', amount: 2 }, { type: 'heavy', atk: 9 }] },
  '朽木君王': { a: 'brute', p: [{ type: 'heavy', atk: 10 }, { type: 'attack', atk: 8 }, { type: 'dot', element: 'poison', amount: 4 }, { type: 'buff', amount: 1 }, { type: 'attack', atk: 8 }, { type: 'heavy', atk: 9 }] },
  // ===== 星空高原 =====
  '星尘鼠': { a: 'swift', p: [{ type: 'attack', atk: 2 }, { type: 'multi', atk: 1, hits: 2 }, { type: 'attack', atk: 2 }] },
  '陨晶兽': { a: 'elemental', p: [{ type: 'attack', atk: 4 }, { type: 'heavy', atk: 7 }, { type: 'attack', atk: 4 }, { type: 'dot', element: 'lightning', amount: 2 }] },
  '陨水兽': { a: 'elemental', p: [{ type: 'attack', atk: 5 }, { type: 'dot', element: 'water', amount: 2 }, { type: 'heavy', atk: 8 }, { type: 'attack', atk: 5 }] },
  '星核蜥': { a: 'elemental', p: [{ type: 'attack', atk: 6 }, { type: 'heavy', atk: 9 }, { type: 'dot', element: 'lightning', amount: 2 }, { type: 'attack', atk: 6 }] },
  '星冠巨兽': { a: 'elemental', p: [{ type: 'heavy', atk: 10 }, { type: 'attack', atk: 8 }, { type: 'dot', element: 'lightning', amount: 2 }, { type: 'buff', amount: 1 }, { type: 'multi', atk: 5, hits: 2 }, { type: 'attack', atk: 8 }] },
  // ===== 熔岩深渊 =====
  '熔岩蜥': { a: 'elemental', p: [{ type: 'dot', element: 'fire', amount: 3 }, { type: 'attack', atk: 6 }, { type: 'heavy', atk: 9 }, { type: 'attack', atk: 6 }] },
  '灰烬兽': { a: 'elemental', p: [{ type: 'attack', atk: 5 }, { type: 'dot', element: 'fire', amount: 2 }, { type: 'attack', atk: 5 }, { type: 'heavy', atk: 8 }] },
  '岩浆巨蟒': { a: 'elemental', p: [{ type: 'dot', element: 'fire', amount: 3 }, { type: 'attack', atk: 7 }, { type: 'heavy', atk: 10 }, { type: 'buff', amount: 1 }, { type: 'attack', atk: 7 }] },
  '火晶兽': { a: 'elemental', p: [{ type: 'dot', element: 'fire', amount: 3 }, { type: 'attack', atk: 6 }, { type: 'multi', atk: 4, hits: 2 }, { type: 'attack', atk: 6 }] },
  '黑曜石魔': { a: 'elemental', p: [{ type: 'heavy', atk: 11 }, { type: 'dot', element: 'fire', amount: 4 }, { type: 'attack', atk: 9 }, { type: 'buff', amount: 1 }, { type: 'multi', atk: 6, hits: 2 }, { type: 'attack', atk: 9 }] },
  // ===== 遗忘荒漠 =====
  '沙蝎': { a: 'elemental', p: [{ type: 'dot', element: 'poison', amount: 3 }, { type: 'attack', atk: 4 }, { type: 'heavy', atk: 7 }, { type: 'attack', atk: 4 }] },
  '沙海巨蠕': { a: 'swift', p: [{ type: 'attack', atk: 5 }, { type: 'heavy', atk: 8 }, { type: 'multi', atk: 3, hits: 2 }, { type: 'attack', atk: 5 }] },
  '废墟秃鹫': { a: 'swift', p: [{ type: 'multi', atk: 3, hits: 2 }, { type: 'attack', atk: 5 }, { type: 'feint' }, { type: 'attack', atk: 5 }] },
  '沙魇兽': { a: 'elemental', p: [{ type: 'dot', element: 'poison', amount: 3 }, { type: 'attack', atk: 6 }, { type: 'buff', amount: 1 }, { type: 'heavy', atk: 9 }] },
  '墓穴巨像': { a: 'brute', p: [{ type: 'heavy', atk: 11 }, { type: 'attack', atk: 9 }, { type: 'shield', amount: 4 }, { type: 'multi', atk: 6, hits: 2 }, { type: 'attack', atk: 9 }, { type: 'buff', amount: 1 }] },
  // ===== 季节生物 =====
  '翠冠鹿群': { a: 'swift', p: [{ type: 'attack', atk: 3 }, { type: 'multi', atk: 2, hits: 2 }, { type: 'attack', atk: 3 }] },
  '狂躁蛙群': { a: 'elemental', p: [{ type: 'dot', element: 'poison', amount: 4 }, { type: 'attack', atk: 5 }, { type: 'multi', atk: 3, hits: 2 }, { type: 'attack', atk: 5 }] },
  '冰渊鲛': { a: 'elemental', p: [{ type: 'attack', atk: 6 }, { type: 'heavy', atk: 9 }, { type: 'dot', element: 'water', amount: 3 }, { type: 'attack', atk: 6 }] },
  '沸鳞鱼群': { a: 'elemental', p: [{ type: 'attack', atk: 5 }, { type: 'dot', element: 'fire', amount: 3 }, { type: 'multi', atk: 3, hits: 2 }, { type: 'attack', atk: 5 }] },
  '暴走晶兽': { a: 'elemental', p: [{ type: 'dot', element: 'lightning', amount: 2 }, { type: 'attack', atk: 6 }, { type: 'buff', amount: 1 }, { type: 'heavy', atk: 9 }] },
  '霜牙兽': { a: 'elemental', p: [{ type: 'attack', atk: 7 }, { type: 'heavy', atk: 10 }, { type: 'dot', element: 'water', amount: 3 }, { type: 'attack', atk: 7 }, { type: 'buff', amount: 1 }] },
  '盐晶领主': { a: 'bulwark', p: [{ type: 'attack', atk: 7 }, { type: 'heavy', atk: 10 }, { type: 'dot', element: 'poison', amount: 4 }, { type: 'shield', amount: 2 }, { type: 'attack', atk: 7 }] },
  // ===== 事件战斗敌人 =====
  '骸骨游魂': { a: 'frenzy', p: [{ type: 'attack', atk: 7 }, { type: 'dot', element: 'poison', amount: 4 }, { type: 'heal', amount: 3 }, { type: 'heavy', atk: 10 }, { type: 'attack', atk: 7 }] },
}

function enemy(cfg) {
  const abi = cfg.ability !== undefined ? cfg.ability : (ABILITY_BY_NAME[cfg.name] || null)
  const e = {
    name: cfg.name,
    power: cfg.power,
    loot: { 0: (cfg.loot && cfg.loot.FOOD) || 0, 1: (cfg.loot && cfg.loot.WATER) || 0, 2: (cfg.loot && cfg.loot.MATERIALS) || 0, 3: (cfg.loot && cfg.loot.DATA) || 0 },
    organ: cfg.organ || null,
    core: cfg.core || false,
    maxPop: cfg.maxPop,
    ability: abi,
    seasonal: false,
    dotElement: cfg.dot || null,
  }
  // 行动脚本：优先手写表 HAND_PATTERNS（符合难度与生物设定），其次 cfg.pattern 显式传入
  const hp = HAND_PATTERNS[cfg.name]
  if (hp) {
    e.pattern = hp.p
    e.archetype = hp.a
  } else if (cfg.pattern) {
    e.pattern = cfg.pattern
    e.archetype = cfg.archetype || 'normal'
  } else {
    e.pattern = [{ type: 'attack', atk: cfg.power }]
    e.archetype = 'normal'
  }
  e.archetypeName = ARCHETYPE_NAMES[e.archetype] || '均衡型'
  // 有效战力：重装型不升档（只是血量高、特殊能力少，难度评估按原始战力）
  e.effectivePower = cfg.power
  if (e.archetype === 'brute') e.hpMult = 1.5 // 重装型：高血量
  if (e.archetype === 'bulwark') e.turnShield = 2 // 堡垒型：每回合临时护盾
  // 重装型：血量高但特殊能力少（最多保留 1 个）；超级生物不受此限
  if (!cfg.super && e.archetype === 'brute' && Array.isArray(e.ability) && e.ability.length > 1) {
    e.ability = e.ability.slice(0, 1)
  }
  return e
}

function loc(cfg) {
  const enemies = cfg.enemies ? cfg.enemies.slice() : (cfg.enemy ? [cfg.enemy] : [])
  const enemyPops = {}
  for (const e of enemies) enemyPops[e.name] = e.maxPop
  return {
    id: cfg.id,
    name: cfg.name,
    // 生物群落：支持数组（一个地点可属于多个群落），字符串自动归一化为数组
    eco: Array.isArray(cfg.eco) ? cfg.eco.slice() : [cfg.eco],
    desc: cfg.desc,
    neighbors: cfg.neighbors,
    enemies,
    enemyPops,
    seasonalEnemies: cfg.seasonal || {},
    overnight: { waterCost: (cfg.overnight && cfg.overnight.waterCost) || 0, lifeDamage: (cfg.overnight && cfg.overnight.lifeDamage) || 0, energyBonus: (cfg.overnight && cfg.overnight.energyBonus) || 0 },
    pop: enemies.length ? enemies[0].maxPop : 0,
    scoutNeed: cfg.scoutNeed || C.SCOUT_NEEDED,
    require: cfg.require || null, // 进入所需能力（aqua 水下呼吸 / flight 飞行）
  }
}

// ---- 地图：21 个地点 ----
