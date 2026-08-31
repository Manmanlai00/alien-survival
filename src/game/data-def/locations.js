/* 数据模块：locations（由 data.js 拆分，结构原样保留；可用 G.def 注册器继续叠加扩展） */
var G = window.GAME.data || (window.GAME.data = {})
G.LOCATIONS = {}
function reg(l) {
  G.LOCATIONS[l.id] = l
}
// 季节生物工厂：标记为季节生物（seasonal: true），群落按季节独立记录、随季节出没
function sea(cfg) {
  return Object.assign(enemy(cfg), { seasonal: true })
}

// 多群落支持：合并一个地点所有生态区的物品池（按 id 去重），兼容单个字符串
G.ecoPool = function (eco) {
  const list = Array.isArray(eco) ? eco : [eco]
  const out = []
  for (const k of list) {
    const arr = G.REGION_ITEMS[k] || []
    for (const it of arr) if (!out.some((x) => x.id === it.id)) out.push(it)
  }
  return out
}
// 生态区显示文本（多群落用「 / 」分隔）
G.ecoText = function (eco) {
  const list = Array.isArray(eco) ? eco : [eco]
  return list.join(' / ')
}

reg(loc({ id: 'camp', name: '营地', eco: '营地平原', scoutNeed: 100, desc: '你的临时营地，位于这颗星球大地的中央。脚下的菌毯是活物，与你保持着脆弱的共生。', neighbors: ['forest_edge', 'lake_shore', 'spore_edge', 'tide_shore', 'dune_sea', 'wind_pass'] }))
reg(loc({ id: 'forest_edge', name: '林缘', eco: ['共生森林', '营地平原'], scoutNeed: 80, desc: '森林边缘，荧光苔藓铺满地面。菌须兽在树下啃食落果。', neighbors: ['camp', 'forest_heart'], enemies: [enemy({ name: '菌须兽', power: 2, loot: { FOOD: 1 }, organ: G.O.leaf_lung, maxPop: 8 }), enemy({ name: '林地鼬', power: 2, loot: { FOOD: 1 }, maxPop: 6 })] }))
reg(loc({ id: 'forest_heart', name: '林心', eco: '共生森林', scoutNeed: 95, desc: '森林深处，巨树的根系是活的。树冠兽在上方静静凝视。', neighbors: ['forest_edge', 'vine_pit'], enemies: [enemy({ name: '树冠兽', power: 3, loot: { FOOD: 1, WATER: 1 }, organ: G.O.bark_skin, maxPop: 7 }), enemy({ name: '花冠鹿', power: 3, loot: { FOOD: 2 }, organ: G.O.flower_crown, maxPop: 5 })], seasonal: { 0: sea({ name: '翠冠鹿群', power: 3, loot: { FOOD: 2, DATA: 1 }, organ: G.O.jade_leaf, maxPop: 6 }) } }))
reg(loc({ id: 'vine_pit', name: '藤蔓深坑', eco: '共生森林', scoutNeed: 120, desc: '深坑中盘根错节。捕藤兽用触手等待猎物坠落。', neighbors: ['forest_heart', 'lake_shore'], enemies: [enemy({ name: '捕藤兽', power: 4, loot: { FOOD: 1, MATERIALS: 1 }, organ: G.O.vine_tendril, maxPop: 6 }), enemy({ name: '毒刺藤兽', power: 4, loot: { FOOD: 1, MATERIALS: 1 }, maxPop: 4 })] }))
reg(loc({ id: 'lake_shore', name: '湖岸浅滩', eco: ['甲烷湖泽', '共生森林'], scoutNeed: 75, desc: '甲烷湖的浅滩。湖沼巨螯潜伏在水下，只露出一对螯尖。', neighbors: ['camp', 'vine_pit', 'reed_marsh'], enemies: [enemy({ name: '湖沼巨螯', power: 3, loot: { FOOD: 1, WATER: 1 }, organ: G.O.water_lung, maxPop: 7 }), enemy({ name: '浅滩蟹', power: 2, loot: { FOOD: 1 }, maxPop: 6 })] }))
reg(loc({ id: 'reed_marsh', name: '芦苇雾沼', eco: '甲烷湖泽', scoutNeed: 105, desc: '芦苇丛生，雾气缭绕。雾隐蛙的叫声像沉闷的心跳。', neighbors: ['lake_shore', 'lake_deep', 'ruins_plaza'], enemies: [enemy({ name: '雾隐蛙', power: 3, loot: { FOOD: 1, DATA: 1 }, organ: G.O.sonar_sac, maxPop: 7 }), enemy({ name: '沼泽巨蚺', power: 4, loot: { FOOD: 1 }, maxPop: 4 })], seasonal: { 2: sea({ name: '狂躁蛙群', power: 5, loot: { FOOD: 2, DATA: 1 }, organ: G.O.venom_sac, maxPop: 5 }) } }))
reg(loc({ id: 'lake_deep', name: '湖水深处', eco: '甲烷湖泽', scoutNeed: 125, require: 'aqua', desc: '湖水的幽暗深处。渊鲛的影子一掠而过，带起一串气泡。（需研究水下呼吸）', neighbors: ['reed_marsh'], enemies: [enemy({ name: '渊鲛', power: 5, loot: { FOOD: 1, WATER: 2 }, organ: G.O.deep_gill, maxPop: 5 }), enemy({ name: '湖渊巨鲨', power: 6, loot: { FOOD: 1, WATER: 1 }, organ: G.O.lake_shark_gill, maxPop: 3 })], seasonal: { 3: sea({ name: '冰渊鲛', power: 6, loot: { WATER: 2, DATA: 1 }, organ: G.O.ice_gill, maxPop: 3 }), 1: sea({ name: '沸鳞鱼群', power: 5, loot: { FOOD: 1, WATER: 1 }, organ: G.O.boil_scale, maxPop: 4 }) } }))
reg(loc({ id: 'ruins_plaza', name: '废墟广场', eco: '远古遗迹', scoutNeed: 85, desc: '广场上竖立着活的石柱，缓慢起伏。遗迹甲卫来回巡逻。', neighbors: ['reed_marsh', 'ruins_hall'], enemies: [enemy({ name: '遗迹甲卫', power: 5, loot: { MATERIALS: 2 }, organ: G.O.shell_spine, maxPop: 5 }), enemy({ name: '石像守卫', power: 5, loot: { MATERIALS: 2 }, maxPop: 4 })] }))
reg(loc({ id: 'ruins_hall', name: '地底回廊', eco: '远古遗迹', scoutNeed: 110, desc: '地底回廊的墙壁渗出黏液。回廊食骸在阴影中咀嚼。', neighbors: ['ruins_plaza', 'cave_entrance'], enemies: [enemy({ name: '回廊食骸', power: 6, loot: { FOOD: 1, MATERIALS: 2 }, organ: G.O.bone_molar, maxPop: 3 }), enemy({ name: '浮雕傀儡', power: 5, loot: { MATERIALS: 1, DATA: 1 }, maxPop: 3 })] }))
reg(loc({ id: 'cave_entrance', name: '洞口', eco: ['幽深洞窟', '远古遗迹'], scoutNeed: 90, desc: '洞口的岩石在呼吸。洞穴爬行者的酸液气味刺鼻。', neighbors: ['ruins_hall', 'crystal_hall'], enemies: [enemy({ name: '洞穴爬行者', power: 4, loot: { FOOD: 1, WATER: 1, MATERIALS: 2 }, organ: G.O.acid_gland, maxPop: 6 }), enemy({ name: '穴居蝠', power: 3, loot: { DATA: 1 }, maxPop: 6 })] }))
reg(loc({ id: 'crystal_hall', name: '晶辉洞厅', eco: '幽深洞窟', scoutNeed: 115, desc: '巨大的晶簇散发着磷光。晶辉蜥的瞳孔映出你的倒影。', neighbors: ['cave_entrance', 'geo_spring'], enemies: [enemy({ name: '晶辉蜥', power: 5, loot: { MATERIALS: 1, DATA: 2 }, organ: G.O.crystal_eye, maxPop: 5 }), enemy({ name: '晶甲虫', power: 3, loot: { MATERIALS: 1, DATA: 1 }, maxPop: 6 })], seasonal: { 2: sea({ name: '暴走晶兽', power: 6, loot: { MATERIALS: 2, DATA: 1 }, organ: G.O.rage_crystal, maxPop: 3 }) } }))
reg(loc({ id: 'geo_spring', name: '硫磺热泉', eco: '地热裂谷', scoutNeed: 75, desc: '滚烫的硫磺热泉咕嘟作响。熔壳兽趴在泉边取暖。', neighbors: ['crystal_hall', 'geo_heart', 'glacier_pass'], overnight: { energyBonus: 3 }, enemies: [enemy({ name: '熔壳兽', power: 5, loot: { FOOD: 1, WATER: 1, MATERIALS: 1, DATA: 1 }, organ: G.O.heat_gland, maxPop: 5 }), enemy({ name: '硫磺蜥', power: 4, loot: { MATERIALS: 1, DATA: 1 }, maxPop: 4 })] }))
reg(loc({ id: 'geo_heart', name: '地心脉动', eco: '地热裂谷', scoutNeed: 95, desc: '地脉在这里搏动。脉动石蟒缠绕着发光的岩心。', neighbors: ['geo_spring', 'vein_nest'], enemies: [enemy({ name: '脉动石蟒', power: 7, loot: { FOOD: 1, MATERIALS: 2, DATA: 1 }, organ: G.O.geo_marrow, maxPop: 3 }), enemy({ name: '岩浆巨蠕', power: 6, loot: { MATERIALS: 2, FOOD: 1 }, maxPop: 3 })] }))
reg(loc({ id: 'vein_nest', name: '核心室', eco: '地脉核心', scoutNeed: 125, require: 'dig', desc: '星球的心脏，位于地底深处。地脉核心母体盘踞于此，整片大地都是它的身体。（需研究地底探索）', neighbors: ['geo_heart'], enemies: [enemy({ name: '地脉核心母体', power: 8, loot: { FOOD: 2, WATER: 1, MATERIALS: 2, DATA: 1 }, core: true, maxPop: 1 })] }))
reg(loc({ id: 'glacier_pass', name: '冰川垭口', eco: ['极高山脉', '冰封冻野'], scoutNeed: 100, desc: '垭口的风像刀。雪崖枭在冰壁上筑巢，俯瞰着两条下山的道路。', neighbors: ['geo_spring', 'summit', 'frozen_wilds'], enemies: [enemy({ name: '雪崖枭', power: 5, loot: { FOOD: 1, DATA: 1 }, organ: G.O.wing_membrane, maxPop: 5 }), enemy({ name: '高山雪羊', power: 4, loot: { FOOD: 1, MATERIALS: 1 }, organ: G.O.snow_wool, maxPop: 5 })] }))
reg(loc({ id: 'summit', name: '山巅', eco: '极高山脉', scoutNeed: 85, desc: '山巅之上，世界在脚下铺展。山顶掠食者在悬崖边徘徊。', neighbors: ['glacier_pass', 'salt_plain'], enemies: [enemy({ name: '山顶掠食者', power: 6, loot: { FOOD: 2, WATER: 1, MATERIALS: 1 }, organ: G.O.regen_gland, maxPop: 4 }), enemy({ name: '巨翼秃鹫', power: 6, loot: { FOOD: 2 }, maxPop: 3 })] }))
reg(loc({ id: 'frozen_wilds', name: '冰封荒原', eco: '冰封冻野', scoutNeed: 110, desc: '永冻荒原，寒风剥蚀一切热量。冻原巨獠在暴雪中游荡。', neighbors: ['glacier_pass', 'bone_mound'], overnight: { waterCost: 1, lifeDamage: 10 }, enemies: [enemy({ name: '冻原巨獠', power: 6, loot: { FOOD: 2, MATERIALS: 1, DATA: 1 }, organ: G.O.fat_layer, maxPop: 4 }), enemy({ name: '冰原狼', power: 5, loot: { FOOD: 1, MATERIALS: 1 }, maxPop: 4 })], seasonal: { 3: sea({ name: '霜牙兽', power: 7, loot: { FOOD: 2, MATERIALS: 2 }, organ: G.O.frost_fang, maxPop: 3 }) } }))
reg(loc({ id: 'salt_plain', name: '盐晶平原', eco: ['盐晶荒原', '极高山脉'], scoutNeed: 90, desc: '白色盐晶平原，干燥得连空气都会吸走你的水分。', neighbors: ['summit', 'salt_canyon'], overnight: { waterCost: 1 }, enemies: [enemy({ name: '盐晶收割者', power: 5, loot: { MATERIALS: 3 }, organ: G.O.salt_gland, maxPop: 5 }), enemy({ name: '盐甲兽', power: 4, loot: { MATERIALS: 2 }, organ: G.O.salt_armor, maxPop: 4 })], seasonal: { 1: sea({ name: '盐晶领主', power: 7, loot: { MATERIALS: 3, DATA: 1 }, organ: G.O.salt_marrow, maxPop: 3 }) } }))
reg(loc({ id: 'salt_canyon', name: '盐晶谷', eco: '盐晶荒原', scoutNeed: 115, desc: '盐晶峡谷深处，盐鳞秃鹫在岩壁上投下巨大的阴影。', neighbors: ['salt_plain', 'bone_mound'], enemies: [enemy({ name: '盐鳞秃鹫', power: 6, loot: { FOOD: 1, MATERIALS: 2 }, organ: G.O.salt_plume, maxPop: 4 }), enemy({ name: '晶翼鹰', power: 5, loot: { DATA: 1, MATERIALS: 1 }, maxPop: 4 })] }))
reg(loc({ id: 'bone_mound', name: '骨丘', eco: ['巨兽坟场', '冰封冻野'], scoutNeed: 105, desc: '巨兽骸骨堆成的丘陵。腐骨吞噬者拖着骨尾游走。', neighbors: ['salt_canyon', 'frozen_wilds', 'bone_sea'], enemies: [enemy({ name: '腐骨吞噬者', power: 7, loot: { FOOD: 1, MATERIALS: 2, DATA: 1 }, organ: G.O.bone_stomach, maxPop: 3 }), enemy({ name: '白骨兽', power: 5, loot: { MATERIALS: 1, DATA: 1 }, maxPop: 3 })] }))
reg(loc({ id: 'bone_sea', name: '骸骨之海', eco: '巨兽坟场', scoutNeed: 125, desc: '骸骨的海洋，世界的尽头。骨海龙鳗在骨浪中翻涌。', neighbors: ['bone_mound'], enemies: [enemy({ name: '骨海龙鳗', power: 8, loot: { FOOD: 2, MATERIALS: 2, DATA: 1 }, organ: G.O.eel_spine, maxPop: 1 })] }))

