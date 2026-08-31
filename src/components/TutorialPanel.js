/* 教程弹窗：Tab 分类 + 左侧词条标签 + 右侧玩法说明（底部操作栏入口打开） */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.TutorialPanel = {
  template: `
    <div v-if="ui.modal === 'tutorial'" class="modal-overlay">
      <div class="modal-box tut-box">
        <div class="modal-head">
          <h3>生存教程</h3>
          <button class="btn cancel modal-close" @click="closeModal">关闭</button>
        </div>
        <div class="tut-tabs">
          <button
            v-for="t in tabs"
            :key="t.key"
            class="tut-tab"
            :class="{ on: curTab === t.key }"
            @click="switchTab(t.key)"
          >{{ t.name }}</button>
        </div>
        <div class="tut-body">
          <div class="tut-nav">
            <button
              v-for="e in entries"
              :key="e.key"
              class="tut-tag"
              :class="{ on: curEntry === e.key }"
              @click="curEntry = e.key"
            >{{ e.name }}</button>
          </div>
          <div class="tut-content">
            <div class="tut-art" v-if="entry">
              <h4>{{ entry.name }}</h4>
              <p>{{ entry.text }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const S = window.GAME.store
    const { ref, computed } = Vue
    const tabs = [
      { key: 'survival', name: '生存' },
      { key: 'explore', name: '探索' },
      { key: 'battle', name: '战斗' },
      { key: 'organ', name: '器官' },
      { key: 'develop', name: '发展' },
    ]
    const DATA = {
      survival: [
        { key: 'time', name: '时间与行动', text: '每天有 100 点时间，行动会消耗时间与耐力，时间归零便进入下一天。常见消耗：探索 10、移动 30、休息 40、制作 10、研究 60、战斗 40。' },
        { key: 'life', name: '生命与伤势', text: '生命归零即死亡。每日结束时若饥饿或饥渴为 0，会各损失生命（饥 -10 / 渴 -15）；流血伤口每日 -8 生命，需用止血绷带处理。' },
        { key: 'stamina', name: '耐力与精神', text: '耐力是所有行动的燃料（上限 10），探索与战斗都会消耗，休息可恢复 4 点；研究「能量回路」可提升上限。精神每日缓慢下降，低于 25 会持续掉血，休息或战斗胜利可回升。' },
        { key: 'carry', name: '负重与拾取', text: '负重上限 = 20 + 力量×3。超重时无法拾取地面物品与进食。研究「远行」每级提升 5 点负重上限。' },
        { key: 'feed', name: '进食与饮水', text: '点击状态栏的「进食 / 饮水」或背包道具即可使用。菌丝块补充饥饿、盐水补充饥渴，随时保持储备，以应对季节的额外消耗。' },
      ],
      explore: [
        { key: 'scout', name: '探索与勘探', text: '点击「探索」消耗 10 时间与 1 耐力，推进当前地点勘探进度（每次 +5）。进度分 4 阶段，累计 100 点解锁全部路口与地点卡。' },
        { key: 'encounter', name: '遭遇战斗', text: '若地点仍有怪物且未清空，探索时有 25% 概率惊动敌人进入战斗。战斗失败只会士气 -8 并撤退，恢复后可以再战。' },
        { key: 'harvest', name: '采集点', text: '地点卡上的产出点有库存上限（通常 3 份），每日按各自速度恢复：食物 / 水较快、材料中等、研究类最慢。采完后过几天再来即可。' },
        { key: 'material', name: '材料获取', text: '材料主要有三个来源：①采集点——每个生态区的地点卡上都有对应产出点（如共生森林的树脂瘤、地热裂谷的硫磺结晶），探索即可采集；②生物掉落——击败生物会掉落当前生态区的材料（主要材料 + 辅助材料），品质越高稀有度越高；③配方合成——金属锭 / 纤维布 / 木板等加工材料需在「制作」面板用原料合成。每个生态区拥有 1 种主要材料与 1-3 种辅助材料（例：共生森林的主材料「共生木芯」，辅助材料树脂 / 纤维 / 兽皮），生物掉落与生态配方都围绕它展开。「图鉴」可查询各生态区的材料构成，「制作」面板按生态分类，调试者可一键全解锁。' },
        { key: 'map', name: '地图与路口', text: '「地图」展示网状地形，路口需勘探解锁才能通行。深海 / 悬空 / 地底等特殊区域，需先研究「水下呼吸 / 飞行 / 地底探索」。' },
        { key: 'season', name: '季节与事件', text: '每 20 天换一次季节：燥热 / 冷寂期每日额外消耗 1 份水；冷寂期没有抗寒器官（熔壳热腺等）会损失生命。每天还有 30% 概率触发随机事件。' },
        { key: 'meteor', name: '特殊事件', text: '探索会触发各种特殊事件：①地图专属事件（概率 1-3%，如荧光菇潮、石板刻印、雪崩、流沙等，仅在对应生态区出现）；②生态超级生物事件（0.5%，每个生态区对应一只顶级超级生物）；③全图流星事件（0.1%）。超级生物出现 5 天后消失，需在地点卡上手动挑战，击败可获得丰厚战利品与顶级器官。图鉴单列「超级生物」类别可查询。' },
      ],
      battle: [
        { key: 'flow', name: '战斗流程', text: '卡牌对战制：每回合获得 2 点能量（上限 5），从牌库抽牌，打出攻击 / 防御 / 蓄能牌。初始手牌 4 张，上限 7 张，牌库打空后重洗。' },
        { key: 'energy', name: '能量与格挡', text: '打出卡牌需要能量。防御牌提供格挡，格挡可抵消攻击伤害（毒伤除外）。能量不足时可用「深呼吸」等蓄能牌补充。' },
        { key: 'card', name: '机能卡', text: '移植战斗型器官后，其机能卡会加入牌库，多为「造成伤害 + 施加元素状态」的组合，也有护盾 / 蓄力卡。研究 / 恢复类器官是共生器官，只提供被动效果，不进战斗。' },
        { key: 'element', name: '元素状态', text: '元素各有独特机制：🔥灼烧每层持续 3 回合、每回合 1 点伤害；☠️剧毒每回合造成层数伤害后层数 -2（衰减）；❄️冰封不衰减不伤害，层数超过敌人生命时立即处决；🍃风袭达到 8 层清零并额外获得一个行动回合（单次施加少）；⚡雷击每回合造成层数伤害、不衰减（上限 8 层，单次施加少）；💧水蚀每层使敌人攻击 -1，随后层数 -1；🧪腐蚀每回合造成层数伤害、会不断蔓延（上限 8 层）。' },
        { key: 'enemy', name: '敌人行动', text: '怪物有 6 种原型风格，各有专属行动脚本循环执行：均衡型（常规攻防）、元素型（dot 侵袭，不可闪避）、重装型（血量 ×1.5 + 沉重打击）、迅捷型（连续多段攻击）、堡垒型（每回合临时护盾）、狂暴型（越打越猛，叠加攻击）。战前会展示下一步意图，dot 伤害不可闪避、不可格挡。' },
        { key: 'loot', name: '战利品与器官', text: '胜利可获得食物 / 水 / 星之记忆 / 材料并提升士气，尸体上还能采集器官（10 时间）。失败则士气 -8，负伤撤退。' },
      ],
      organ: [
        { key: 'get', name: '器官获取', text: '击败怪物后可采集其器官（10 时间），存入器官背包。每种器官来自特定异星生物，效果各不相同，图鉴可查询来源。' },
        { key: 'transplant', name: '移植与槽位', text: '「躯体」面板进行移植：肢体槽（右臂 / 左臂 / 右腿 / 眼）与内脏槽（腺体 / 肺 / 胃 / 心脏 / 神经 / 脑等）随存活天数解锁。移植消耗菌丝块 + 星之记忆 + 50 时间，替换会卸下旧器官。' },
        { key: 'active', name: '机能卡 vs 被动', text: '战斗型器官提供机能卡进入牌库；共生器官（研究 / 恢复类技能）则改为被动，按日产出食物 / 水 / 耐力 / 星之记忆。' },
        { key: 'maint', name: '维持与排斥', text: '每个移植器官每日消耗耐力维持；耐力不足时，维持消耗最高的器官会被排斥切除。研究「器官共鸣」可使总维持 -1。' },
        { key: 'passive', name: '被动加成', text: '共生器官的被动还附带属性加成（力量 / 敏捷 / 体质 / 智力），部分器官按每 N 天周期集中产出。不同被动组合可形成独特的生存流派。' },
      ],
      develop: [
        { key: 'research', name: '研究系统', text: '「研究」面板中，生物研究消耗 60 时间获得星之记忆（基础 1 点，受智力与「洞察」加成）。星之记忆用于购买研究升级：强化细胞、能量回路、肌肉强化、深度休息等。' },
        { key: 'craft', name: '制作工艺', text: '「制作」面板消耗材料合成道具与装备，每次 10 时间。配方按生态分类（通用 / 各生态区），烹饪 / 冶炼 / 纺织等高级配方需先完成对应研究解锁。材料的采集与掉落来源见「探索」→「材料获取」。' },
        { key: 'build', name: '核心与建筑', text: '击败带核心的节点怪物可获得核心，孵化成活体建筑。用菌丝块喂养可进化至 5 阶段，阶段越高产出越多（菌丝块 / 盐水 / 星之记忆），3 阶后还可移动位置。' },
        { key: 'ability', name: '特殊能力', text: '每个角色拥有独特能力（战意强化 / 灵感研究加成 / 急救 / 潮汐回复），使用后需冷却 5-10 天，注意规划使用时机。' },
        { key: 'book', name: '图鉴与存档', text: '「图鉴」记录已发现的地点、怪物、器官与物品，方便查询来源与用途。游戏自动存档，主菜单支持多存档与导出 / 导入。' },
      ],
    }
    const curTab = ref('survival')
    const curEntry = ref(DATA.survival[0].key)
    const entries = computed(() => DATA[curTab.value])
    const entry = computed(() => entries.value.find((e) => e.key === curEntry.value) || entries.value[0])
    function switchTab(key) {
      curTab.value = key
      curEntry.value = DATA[key][0].key
    }
    return {
      ui: S.ui,
      closeModal: S.closeModal,
      tabs,
      entries,
      entry,
      curTab,
      curEntry,
      switchTab,
    }
  },
}
