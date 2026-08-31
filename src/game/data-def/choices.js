/* 数据模块：choices（由 data.js 拆分，结构原样保留；可用 G.def 注册器继续叠加扩展） */
var G = window.GAME.data || (window.GAME.data = {})
G.CHOICES = {
  injured_baby: {
    title: '受伤的幼兽',
    text: '你在灌木丛里发现一只受伤的幼年生物，正瑟瑟发抖地望着你。',
    choices: [
      { label: '🩹 救治它', text: '消耗 1 份药草为它包扎，它可能会愿意跟随你。', cost: { herb: 1 }, tame: true, result: { morale: 3 } },
      { label: '🔪 就地取材', text: '带走它的血肉，作为储备口粮。', result: { fungus: 2 } },
      { label: '🚶 不打扰', text: '悄悄离开，让它自愈。', result: { morale: 1 } },
    ],
  },
  dark_cave: {
    title: '幽暗的洞穴',
    text: '暴雨冲刷出一个幽深洞穴，深处似乎有金属的冷光。',
    choices: [
      { label: '🕯 冒险深入', text: '敏捷判定（≥6）：成功获得金属与燧石，失败则迷路受创。', check: { attr: 'agi', value: 6, win: { metal: 2, stone: 2 }, lose: { life: -5, stamina: -2 } } },
      { label: '↩ 谨慎绕行', text: '安全第一，什么也不做。', result: {} },
    ],
  },
  caravan_wreck: {
    title: '沙暴中的残骸',
    text: '沙暴褪去，露出一截掩埋的金属残骸，隐约刻着陌生的星图。',
    choices: [
      { label: '🔍 仔细搜刮', text: '敏捷判定（≥7）：成功找到星之记忆与金属，失败触发残骸陷阱。', check: { attr: 'agi', value: 7, win: { data: 2, metal: 1 }, lose: { life: -6 } } },
      { label: '🔥 就地焚烧', text: '让残骸回归星球，心神安宁。', result: { morale: 4 } },
    ],
  },
  mist_flower: {
    title: '灵雾中的奇花',
    text: '灵雾深处有一株发光的奇异花朵，香气似有若无。',
    choices: [
      { label: '🌼 采撷它', text: '智力判定（≥7）：成功解析星之记忆，失败被花粉迷晕。', check: { attr: 'int', value: 7, win: { data: 3 }, lose: { stamina: -3, morale: -2 } } },
      { label: '🌱 任其生长', text: '留给未来的旅人。', result: {} },
    ],
  },
  abandoned_shelter: {
    title: '废弃的庇护所',
    text: '一座半塌的旧庇护所，墙壁刻着褪色的文字，角落散落着工具。',
    choices: [
      { label: '🔦 翻找工具', text: '智力判定（≥6）：成功找到金属与木材，失败沾染感染。', check: { attr: 'int', value: 6, win: { metal: 1, wood: 2 }, lose: { disease: 'infection' } } },
      { label: '🏕 稍作休整', text: '在此恢复精神与体力。', result: { stamina: 3, morale: 2 } },
    ],
  },
  living_whisper: {
    title: '大地的低语',
    text: '一阵微弱的脉动从地下传来，仿佛整颗星球在与你对话。',
    choices: [
      { label: '🙏 侧耳倾听', text: '它向你揭示一段被遗忘的记忆。', result: { lore: true } },
      { label: '😨 捂耳后退', text: '这声音让你毛骨悚然。', result: { morale: -2 } },
    ],
  },
}