// ===== 深部新区：围绕营地外环 =====
reg(loc({ id: 'spore_edge', name: '孢子林缘', eco: '孢子雨林', scoutNeed: 85, desc: '雨林边缘，发光的孢子囊在菌毯上起伏。孢兔在丛间跳跃。', neighbors: ['camp', 'spore_heart'], enemies: [enemy({ name: '孢兔', power: 2, loot: { FOOD: 1 }, organ: G.O.spore_gland, maxPop: 8 }), enemy({ name: '毒菇兽', power: 3, loot: { FOOD: 1, MATERIALS: 1 }, maxPop: 5 })] }))
reg(loc({ id: 'spore_heart', name: '雨林深处', eco: '孢子雨林', scoutNeed: 105, desc: '雨林深处菌丝遮天。菌猎手在菌盖间无声游走。', neighbors: ['spore_edge', 'spore_canopy'], enemies: [enemy({ name: '菌猎手', power: 5, loot: { FOOD: 1, MATERIALS: 1 }, organ: G.O.spore_muscle, maxPop: 5 }), enemy({ name: '孢子蟒', power: 6, loot: { FOOD: 1, MATERIALS: 1 }, organ: G.O.spore_venom, maxPop: 3 })] }))
reg(loc({ id: 'spore_canopy', name: '菌冠层', eco: '孢子雨林', scoutNeed: 125, require: 'flight', desc: '百米高的菌冠层，冠巢鹰在菌伞间滑翔。菌甲巨兽沉睡于此。（需研究飞行）', neighbors: ['spore_heart'], enemies: [enemy({ name: '冠巢鹰', power: 6, loot: { FOOD: 1, DATA: 1 }, organ: G.O.spore_wing, maxPop: 4 }), enemy({ name: '菌甲巨兽', power: 8, loot: { FOOD: 2, MATERIALS: 2 }, organ: G.O.spore_core, maxPop: 1 })] }))
reg(loc({ id: 'tide_shore', name: '潮汐滩涂', eco: '暗潮海岸', scoutNeed: 90, desc: '潮水反复冲刷的滩涂。潮汐蟹挥舞巨螯迎接浪花。', neighbors: ['camp', 'reef_flat'], enemies: [enemy({ name: '潮汐蟹', power: 3, loot: { FOOD: 1, WATER: 1 }, organ: G.O.tide_claw, maxPop: 7 }), enemy({ name: '滩涂兽', power: 4, loot: { FOOD: 1 }, maxPop: 5 })] }))
reg(loc({ id: 'reef_flat', name: '暗礁浅海', eco: '暗潮海岸', scoutNeed: 110, desc: '浅海中礁石林立。礁石鱼穿梭其间，暗潮水母随浪漂荡。', neighbors: ['tide_shore', 'abyss_shelf'], enemies: [enemy({ name: '礁石鱼', power: 4, loot: { FOOD: 1, WATER: 1 }, organ: G.O.reef_gill, maxPop: 6 }), enemy({ name: '暗潮水母', power: 5, loot: { MATERIALS: 1, DATA: 1 }, organ: G.O.jelly_venom, maxPop: 4 })] }))
reg(loc({ id: 'abyss_shelf', name: '深渊海架', eco: '暗潮海岸', scoutNeed: 125, require: 'aqua', desc: '大陆架的尽头，海水漆黑如墨。古潮领主在深渊中沉睡。（需研究水下呼吸）', neighbors: ['reef_flat'], enemies: [enemy({ name: '深渊海蜥', power: 7, loot: { FOOD: 1, WATER: 2 }, organ: G.O.abyss_gland, maxPop: 3 }), enemy({ name: '古潮领主', power: 8, loot: { FOOD: 2, WATER: 2 }, organ: G.O.tide_heart, maxPop: 1 })] }))
reg(loc({ id: 'wind_pass', name: '风蚀隘口', eco: '风蚀峡谷', scoutNeed: 95, desc: '隘口的风像刀片。风翼蜥贴着岩壁滑翔。', neighbors: ['camp', 'canyon_bottom'], enemies: [enemy({ name: '风翼蜥', power: 4, loot: { FOOD: 1, DATA: 1 }, organ: G.O.wind_lung, maxPop: 6 }), enemy({ name: '岩背兽', power: 3, loot: { MATERIALS: 2 }, organ: G.O.chest_armor, maxPop: 5 })] }))
reg(loc({ id: 'canyon_bottom', name: '谷底', eco: '风蚀峡谷', scoutNeed: 115, desc: '峡谷谷底阴冷潮湿。峡谷巨蜥的尾巴扫过碎石。', neighbors: ['wind_pass', 'mesa_top'], enemies: [enemy({ name: '峡谷巨蜥', power: 6, loot: { FOOD: 1, MATERIALS: 2 }, organ: G.O.canyon_scales, maxPop: 4 }), enemy({ name: '风刃蝠', power: 5, loot: { MATERIALS: 1, DATA: 1 }, organ: G.O.blade_wing, maxPop: 5 })] }))
reg(loc({ id: 'mesa_top', name: '台地', eco: '风蚀峡谷', scoutNeed: 120, desc: '风蚀台地之上，台地枭俯瞰整片峡谷。雷暴天兽在雷云下咆哮。', neighbors: ['canyon_bottom'], enemies: [enemy({ name: '台地枭', power: 6, loot: { FOOD: 1, DATA: 2 }, organ: G.O.mesa_eye, maxPop: 4 }), enemy({ name: '雷暴天兽', power: 8, loot: { FOOD: 2, MATERIALS: 2, DATA: 1 }, organ: G.O.storm_core, maxPop: 1 })] }))
reg(loc({ id: 'mag_field', name: '磁场旷野', eco: '磁力高原', scoutNeed: 100, desc: '旷野上的碎石被磁力吸成奇特的塔。磁甲兽缓慢爬行。', neighbors: ['forest_edge', 'iron_peak'], enemies: [enemy({ name: '磁甲兽', power: 4, loot: { MATERIALS: 2 }, organ: G.O.magnet_armor, maxPop: 5 }), enemy({ name: '铁刺蛇', power: 3, loot: { MATERIALS: 1, DATA: 1 }, organ: G.O.iron_fang, maxPop: 5 })] }))
reg(loc({ id: 'iron_peak', name: '磁铁峰', eco: '磁力高原', scoutNeed: 115, desc: '整座山峰都是磁铁矿。铁冠兽在峰顶角斗。', neighbors: ['mag_field', 'levi_valley'], enemies: [enemy({ name: '铁冠兽', power: 6, loot: { FOOD: 1, MATERIALS: 2 }, organ: G.O.iron_horn, maxPop: 4 }), enemy({ name: '磁暴狮', power: 7, loot: { FOOD: 1, MATERIALS: 2 }, organ: G.O.magnet_mane, maxPop: 3 })] }))
reg(loc({ id: 'levi_valley', name: '悬浮谷', eco: '磁力高原', scoutNeed: 125, require: 'flight', desc: '磁场让岩石悬浮半空。浮空晶主静卧在最大的浮岩上。（需研究飞行）', neighbors: ['iron_peak'], enemies: [enemy({ name: '浮空晶主', power: 8, loot: { MATERIALS: 2, DATA: 2 }, organ: G.O.levitation_core, maxPop: 1 })] }))
reg(loc({ id: 'corrupt_bog', name: '腐化泥沼', eco: '腐化泥沼', scoutNeed: 90, desc: '泥沼咕嘟冒泡，腐沼蛙的叫声回荡。毒沼蜥潜伏泥中。', neighbors: ['reed_marsh', 'venom_lake'], enemies: [enemy({ name: '腐沼蛙', power: 3, loot: { FOOD: 1, MATERIALS: 1 }, organ: G.O.bog_bladder, maxPop: 7 }), enemy({ name: '毒沼蜥', power: 4, loot: { FOOD: 1, MATERIALS: 1 }, organ: G.O.toxic_gland, maxPop: 4 })] }))
reg(loc({ id: 'venom_lake', name: '毒液湖', eco: '腐化泥沼', scoutNeed: 110, desc: '湖水泛着诡异的绿光。毒液蛇在水面滑行。', neighbors: ['corrupt_bog', 'decay_wood'], enemies: [enemy({ name: '毒液蛇', power: 5, loot: { FOOD: 1, DATA: 1 }, organ: G.O.venom_heart, maxPop: 4 }), enemy({ name: '毒甲巨龟', power: 6, loot: { MATERIALS: 2 }, organ: G.O.poison_shell, maxPop: 3 })] }))
reg(loc({ id: 'decay_wood', name: '朽林', eco: '腐化泥沼', scoutNeed: 125, desc: '枯死的朽林里，朽木君王缓慢穿行，周身散发着腐臭。', neighbors: ['venom_lake'], enemies: [enemy({ name: '朽木君王', power: 8, loot: { FOOD: 2, MATERIALS: 2 }, organ: G.O.decay_core, maxPop: 1 })] }))
reg(loc({ id: 'starry_field', name: '星陨旷野', eco: ['星空高原', '极高山脉'], scoutNeed: 80, desc: '旷野布满陨石坑。星尘鼠在坑边啃食发光碎屑。', neighbors: ['glacier_pass', 'crater_lake'], enemies: [enemy({ name: '星尘鼠', power: 2, loot: { FOOD: 1, DATA: 1 }, organ: G.O.star_eye, maxPop: 8 }), enemy({ name: '陨晶兽', power: 4, loot: { MATERIALS: 2, DATA: 1 }, organ: G.O.meteor_shard, maxPop: 4 })] }))
reg(loc({ id: 'crater_lake', name: '陨坑湖', eco: '星空高原', scoutNeed: 105, desc: '巨大的陨坑中积满湖水。陨水兽在水下潜游。', neighbors: ['starry_field', 'star_peak'], enemies: [enemy({ name: '陨水兽', power: 5, loot: { FOOD: 1, WATER: 1 }, organ: G.O.crater_gill, maxPop: 5 }), enemy({ name: '星核蜥', power: 6, loot: { FOOD: 1, MATERIALS: 1, DATA: 1 }, organ: G.O.star_core, maxPop: 3 })] }))
reg(loc({ id: 'star_peak', name: '观星峰', eco: '星空高原', scoutNeed: 120, require: 'flight', desc: '群山之巅，触手可及的星空。星冠巨兽守望此地千年。（需研究飞行）', neighbors: ['crater_lake'], enemies: [enemy({ name: '星冠巨兽', power: 8, loot: { FOOD: 2, MATERIALS: 2, DATA: 1 }, organ: G.O.star_crown, maxPop: 1 })] }))
reg(loc({ id: 'lava_rim', name: '熔岩边缘', eco: ['熔岩深渊', '地热裂谷'], scoutNeed: 95, desc: '地热裂谷的尽头，熔岩在脚下翻涌。熔岩蜥贴壁而行。', neighbors: ['geo_spring', 'magma_river'], enemies: [enemy({ name: '熔岩蜥', power: 6, loot: { FOOD: 1, MATERIALS: 1 }, organ: G.O.lava_gland, maxPop: 4 }), enemy({ name: '灰烬兽', power: 5, loot: { MATERIALS: 1, DATA: 1 }, organ: G.O.ash_lung, maxPop: 4 })] }))
reg(loc({ id: 'magma_river', name: '岩浆河', eco: '熔岩深渊', scoutNeed: 115, desc: '炽热的岩浆河奔流。岩浆巨蟒在河中翻搅。', neighbors: ['lava_rim', 'obsidian_hall'], enemies: [enemy({ name: '岩浆巨蟒', power: 7, loot: { FOOD: 1, MATERIALS: 2 }, organ: G.O.magma_vein, maxPop: 3 }), enemy({ name: '火晶兽', power: 6, loot: { MATERIALS: 2, DATA: 1 }, organ: G.O.fire_crystal, maxPop: 3 })] }))
reg(loc({ id: 'obsidian_hall', name: '黑曜殿堂', eco: '熔岩深渊', scoutNeed: 125, require: 'dig', desc: '地底深处的黑曜石柱殿堂。黑曜石魔端坐于熔岩王座。（需研究地底探索）', neighbors: ['magma_river'], enemies: [enemy({ name: '黑曜石魔', power: 9, loot: { FOOD: 2, MATERIALS: 2, DATA: 2 }, organ: G.O.obsidian_core, maxPop: 1 })] }))
reg(loc({ id: 'dune_sea', name: '沙海', eco: '遗忘荒漠', scoutNeed: 85, desc: '一望无际的沙海。沙蝎在沙丘间巡游，沙海巨蠕潜伏地下。', neighbors: ['camp', 'oasis_wreck'], enemies: [enemy({ name: '沙蝎', power: 4, loot: { FOOD: 1, MATERIALS: 1 }, organ: G.O.sand_stinger, maxPop: 6 }), enemy({ name: '沙海巨蠕', power: 5, loot: { FOOD: 1, MATERIALS: 1 }, organ: G.O.sand_mandible, maxPop: 4 })] }))
reg(loc({ id: 'oasis_wreck', name: '绿洲废墟', eco: '遗忘荒漠', scoutNeed: 105, desc: '干涸绿洲旁的古文明废墟。废墟秃鹫在残柱上歇息。', neighbors: ['dune_sea', 'lost_tomb'], enemies: [enemy({ name: '废墟秃鹫', power: 5, loot: { FOOD: 1, DATA: 1 }, organ: G.O.desert_eye, maxPop: 5 }), enemy({ name: '沙魇兽', power: 6, loot: { MATERIALS: 2, DATA: 1 }, organ: G.O.mirage_gland, maxPop: 3 })] }))
reg(loc({ id: 'lost_tomb', name: '失落陵墓', eco: '遗忘荒漠', scoutNeed: 125, require: 'dig', desc: '地下的巨大陵墓，千年的风沙掩埋了入口。墓穴巨像的脚步声震落尘土。（需研究地底探索）', neighbors: ['oasis_wreck'], enemies: [enemy({ name: '墓穴巨像', power: 9, loot: { FOOD: 2, MATERIALS: 2, DATA: 1 }, organ: G.O.tomb_marrow, maxPop: 1 })] }))

