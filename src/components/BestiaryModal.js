/* 图鉴弹窗：按生态区查看地图点、地点卡与生物（随游玩解锁，调试者全解锁） */
/* 点击已解锁生物卡片可打开详情弹窗，展示攻击行为/行为效果/攻击属性/群落数量/恢复速度等全部星之记忆 */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.BestiaryModal = {
  template: `
    <div v-if="ui.modal === 'bestiary'" class="modal-overlay">
      <div class="modal-box bestiary-box">
        <div class="modal-head">
          <h3>星球图鉴</h3>
          <span class="modal-sub">生态 {{ ecoList.length }} · 物品 {{ itemUnlocked }}/{{ itemTotal }} · 生物 {{ enemyUnlocked }}/{{ enemyTotal }}</span>
          <button class="btn cancel modal-close" @click="closeModal">关闭</button>
        </div>
        <div class="cat-tabs">
          <button
            v-for="c in ecoList"
            :key="c"
            class="cat-tab"
            :class="{ on: curEcoNow === c }"
            @click="curEco = c"
          >{{ c }}</button>
          <button
            class="cat-tab"
            :class="{ on: curEcoNow === SUPER_KEY }"
            @click="curEco = SUPER_KEY"
          >超级生物</button>
        </div>
        <div v-if="curEcoNow" class="bestiary-body">
          <template v-if="curEcoNow !== SUPER_KEY">
          <div class="bs-sec">地图点</div>
          <div class="bs-locs">
            <div v-for="loc in ecoLocs" :key="loc.id" class="bs-loc" :class="{ locked: !locUnlocked(loc) }">
              <div class="bs-loc-name">{{ locUnlocked(loc) ? loc.name : '？？？' }}</div>
              <div class="bs-loc-enemies">
                <div
                  v-for="e in locEnemies(loc)"
                  :key="e.name"
                  class="bs-enemy"
                  :class="{ known: enemyKnown(e.name), clickable: enemyKnown(e.name) }"
                  :title="enemyKnown(e.name) ? '点击查看「' + e.name + '」详情' : ''"
                  @click="enemyKnown(e.name) && openDetail(e, loc)"
                >
                  <div class="bs-enemy-name">{{ enemyKnown(e.name) ? e.name + '（' + difficultyName(e.effectivePower || e.power) + '）' + (enemyExtinct(e, loc) ? ' · 已灭绝' : '') : '？？？' }}</div>
                  <div v-if="enemyKnown(e.name)" class="bs-enemy-sub">
                    {{ archetypeName(e) }} · 群落 {{ popText(e, loc) }}<span v-if="e.loot && e.loot[2]"> · <b class="rarity-text" :class="'rarity-' + materialRarity(e)">{{ materialRarity(e) }}</b>材料</span><span v-if="dropMain(e, loc)"> · 掉落 <b>{{ dropMain(e, loc) }}</b></span> · 点击详情
                  </div>
                  <div v-if="enemyKnown(e.name) && e.organ" class="bs-organ">
                    器官「{{ e.organ.name }}」（{{ e.organ.slotName }}）
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="bs-sec">地点卡</div>
          <div class="bs-items">
            <div v-for="it in ecoItems" :key="it.id" class="bs-item" :class="{ known: itemKnown(it.id) }">
              <span class="bs-item-name">{{ itemKnown(it.id) ? it.name : '？？？' }}</span>
              <span v-if="itemKnown(it.id)" class="bs-item-gain">{{ itemGain(it) }}</span>
            </div>
          </div>
          </template>
          <template v-else>
            <div class="bs-sec">超级生物（流星 / 生态事件降临，出现 5 天后消失）</div>
            <div class="bs-loc-enemies">
              <div
                v-for="sc in superList"
                :key="sc.name"
                class="bs-enemy"
                :class="{ known: enemyKnown(sc.name), clickable: enemyKnown(sc.name) }"
                :title="enemyKnown(sc.name) ? '点击查看「' + sc.name + '」详情' : ''"
                @click="enemyKnown(sc.name) && openDetail(sc, null)"
              >
                <div class="bs-enemy-name">{{ enemyKnown(sc.name) ? sc.name + '（' + difficultyName(sc.effectivePower || sc.power) + '）' : '？？？' }}</div>
                <div v-if="enemyKnown(sc.name)" class="bs-enemy-sub">{{ sc.source }}<span v-if="dropMain(sc, null)"> · 掉落 <b>{{ dropMain(sc, null) }}</b></span> · 点击详情</div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 生物详情弹窗（点击背景不关闭） -->
      <div v-if="detail" class="modal-overlay bestiary-detail">
        <div class="modal-box bestiary-detail-box">
          <div class="modal-head">
            <h3>{{ detail.enemy.name }}</h3>
            <button class="btn cancel modal-close" @click="detail = null">关闭</button>
          </div>
          <div class="bestiary-detail-body">
            <div v-if="detail.enemy.desc" class="bd-row bd-desc">{{ detail.enemy.desc }}</div>
            <div class="bd-row">难度：战力 {{ detail.enemy.power }}（{{ difficultyName(detail.enemy.effectivePower || detail.enemy.power) }}）· {{ archetypeName(detail.enemy) }}</div>
            <div class="bd-row">生命上限：{{ enemyHp(detail.enemy) }}（战力 {{ detail.enemy.effectivePower || detail.enemy.power }} × 8{{ detail.enemy.hpMult ? ' ×' + detail.enemy.hpMult + ' 高血量' : '' }}）</div>
            <div class="bd-row">原型特性：{{ enemyTraits(detail.enemy) }}</div>
            <div v-if="abiList(detail.enemy).length" class="bd-row">
              <div class="bd-label">特殊能力：</div>
              <div v-for="a in abiList(detail.enemy)" :key="a" class="bd-abi">{{ abiIcon(a) }} <b>{{ abiName(a) }}</b>：{{ abiDesc(a) }}</div>
            </div>
            <div class="bd-sec">行动脚本（每回合依次执行，循环）：</div>
            <ol class="bd-pattern">
              <li v-for="(it, i) in detail.enemy.pattern" :key="i">{{ intentText(it) }}</li>
            </ol>
            <div class="bd-sec">群落与恢复</div>
            <div class="bd-row">当前数量：{{ popText(detail.enemy, detail.loc) }}</div>
            <div class="bd-row">恢复速度：{{ recoverySpeedText(detail.enemy, detail.loc) }}</div>
            <div class="bd-row">出没：{{ seasonText(detail.enemy) }}</div>
            <div class="bd-sec">战利品与收获</div>
            <div class="bd-row">战利品：{{ lootText(detail.enemy) }}</div>
            <div v-if="detail.enemy.loot && detail.enemy.loot[2]" class="bd-row">材料品质：<b class="rarity-text" :class="'rarity-' + materialRarity(detail.enemy)">{{ materialRarity(detail.enemy) }}</b></div>
            <div v-if="ecoDropText(detail.enemy, detail.loc)" class="bd-row">生态掉落：{{ ecoDropText(detail.enemy, detail.loc) }}</div>
            <div v-if="detail.enemy.core" class="bd-row">✨ 持有星球核心：挑战可获得核心</div>
            <div v-if="detail.enemy.organ" class="bd-row">
              器官：<b>{{ detail.enemy.organ.name }}</b>（槽位：{{ detail.enemy.organ.slotName }}）— {{ organUseText(detail.enemy.organ) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const S = window.GAME.store
    const D = window.GAME.data
    const { computed, ref } = Vue
    const isDebug = computed(() => S.player.charId === 'debugger')
    const SUPER_KEY = '__super__'
    // 生态区列表（按地点定义顺序去重，支持一地点多群落）
    const ecoList = computed(() => {
      const seen = []
      for (const loc of Object.values(D.LOCATIONS)) {
        for (const k of loc.eco) if (seen.indexOf(k) === -1) seen.push(k)
      }
      return seen
    })
    const curEco = ref('')
    const curEcoNow = computed(() => {
      if (curEco.value === SUPER_KEY) return SUPER_KEY
      return (ecoList.value.indexOf(curEco.value) !== -1 ? curEco.value : (ecoList.value[0] || ''))
    })
    const superList = computed(() => D.ALL_SUPER_CREATURES || [])
    const ecoLocs = computed(() => Object.values(D.LOCATIONS).filter((l) => l.eco.indexOf(curEcoNow.value) !== -1))
    const ecoItems = computed(() => D.ecoPool(curEcoNow.value))
    function locEnemies(loc) {
      const list = (loc.enemies || []).slice()
      for (const k in (loc.seasonalEnemies || {})) {
        list.push(Object.assign({}, loc.seasonalEnemies[k], { _season: parseInt(k) }))
      }
      return list
    }
    const locUnlocked = (loc) => isDebug.value || !!S.world.discovered[loc.id]
    const enemyKnown = (n) => isDebug.value || !!S.world.bestiaryEnemies[n]
    const itemKnown = (id) => isDebug.value || !!S.world.bestiaryItems[id]
    function itemGain(it) {
      const parts = []
      if (it.harvest) parts.push((D.ITEMS[it.harvest.item] ? D.ITEMS[it.harvest.item].name : it.harvest.item) + ' ×' + it.harvest.amount)
      if (it.research) parts.push('研究星之记忆+' + it.research.data)
      return parts.join('／')
    }
    // 器官具体作用描述（机能卡 / 被动产出）
    function organUseText(o) {
      // 器官效果文本统一由数据层 def.organText 生成（被动/属性/机能/维持）
      return D.def.organText(o) || '移植后获得机能'
    }

    // ---- 生物详情 ----
    const detail = ref(null)
    function openDetail(e, loc) {
      detail.value = { enemy: e, loc }
    }
    function archetypeName(e) {
      return e.archetypeName || '均衡型'
    }
    function enemyHp(e) {
      return D.enemyMaxHp(e)
    }
    function enemyTraits(e) {
      const arr = []
      if (e.hpMult && e.hpMult > 1) arr.push(`高血量：生命 ×${e.hpMult}`)
      if (e.turnShield) arr.push(`每回合临时护盾 ${e.turnShield} 点`)
      if (e.archetype === 'elemental') arr.push('元素侵袭（dot 不可闪避）')
      return arr.length ? arr.join('；') : '无'
    }
    function abiList(e) {
      if (!e.ability) return []
      return Array.isArray(e.ability) ? e.ability.slice() : [e.ability]
    }
    const abiName = (a) => (D.ABILITY_INFO[a] ? D.ABILITY_INFO[a].name : a)
    const abiIcon = (a) => (D.ABILITY_INFO[a] ? D.ABILITY_INFO[a].icon : '✦')
    const abiDesc = (a) => (D.ABILITY_INFO[a] ? D.ABILITY_INFO[a].desc : '')
    function intentText(it) {
      const info = D.INTENT_INFO[it.type] || { name: it.type || '攻击' }
      if (it.type === 'dot') {
        const el = D.ELEMENT_INFO[it.element] || { name: it.element || '元素' }
        return `${info.name}：施加 ${it.amount} 层${el.name}（${el.desc}，不可闪避/格挡）`
      }
      if (it.type === 'multi') return `${info.name}：连续攻击 ${it.atk} 点 ×${it.hits} 次，合计约 ${it.atk * it.hits} 点伤害`
      if (it.type === 'buff') return `${info.name}：攻击力 +${it.amount}（累计上限 +5，永久持续）`
      if (it.type === 'shield') return `${info.name}：获得 ${it.amount} 点护盾，抵减你的下一次攻击`
      if (it.type === 'heal') return `${info.name}：恢复 ${it.amount} 点生命`
      if (it.type === 'feint') return `${info.name}：本回合蓄力，下一次攻击 +50% 且必定命中、不可格挡、不可闪避`
      return `${info.name}：造成 ${it.atk} 点伤害（可闪避/格挡）`
    }
    function popText(e, loc) {
      if (e.super) return '流星事件生物'
      if (!loc) return '—'
      const cur = loc.enemyPops[e.name] !== undefined ? loc.enemyPops[e.name] : e.maxPop
      if (e.maxPop <= 1 && cur <= 0) return '已灭绝（不会恢复）'
      return `${cur} / ${e.maxPop}`
    }
    // 极难生物（maxPop<=1 地点卡精英）是否已灭绝
    function enemyExtinct(e, loc) {
      if (!e || e.maxPop > 1 || !loc) return false
      const cur = loc.enemyPops[e.name] !== undefined ? loc.enemyPops[e.name] : e.maxPop
      return cur <= 0
    }
    function recoveryText() {
      const parts = []
      for (const k in D.C.POP_RECOVER) parts.push(`${D.SEASON_NAMES[k]}${D.C.POP_RECOVER[k]}%`)
      return `每日恢复概率：${parts.join('、')}`
    }
    // 极难生物（maxPop<=1）与超级生物固定数量、不会恢复，恢复速度显示为 0
    function recoverySpeedText(e, loc) {
      if (e.super) return '0（不会恢复）'
      if (e.maxPop <= 1) return enemyExtinct(e, loc) ? '已灭绝，不会恢复' : '0（不会恢复）'
      return recoveryText()
    }
    function seasonText(e) {
      if (e.super) return (e.source || '流星事件') + '降临（出现 5 天后消失）'
      if (e._season !== undefined) return `${D.SEASON_NAMES[e._season]}出没（季节生物）`
      return '全年出没'
    }
    function lootText(e) {
      const l = e.loot || {}
      const names = ['菌丝块', '盐水', '材料', '星之记忆']
      const parts = []
      for (const r of [0, 1, 2, 3]) if (l[r]) parts.push(`${names[r]}×${l[r]}`)
      return parts.join('、') || '无'
    }
    // 生物所在生态（普通生物取地点首个生态；生态超级生物按来源标签）
    function dropEco(e, loc) {
      let eco = loc && loc.eco && loc.eco.length ? loc.eco[0] : null
      if (!eco && e.super && e.source && e.source.indexOf('生态·') === 0) eco = e.source.replace('生态·', '')
      return eco
    }
    // 生态主材料名（卡片副标题用）
    function dropMain(e, loc) {
      const eco = dropEco(e, loc)
      const s = eco ? D.ECO_SERIES[eco] : null
      if (!s) return ''
      return D.ITEMS[s.main.id] ? D.ITEMS[s.main.id].name : s.main.name
    }
    // 生态掉落完整描述（详情弹窗用）：主材料（主要）／辅助材料（辅助）
    function ecoDropText(e, loc) {
      const eco = dropEco(e, loc)
      const s = eco ? D.ECO_SERIES[eco] : null
      if (!s) return ''
      const main = D.ITEMS[s.main.id] ? D.ITEMS[s.main.id].name : s.main.name
      const aux = s.aux.map((id) => (D.ITEMS[id] ? D.ITEMS[id].name : id)).join('、')
      return `${main}（主要）／${aux}（辅助）`
    }

    const itemTotal = Object.values(D.REGION_ITEMS).reduce((s, arr) => s + arr.length, 0)
    const enemyTotal = Object.values(D.LOCATIONS).reduce((s, l) => s + l.enemies.length + Object.keys(l.seasonalEnemies || {}).length, 0)
    const itemUnlocked = computed(() => Object.values(D.REGION_ITEMS).reduce((s, arr) => s + arr.filter((it) => itemKnown(it.id)).length, 0))
    const enemyUnlocked = computed(() => Object.values(D.LOCATIONS).reduce((s, l) => s + locEnemies(l).filter((e) => enemyKnown(e.name)).length, 0))
    return {
      ui: S.ui,
      closeModal: S.closeModal,
      ecoList,
      SUPER_KEY,
      superList,
      curEco,
      curEcoNow,
      ecoLocs,
      ecoItems,
      locEnemies,
      locUnlocked,
      enemyKnown,
      itemKnown,
      itemGain,
      organUseText,
      materialRarity: D.materialRarity,
      difficultyName: D.difficultyName,
      itemTotal,
      enemyTotal,
      itemUnlocked,
      enemyUnlocked,
      detail,
      openDetail,
      archetypeName,
      enemyHp,
      enemyTraits,
      abiList,
      abiName,
      abiIcon,
      abiDesc,
      intentText,
      popText,
      enemyExtinct,
      recoveryText,
      recoverySpeedText,
      seasonText,
      lootText,
      dropMain,
      ecoDropText,
    }
  },
}
