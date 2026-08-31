/* 剧情线索图鉴：初次击败生物时解锁的线索，按生态分组展示 */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.LoreModal = {
  template: `
    <div v-if="ui.modal === 'lore'" class="modal-overlay">
      <div class="modal-box lore-box">
        <div class="modal-head">
          <h3>脉动回声</h3>
          <span class="modal-sub">已收集 {{ loreCount }} / {{ loreTotal }} 条 · 初次击败生物即可解锁</span>
          <button class="btn cancel modal-close" @click="closeModal">关闭</button>
        </div>
        <div v-if="unlockedEndings.length" class="lore-endings">
          <div class="lore-group-title">已解锁结局（跨周目记录）</div>
          <div v-for="id in unlockedEndings" :key="id" class="lore-entry">
            <div class="lore-entry-head">
              <span class="lore-entry-title">{{ ENDINGS[id].icon }} 结局 · {{ ENDINGS[id].name }}</span>
            </div>
            <div class="lore-entry-text">{{ ENDINGS[id].text }}</div>
          </div>
        </div>
        <div v-if="collected.length === 0" class="lore-empty">
          尚未捕获任何脉动回声。<br />初次战胜不同的生物，将从它们的残骸上检索到关于这颗星球的秘密。
        </div>
        <div class="lore-list">
          <div v-if="storyUnlocked" class="lore-story">
            <div class="lore-story-title">{{ story.title }}</div>
            <div class="lore-story-sub">{{ story.subtitle }}</div>
            <div v-for="ch in story.chapters" :key="ch.t" class="lore-story-ch">
              <div class="lore-story-ch-title">{{ ch.t }}</div>
              <p v-for="(p, i) in ch.paras" :key="i" class="lore-story-p">{{ p }}</p>
            </div>
          </div>
          <div v-for="g in groups" :key="g.eco" class="lore-group">
            <div class="lore-group-title">{{ g.eco }}（{{ g.items.length }}）</div>
            <div v-for="it in g.items" :key="it.name" class="lore-entry">
              <div class="lore-entry-head">
                <span class="lore-entry-title">「{{ it.title }}」</span>
                <span class="lore-entry-name">—— {{ it.name }}</span>
              </div>
              <div class="lore-entry-text">{{ it.text }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const S = window.GAME.store
    const D = window.GAME.data
    const { computed } = Vue
    // 按星之记忆声明顺序收集已解锁线索
    const collected = computed(() => {
      const list = []
      for (const name in D.LORE) {
        if (S.world.lore[name]) {
          const l = D.LORE[name]
          list.push({ name, title: l.t, text: l.s })
        }
      }
      return list
    })
    const loreCount = computed(() => Object.keys(S.world.lore || {}).length)
    const loreTotal = computed(() => Object.keys(D.LORE).length)
    // 完整剧情：全部线索集齐后解锁
    const story = D.LORE_STORY
    const storyUnlocked = computed(() => story && loreTotal.value > 0 && loreCount.value >= loreTotal.value)
    // 已解锁结局（跨周目记录）
    const ENDINGS = D.ENDINGS
    const unlockedEndings = computed(() => (S.getEndings() || []).filter((id) => D.ENDINGS[id]))
    // 生物 → 生态分组
    const ECO_MAP = {
      '菌须兽': '共生森林', '林地鼬': '共生森林', '树冠兽': '共生森林', '花冠鹿': '共生森林', '翠冠鹿群': '共生森林', '捕藤兽': '共生森林', '毒刺藤兽': '共生森林',
      '湖沼巨螯': '甲烷湖泽', '浅滩蟹': '甲烷湖泽', '雾隐蛙': '甲烷湖泽', '沼泽巨蚺': '甲烷湖泽', '狂躁蛙群': '甲烷湖泽', '渊鲛': '甲烷湖泽', '湖渊巨鲨': '甲烷湖泽', '冰渊鲛': '甲烷湖泽', '沸鳞鱼群': '甲烷湖泽',
      '遗迹甲卫': '远古遗迹', '石像守卫': '远古遗迹', '回廊食骸': '远古遗迹', '浮雕傀儡': '远古遗迹',
      '洞穴爬行者': '幽深洞窟', '穴居蝠': '幽深洞窟', '晶辉蜥': '幽深洞窟', '晶甲虫': '幽深洞窟', '暴走晶兽': '幽深洞窟',
      '熔壳兽': '地热裂谷', '硫磺蜥': '地热裂谷', '脉动石蟒': '地热裂谷', '岩浆巨蠕': '地热裂谷', '地脉核心母体': '地脉核心',
      '雪崖枭': '极高山脉', '高山雪羊': '极高山脉', '山顶掠食者': '极高山脉', '巨翼秃鹫': '极高山脉',
      '冻原巨獠': '冰封冻野', '冰原狼': '冰封冻野', '霜牙兽': '冰封冻野',
      '盐晶收割者': '盐晶荒原', '盐甲兽': '盐晶荒原', '盐晶领主': '盐晶荒原', '盐鳞秃鹫': '盐晶荒原', '晶翼鹰': '盐晶荒原',
      '腐骨吞噬者': '巨兽坟场', '白骨兽': '巨兽坟场', '骨海龙鳗': '巨兽坟场',
      '孢兔': '孢子雨林', '毒菇兽': '孢子雨林', '菌猎手': '孢子雨林', '孢子蟒': '孢子雨林', '冠巢鹰': '孢子雨林', '菌甲巨兽': '孢子雨林',
      '潮汐蟹': '暗潮海岸', '滩涂兽': '暗潮海岸', '礁石鱼': '暗潮海岸', '暗潮水母': '暗潮海岸', '深渊海蜥': '暗潮海岸', '古潮领主': '暗潮海岸',
      '风翼蜥': '风蚀峡谷', '岩背兽': '风蚀峡谷', '峡谷巨蜥': '风蚀峡谷', '风刃蝠': '风蚀峡谷', '台地枭': '风蚀峡谷', '雷暴天兽': '风蚀峡谷',
      '磁甲兽': '磁力高原', '铁刺蛇': '磁力高原', '铁冠兽': '磁力高原', '磁暴狮': '磁力高原', '浮空晶主': '磁力高原',
      '腐沼蛙': '腐化泥沼', '毒沼蜥': '腐化泥沼', '毒液蛇': '腐化泥沼', '毒甲巨龟': '腐化泥沼', '朽木君王': '腐化泥沼',
      '星尘鼠': '星空高原', '陨晶兽': '星空高原', '陨水兽': '星空高原', '星核蜥': '星空高原', '星冠巨兽': '星空高原',
      '熔岩蜥': '熔岩深渊', '灰烬兽': '熔岩深渊', '岩浆巨蟒': '熔岩深渊', '火晶兽': '熔岩深渊', '黑曜石魔': '熔岩深渊',
      '沙蝎': '遗忘荒漠', '沙海巨蠕': '遗忘荒漠', '废墟秃鹫': '遗忘荒漠', '沙魇兽': '遗忘荒漠', '墓穴巨像': '遗忘荒漠',
      '骸骨游魂': '事件', '流星巨兽': '事件', '陨星暴君': '事件', '星核巨龙': '事件',
    }
    const ECO_ORDER = ['共生森林', '甲烷湖泽', '远古遗迹', '幽深洞窟', '地热裂谷', '地脉核心', '极高山脉', '冰封冻野', '盐晶荒原', '巨兽坟场', '孢子雨林', '暗潮海岸', '风蚀峡谷', '磁力高原', '腐化泥沼', '星空高原', '熔岩深渊', '遗忘荒漠', '事件']
    const groups = computed(() => {
      const map = {}
      for (const it of collected.value) {
        const eco = ECO_MAP[it.name] || '未知生态'
        ;(map[eco] = map[eco] || []).push(it)
      }
      return ECO_ORDER.filter((k) => map[k]).map((k) => ({ eco: k, items: map[k] })).concat(Object.keys(map).filter((k) => ECO_ORDER.indexOf(k) === -1).map((k) => ({ eco: k, items: map[k] })))
    })
    return {
      ui: S.ui,
      closeModal: S.closeModal,
      collected,
      loreCount,
      loreTotal,
      story,
      storyUnlocked,
      ENDINGS,
      unlockedEndings,
      groups,
    }
  },
}