// ---- 超级生物（流星事件）：远超极难的顶级精英，出现 5 天后消失 ----
// 生态超级生物手写行动脚本：部分为两种不同属性 dot（各一次），部分为同一属性 dot 在多个行动回合执行（层数高）
const ECO_SUPER_PATTERNS = {
  '荒原巨蟒': [{ type: 'attack', atk: 13 }, { type: 'dot', element: 'poison', amount: 7 }, { type: 'heavy', atk: 16 }, { type: 'attack', atk: 13 }, { type: 'dot', element: 'poison', amount: 5 }, { type: 'buff', amount: 1 }],
  '古森树王': [{ type: 'heavy', atk: 16 }, { type: 'attack', atk: 13 }, { type: 'dot', element: 'poison', amount: 7 }, { type: 'attack', atk: 13 }, { type: 'dot', element: 'poison', amount: 5 }, { type: 'heal', amount: 4 }],
  '深渊古鳄': [{ type: 'heavy', atk: 17 }, { type: 'attack', atk: 13 }, { type: 'dot', element: 'water', amount: 5 }, { type: 'attack', atk: 13 }, { type: 'dot', element: 'poison', amount: 5 }, { type: 'shield', amount: 3 }],
  '石像泰坦': [{ type: 'heavy', atk: 17 }, { type: 'shield', amount: 4 }, { type: 'dot', element: 'fire', amount: 5 }, { type: 'attack', atk: 13 }, { type: 'dot', element: 'fire', amount: 4 }, { type: 'heavy', atk: 16 }],
  '洞窟龙蟒': [{ type: 'attack', atk: 13 }, { type: 'dot', element: 'fire', amount: 5 }, { type: 'heavy', atk: 16 }, { type: 'attack', atk: 13 }, { type: 'dot', element: 'fire', amount: 4 }, { type: 'buff', amount: 1 }],
  '地心炎魔': [{ type: 'dot', element: 'fire', amount: 6 }, { type: 'attack', atk: 13 }, { type: 'heavy', atk: 16 }, { type: 'attack', atk: 13 }, { type: 'dot', element: 'poison', amount: 5 }, { type: 'buff', amount: 1 }],
  '地脉祖龙': [{ type: 'heavy', atk: 17 }, { type: 'dot', element: 'fire', amount: 5 }, { type: 'attack', atk: 14 }, { type: 'dot', element: 'fire', amount: 4 }, { type: 'shield', amount: 4 }, { type: 'attack', atk: 14 }],
  '雪山巨枭': [{ type: 'multi', atk: 8, hits: 2 }, { type: 'attack', atk: 14 }, { type: 'dot', element: 'water', amount: 5 }, { type: 'heavy', atk: 16 }, { type: 'attack', atk: 14 }, { type: 'dot', element: 'lightning', amount: 3 }],
  '冰原巨兽': [{ type: 'heavy', atk: 17 }, { type: 'attack', atk: 14 }, { type: 'dot', element: 'water', amount: 5 }, { type: 'attack', atk: 14 }, { type: 'dot', element: 'water', amount: 4 }, { type: 'buff', amount: 1 }],
  '盐晶巨像': [{ type: 'heavy', atk: 17 }, { type: 'shield', amount: 4 }, { type: 'attack', atk: 13 }, { type: 'dot', element: 'water', amount: 4 }, { type: 'heavy', atk: 16 }, { type: 'attack', atk: 13 }],
  '骸骨君王': [{ type: 'attack', atk: 13 }, { type: 'dot', element: 'poison', amount: 7 }, { type: 'heal', amount: 4 }, { type: 'heavy', atk: 16 }, { type: 'attack', atk: 13 }, { type: 'dot', element: 'poison', amount: 5 }],
  '菌母古树': [{ type: 'dot', element: 'poison', amount: 8 }, { type: 'attack', atk: 13 }, { type: 'heavy', atk: 16 }, { type: 'attack', atk: 13 }, { type: 'dot', element: 'water', amount: 4 }, { type: 'heal', amount: 4 }],
  '深渊海龙': [{ type: 'multi', atk: 8, hits: 2 }, { type: 'attack', atk: 14 }, { type: 'dot', element: 'water', amount: 5 }, { type: 'heavy', atk: 16 }, { type: 'attack', atk: 14 }, { type: 'dot', element: 'water', amount: 4 }],
  '风暴巨鹰': [{ type: 'multi', atk: 9, hits: 2 }, { type: 'attack', atk: 13 }, { type: 'dot', element: 'lightning', amount: 3 }, { type: 'heavy', atk: 16 }, { type: 'attack', atk: 13 }, { type: 'dot', element: 'water', amount: 4 }],
  '磁山巨兽': [{ type: 'heavy', atk: 17 }, { type: 'attack', atk: 13 }, { type: 'dot', element: 'lightning', amount: 3 }, { type: 'shield', amount: 4 }, { type: 'attack', atk: 13 }, { type: 'dot', element: 'fire', amount: 4 }],
  '腐沼巨鳄': [{ type: 'dot', element: 'poison', amount: 8 }, { type: 'attack', atk: 13 }, { type: 'heavy', atk: 16 }, { type: 'attack', atk: 13 }, { type: 'dot', element: 'poison', amount: 7 }, { type: 'buff', amount: 1 }],
  '星穹巨兽': [{ type: 'multi', atk: 8, hits: 2 }, { type: 'attack', atk: 14 }, { type: 'dot', element: 'lightning', amount: 3 }, { type: 'heavy', atk: 16 }, { type: 'attack', atk: 14 }, { type: 'dot', element: 'water', amount: 4 }],
  '熔岩古龙': [{ type: 'dot', element: 'fire', amount: 6 }, { type: 'attack', atk: 13 }, { type: 'heavy', atk: 17 }, { type: 'attack', atk: 13 }, { type: 'dot', element: 'poison', amount: 5 }, { type: 'buff', amount: 1 }],
  '沙漠蠕王': [{ type: 'attack', atk: 13 }, { type: 'dot', element: 'poison', amount: 7 }, { type: 'heavy', atk: 16 }, { type: 'attack', atk: 13 }, { type: 'dot', element: 'poison', amount: 5 }, { type: 'shield', amount: 3 }],
}

