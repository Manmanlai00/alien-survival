/* 负面状态详情：状态栏图标点击打开，展示 debuff 数据、治疗物品及其材料来源生态 */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.DiseaseModal = {
  template: `
    <div v-if="ui.modal === 'disease'" class="modal-overlay">
      <div class="modal-box disease-box">
        <div class="modal-head">
          <h3>{{ status.icon }} {{ status.name }}</h3>
          <span v-if="status.forever" class="modal-sub">永久性状态 · 需用药治愈</span>
          <span v-else-if="status.days" class="modal-sub">剩余 {{ status.days }} 天</span>
          <button class="btn cancel modal-close" @click="closeModal">关闭</button>
        </div>
        <div class="disease-desc">{{ status.desc }}</div>
        <div class="disease-row">
          <span class="disease-row-label">效果</span>
          <div class="disease-row-body">
            <span v-for="(l, i) in status.effects" :key="i" class="disease-tag">{{ l }}</span>
          </div>
        </div>
        <div class="disease-row">
          <span class="disease-row-label">治疗</span>
          <div class="disease-row-body">
            <div v-if="status.cures.length" v-for="c in status.cures" :key="c.id" class="cure-item">
              <div class="cure-head">
                <span class="cure-name">🧪 {{ c.name }}</span>
                <span v-if="c.recipe" class="cure-recipe">{{ c.recipe }}</span>
              </div>
              <div class="cure-mats">
                <div v-for="m in c.mats" :key="m.id" class="cure-mat">
                  <span class="cure-mat-name">{{ m.name }}</span>
                  <span v-if="m.ecos.length" class="cure-ecos">来自：{{ m.ecos.join(' / ') }}</span>
                </div>
                <div v-if="!c.mats.length" class="cure-mat-none">来源：探索采集或战斗获取</div>
              </div>
            </div>
            <span v-if="status.noCure" class="cure-name">{{ status.noCure }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const S = window.GAME.store
    const D = window.GAME.data
    const { computed } = Vue
    const C = D.C
    // 材料 → 来源生态映射：由各生态探索采集点（harvest 产出）汇总
    const ECO_OF = (function () {
      const m = {}
      for (const eco in D.REGION_ITEMS) {
        for (const it of D.REGION_ITEMS[eco] || []) {
          if (it.harvest && it.harvest.item) {
            const arr = (m[it.harvest.item] = m[it.harvest.item] || [])
            if (!arr.includes(eco)) arr.push(eco)
          }
        }
      }
      return m
    })()
    // 物品的合成配方（取第一个能合成的配方）
    function recipeOf(itemId) {
      return (D.RECIPES || []).find((r) => r.out && r.out[itemId]) || null
    }
    // 治疗物品详情：配方 + 各材料来源生态
    function cureDetail(itemId) {
      const item = D.ITEMS[itemId]
      const r = recipeOf(itemId)
      const mats = (r ? Object.keys(r.in) : []).map((mid) => {
        const def = D.ITEMS[mid]
        return { id: mid, name: def ? def.name : mid, ecos: ECO_OF[mid] || [] }
      })
      return { id: itemId, name: item ? item.name : itemId, recipe: r ? r.desc : null, mats }
    }
    // 当前查看的负面状态详情
    const status = computed(() => {
      const key = S.ui.statusKey
      if (key === 'bleeding') {
        return {
          icon: '🩹', name: '流血', days: null,
          desc: '伤口没有包扎，血液持续流失。',
          effects: [`每日生命 -${C.BLEED_DAMAGE}`],
          cures: [cureDetail('bandage')],
          noCure: null,
        }
      }
      if (key === 'morale') {
        return {
          icon: '💢', name: '精神崩溃', days: null,
          desc: '精神濒临崩溃，身心俱疲，加速消耗生命。',
          effects: [`每日生命 -${C.MORALE_LOW_DAMAGE}`],
          cures: [],
          noCure: '休息 / 进食高精神食物：进食、饮水、睡觉都能恢复精神',
        }
      }
      const d = D.DISEASES[key]
      if (!d) return { icon: '⚠', name: '未知状态', days: null, desc: '', effects: [], cures: [], noCure: '' }
      // 每日效果文案（复用扣减表数据格式）
      function fmtDaily(daily) {
        const p = []
        if (daily.life) p.push(`生命 -${daily.life}`)
        if (daily.stamina) p.push(`耐力 -${daily.stamina}`)
        if (daily.thirst) p.push(`水分 -${daily.thirst}`)
        return p.join('、')
      }
      const left = S.player.diseases[key] || 0
      // 当前阶段：普通病按剩余天数匹配（越拖越重）；永久病固定 daily
      let curDaily = d.daily || {}
      let curLabel = ''
      if (!d.forever) {
        for (const s of d.stages || []) {
          if (left >= s.min) { curDaily = s.daily; curLabel = s.label; break }
        }
      }
      const effects = []
      if (d.forever) effects.push(`每日${fmtDaily(curDaily)}`)
      else if (curLabel) effects.push(`当前阶段（${curLabel}）：每日${fmtDaily(curDaily)}`)
      else effects.push(`每日${fmtDaily(curDaily)}`)
      // 阶段预览（普通病逐日恶化）
      if (!d.forever && d.stages && d.stages.length) {
        effects.push('阶段：' + d.stages.map((s) => `${s.label}（每日${fmtDaily(s.daily)}）`).join(' → '))
      }
      return {
        icon: d.icon, name: d.name, days: d.forever ? null : left, forever: !!d.forever,
        desc: d.desc,
        effects,
        cures: (d.cures || []).map(cureDetail),
        noCure: null,
      }
    })
    return { ui: S.ui, status, closeModal: S.closeModal }
  },
}