function superCreature(name, power, desc, loot, ability, pattern, organ, hpMult) {
  const e = enemy({ name, power, loot, maxPop: 1, ability, organ, super: true })
  e.desc = desc
  e.super = true
  e.hpMult = hpMult || 1.25 // 超级生物：比极难更肉
  e.archetype = 'super'
  e.archetypeName = '超级'
  // 生态超级生物用手写双 dot 脚本；流星超级生物显式传入脚本
  e.pattern = pattern || ECO_SUPER_PATTERNS[name] || e.pattern
  return e
}
G.SUPER_CREATURES = [
  superCreature('流星巨兽', 15, '随流星坠落的远古巨兽，浑身燃烧着星辰之火，每一次践踏都带着天火。', { FOOD: 5, WATER: 5, MATERIALS: 6, DATA: 8 }, ['enrage', 'thorns'],
    [
      { type: 'heavy', atk: 19 },
      { type: 'dot', element: 'fire', amount: 6 },
      { type: 'heavy', atk: 17 },
      { type: 'dot', element: 'fire', amount: 4 },
      { type: 'buff', amount: 2 },
      { type: 'attack', atk: 17 },
    ], G.O.meteor_heart, 1.35),
  superCreature('陨星暴君', 16, '驾驭陨星残骸的暴虐霸主，每一下都带着撕裂大地的星震之力。', { FOOD: 6, MATERIALS: 7, DATA: 9 }, ['multi', 'lifesteal'],
    [
      { type: 'multi', atk: 12, hits: 2 },
      { type: 'dot', element: 'lightning', amount: 3 },
      { type: 'attack', atk: 18 },
      { type: 'dot', element: 'lightning', amount: 3 },
      { type: 'multi', atk: 9, hits: 3 },
      { type: 'heavy', atk: 20 },
    ], G.O.tyrant_spine, 1.35),
  superCreature('星核巨龙', 17, '吞下整颗星核的巨龙，鳞甲坚不可摧，龙息如星潮般压制万物。', { FOOD: 6, WATER: 6, MATERIALS: 7, DATA: 10 }, ['armor', 'regen', 'lockdown'],
    [
      { type: 'heavy', atk: 21 },
      { type: 'dot', element: 'water', amount: 6 },
      { type: 'shield', amount: 4 },
      { type: 'dot', element: 'poison', amount: 5 },
      { type: 'buff', amount: 2 },
      { type: 'attack', atk: 19 },
    ], G.O.dragon_core, 1.35),
]

// ---- 事件战斗敌人 ----
G.EVENT_ENEMIES = {
  bone_wraith: enemy({ name: '骸骨游魂', power: 7, loot: { FOOD: 1, MATERIALS: 2, DATA: 1 }, maxPop: 1, ability: ['lifesteal'], dotElement: 'poison' }),
}

// ---- 剧情线索：初次击败对应生物时检索到一段线索日志（底部"剧情线索"图鉴） ----
G.ECO_EVENTS = {
  '营地平原': [
    { id: 'trader', name: '流浪商人', chance: 2, text: '你遇到了一位流浪商人！他愿意用稀有材料交换菌丝块。', choices: [
      { label: '🤝 交易', text: '用 2 菌丝块换 1 份稀有材料。', cost: { fungus: 2 }, result: { mat: 1 } },
      { label: '🚶 转身离开', text: '不打扰商人。', result: {} },
    ] },
    { id: 'old_campfire', name: '旧营火遗迹', chance: 1, text: '你发现了一处旧营火遗迹，余温尚存，耐力 +2。' },
  ],
  '共生森林': [
    { id: 'glow_mush', name: '荧光菇潮', chance: 3, text: '荧光苔藓一夜疯长，铺满了整片林地。', choices: [
      { label: '🍄 全部采撷', text: '收获满满，但菇潮就此耗尽。', result: { fungus: 4 } },
      { label: '🌱 只采一半', text: '菌丝块 +2，留下菇潮持续生长。', result: { fungus: 2 } },
    ] },
    { id: 'treant_whisper', name: '古树回响', chance: 2, text: '古树的年轮传来远古的低语，星之记忆 +2。' },
    { id: 'vine_trap', name: '藤蔓陷阱', chance: 2, text: '你误触了捕藤兽的陷阱，藤蔓骤然收紧！', choices: [
      { label: '🔪 割断藤蔓', text: '花 5 时间挣脱，顺手扯下纤维。', result: { time: 5, fiber: 1 } },
      { label: '💪 强行挣脱', text: '力量判定（≥6）：成功脱身，失败被缠更紧。', check: { attr: 'str', value: 6, win: {}, lose: { time: 15, life: -3 } } },
    ] },
  ],
  '甲烷湖泽': [
    { id: 'methane_geyser', name: '甲烷喷泉', chance: 2, text: '湖面喷出甲烷喷泉，冷却后凝结成燧石 +1。' },
    { id: 'reed_labyrinth', name: '芦苇迷踪', chance: 2, text: '芦苇迷宫让你迷了路（损失 5 时间），但发现了纤维 +1。' },
  ],
  '远古遗迹': [
    { id: 'stone_tablet', name: '石板刻印', chance: 2, text: '你破译了一面远古石板，星之记忆 +3。' },
    { id: 'ancient_trap', name: '机关陷阱', chance: 2, text: '你触发了古老机关，生命 -5。' },
  ],
  '幽深洞窟': [
    { id: 'crystal_reso', name: '水晶共鸣', chance: 2, text: '磷光水晶发出共鸣，仿佛在回应你的思绪。', choices: [
      { label: '🙏 静心共鸣', text: '与水晶共鸣，星之记忆 +2，但水晶随之碎裂。', result: { data: 2 } },
      { label: '💎 敲下一块', text: '取下水晶碎片，获得燧石 +1。', result: { stone: 1 } },
    ] },
    { id: 'cave_collapse', name: '洞窟塌方', chance: 1, text: '洞窟塌方封住了去路，损失 15 时间。' },
  ],
  '地热裂谷': [
    { id: 'sulfur_fume', name: '硫磺毒雾', chance: 2, text: '地热裂谷喷出刺鼻的硫磺毒雾，拦住了去路。', choices: [
      { label: '🫁 屏息强闯', text: '硬闯毒雾：生命 -5，但发现裸露的硫磺矿脉。', result: { life: -5, stone: 2 } },
      { label: '⏳ 等待散去', text: '原地等待，损失 15 时间后安全通过。', result: { time: 15 } },
    ] },
    { id: 'geo_warmth', name: '地热暖流', chance: 2, text: '地热滋养全身，耐力 +3。' },
  ],
  '极高山脉': [
    { id: 'avalanche', name: '雪崩惊魂', chance: 2, text: '积雪轰然崩塌，裹挟着碎石向你冲来！', choices: [
      { label: '🏃 全速冲过', text: '敏捷判定（≥6）：成功穿越雪崩，失败被埋受创。', check: { attr: 'agi', value: 6, win: {}, lose: { life: -4, stamina: -2, time: 10 } } },
      { label: '🔄 绕道而行', text: '绕开雪崩区域，多花 15 时间。', result: { time: 15 } },
    ] },
  ],
  '冰封冻野': [
    { id: 'aurora_crystal', name: '极光结晶', chance: 2, text: '极光下凝结出星尘结晶，星之记忆 +3。' },
  ],
  '盐晶荒原': [
    { id: 'salt_storm', name: '盐晶风暴', chance: 3, text: '盐晶风暴呼啸而过，你收集到盐水 +3。' },
    { id: 'salt_ebb', name: '盐潮回流', chance: 2, text: '盐潮退去露出矿脉，你拾到金属 +1。' },
  ],
  '巨兽坟场': [
    { id: 'bone_wraith', name: '骸骨游魂', chance: 2, text: '沉睡的骸骨突然苏醒，向你扑来！', choices: [
      { label: '⚔ 迎战', text: '与骸骨游魂决一死战。', battle: 'bone_wraith' },
      { label: '🏃 逃离', text: '避开游魂，损失 10 时间。', result: { time: 10 } },
    ] },
    { id: 'bone_dust', name: '骨粉磷光', chance: 2, text: '你收集到发光的骨粉，获得骸骨 +1。' },
  ],
  '孢子雨林': [
    { id: 'spore_infect', name: '孢子迷障', chance: 2, text: '你吸入了迷障孢子！接下来 3 天每日生命 -2。' },
    { id: 'symbiote_nest', name: '共生菌巢', chance: 2, text: '你发现一个共生菌巢，菌丝块 +3。' },
  ],
  '暗潮海岸': [
    { id: 'tide_vortex', name: '潮汐漩涡', chance: 2, text: '海面卷起漩涡，隐约可见沉船残骸的冷光。', choices: [
      { label: '🏊 潜入漩涡', text: '敏捷判定（≥7）：成功捞到宝藏，失败被卷入海中。', check: { attr: 'agi', value: 7, win: { metal: 2, data: 1 }, lose: { time: 15, life: -5 } } },
      { label: '↩ 绕开漩涡', text: '安全第一，继续赶路。', result: {} },
    ] },
    { id: 'glow_tide', name: '荧光潮汐', chance: 3, text: '荧光海藻随潮漂上岸，你收集到盐水 +3。' },
  ],
  '风蚀峡谷': [
    { id: 'wind_rune', name: '风蚀刻文', chance: 2, text: '风化石碑上的刻文讲述远古历史，星之记忆 +2。' },
  ],
  '磁力高原': [
    { id: 'magnet_drift', name: '磁场紊乱', chance: 2, text: '磁场紊乱让你迷失方向，损失 10 时间。' },
    { id: 'magnet_scrap', name: '磁吸碎屑', chance: 3, text: '磁力吸附了散落的金属碎屑，金属 +2。' },
  ],
  '星空高原': [
    { id: 'crater_echo', name: '陨坑回响', chance: 2, text: '陨坑深处传来奇异的回响，星之记忆 +3。' },
  ],
  '腐化泥沼': [
    { id: 'corrupt_geyser', name: '腐泉涌毒', chance: 2, text: '毒泉喷涌而出，水洼泛起诡异绿光，你小心收集到盐水 +2。' },
    { id: 'rot_wood', name: '朽木低语', chance: 2, text: '朽木树洞中渗出久远的记忆，星之记忆 +2。' },
  ],
  '熔岩深渊': [
    { id: 'lava_crystal', name: '熔岩结晶', chance: 2, text: '冷却的岩浆中嵌着发光晶体，你拾获燧石 +1 与星之记忆 +2。' },
    { id: 'ash_vein', name: '灰烬矿脉', chance: 2, text: '灰烬之下露出金属矿脉，金属残片 +2。' },
  ],
  '遗忘荒漠': [
    { id: 'quicksand', name: '流沙陷阱', chance: 2, text: '你陷入流沙，损失 10 时间与 3 点生命！' },
  ],
}

// ---- 生态超级生物（对应生态区的顶级精英，0.5% 概率，掉落各自专属顶级器官） ----
G.ECO_SUPER_CREATURES = (function () {
  const defs = [
    ['营地平原', '荒原巨蟒', '盘踞营地下方的远古巨蟒，鳞片泛着金属寒光。', { FOOD: 5, WATER: 4, MATERIALS: 6, DATA: 8 }, ['armor', 'lifesteal'], G.O.waste_snake_hide],
    ['共生森林', '古森树王', '活了千年的巨树之王，根系覆盖整片森林。', { FOOD: 6, MATERIALS: 6, DATA: 8 }, ['regen', 'thorns'], G.O.forest_tree_heart],
    ['甲烷湖泽', '深渊古鳄', '潜伏在甲烷湖底的远古巨鳄，一口能吞下整群鱼。', { FOOD: 5, WATER: 5, MATERIALS: 5, DATA: 7 }, ['armor', 'enrage'], G.O.bog_croc_fang],
    ['远古遗迹', '石像泰坦', '从远古神殿苏醒的石像巨人，一锤震裂大地。', { MATERIALS: 8, DATA: 8 }, ['armor', 'thorns'], G.O.relic_titan_core],
    ['幽深洞窟', '洞窟龙蟒', '盘踞洞穴深处的巨蟒，双眼如熔岩般发亮。', { FOOD: 4, MATERIALS: 6, DATA: 8 }, ['lockdown', 'enrage'], G.O.cave_drake_scale],
    ['地热裂谷', '地心炎魔', '从地心裂缝爬出的炎魔，浑身流淌着岩浆。', { FOOD: 4, MATERIALS: 6, DATA: 8 }, ['enrage', 'regen'], G.O.heat_demon_core],
    ['地脉核心', '地脉祖龙', '地脉的化身，整个星球都是它的血脉。', { FOOD: 6, MATERIALS: 7, DATA: 10 }, ['armor', 'regen', 'enrage'], G.O.vein_dragon_bone],
    ['极高山脉', '雪山巨枭', '盘踞山巅的巨枭，双翼扇动便是暴风雪。', { FOOD: 5, MATERIALS: 5, DATA: 9 }, ['multi', 'lockdown'], G.O.snow_owl_eye],
    ['冰封冻野', '冰原巨兽', '在永冻荒原上行走的庞然大物，寒气逼人。', { FOOD: 6, MATERIALS: 6, DATA: 8 }, ['armor', 'lifesteal'], G.O.tundra_beast_heart],
    ['盐晶荒原', '盐晶巨像', '由纯净盐晶构成的巨像，反射着刺眼的白光。', { MATERIALS: 8, DATA: 8 }, ['armor', 'thorns'], G.O.salt_golem_core],
    ['巨兽坟场', '骸骨君王', '统御无数骸骨的君王，王座由巨兽颅骨堆成。', { FOOD: 5, MATERIALS: 8, DATA: 8 }, ['lifesteal', 'enrage'], G.O.bone_king_marrow],
    ['孢子雨林', '菌母古树', '孕育整片孢子雨林的菌母，根须缠绕一切。', { FOOD: 8, MATERIALS: 5, DATA: 8 }, ['regen', 'poison'], G.O.spore_mother_heart],
    ['暗潮海岸', '深渊海龙', '在深渊海架盘旋的海龙，潮汐随它呼吸。', { FOOD: 5, WATER: 6, MATERIALS: 6, DATA: 9 }, ['multi', 'lifesteal'], G.O.abyss_sea_dragon_gill],
    ['风蚀峡谷', '风暴巨鹰', '翼展遮蔽峡谷的巨鹰，卷起狂风。', { FOOD: 5, MATERIALS: 6, DATA: 8 }, ['multi', 'lockdown'], G.O.storm_eagle_wing],
    ['磁力高原', '磁山巨兽', '全身被磁铁矿包裹的巨兽，行走时大地震颤。', { MATERIALS: 9, DATA: 7 }, ['armor', 'enrage'], G.O.magnet_mountain_core],
    ['腐化泥沼', '腐沼巨鳄', '腐沼最深处的巨鳄，周身缠绕着毒气。', { FOOD: 6, MATERIALS: 6, DATA: 7 }, ['poison', 'regen'], G.O.swamp_croc_stomach],
    ['星空高原', '星穹巨兽', '吞噬星辰之光的巨兽，背部闪烁银河。', { FOOD: 5, MATERIALS: 6, DATA: 10 }, ['multi', 'armor'], G.O.star_vault_core],
    ['熔岩深渊', '熔岩古龙', '沉眠于熔岩中的古龙，苏醒即地动山摇。', { FOOD: 6, MATERIALS: 7, DATA: 9 }, ['enrage', 'thorns'], G.O.lava_dragon_heart],
    ['遗忘荒漠', '沙漠蠕王', '在沙海下巡游的巨蠕，掀起沙尘蔽日。', { FOOD: 5, MATERIALS: 7, DATA: 8 }, ['regen', 'lockdown'], G.O.desert_wyrm_scale],
  ]
  const out = {}
  defs.forEach((d, i) => {
    out[d[0]] = superCreature(d[1], 13 + (i % 3), d[2], d[3], d[4], null, d[5])
  })
  return out
})()

// 全量超级生物列表（流星事件 + 生态事件），带来源标签
G.ALL_SUPER_CREATURES = (function () {
  const list = []
  for (const sc of G.SUPER_CREATURES) list.push(Object.assign({}, sc, { source: '流星事件' }))
  for (const eco in G.ECO_SUPER_CREATURES) {
    list.push(Object.assign({}, G.ECO_SUPER_CREATURES[eco], { source: '生态·' + eco }))
  }
  return list
})()

// ---- 地区气候（季节联动） ----
