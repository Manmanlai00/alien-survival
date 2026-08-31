/* 躯体系统弹窗：人形槽位展示 + 器官背包 */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.BodyModal = {
  template: `
    <div v-if="ui.modal === 'body'" class="modal-overlay">
      <div class="modal-box body-modal">
        <div class="modal-head">
          <h3>躯体系统</h3>
          <span class="modal-sub">肢体 {{ getUnlockedLimb() }}/{{ LIMB_SLOT_MAX }} · 内部 {{ getUnlockedInternal() }}/{{ INTERNAL_SLOT_MAX }}</span>
          <button class="btn cancel modal-close" @click="closeModal">关闭</button>
        </div>
        <div class="body-layout">
          <!-- 人形躯干：仅肢体器官槽位 -->
          <div class="body-figure-wrap">
            <div class="body-figure">
              <div class="body-head"></div>
              <div class="body-arm left"></div>
              <div class="body-arm right"></div>
              <div class="body-torso"></div>
              <div class="body-leg left"></div>
              <div class="body-leg right"></div>
              <div
                v-for="s in limbSlots"
                :key="s.name"
                class="body-slot"
                :class="{ locked: s.locked, filled: s.organ, limb: s.type === 0 }"
                :style="slotPos(s.name)"
                :title="s.organ ? s.organ.name + '：' + s.organ.desc : s.name"
              >
                <span v-if="s.organ" class="slot-organ">{{ s.organ.name }}</span>
                <span v-else-if="s.locked" class="slot-lock">🔒</span>
                <span v-else class="slot-name">{{ s.name }}</span>
              </div>
            </div>
            <div class="figure-tip">点击器官移植到对应肢体</div>
          </div>
          <!-- 右侧：内脏器官面板 + 器官背包 -->
          <div class="body-right">
            <div class="visceral-panel">
              <div class="bag-title">内脏器官</div>
              <div class="visceral-list">
                <div
                  v-for="s in organSlots"
                  :key="s.name"
                  class="visceral-item"
                  :class="{ locked: s.locked, filled: s.organ }"
                  :title="s.organ ? s.organ.name + '：' + s.organ.desc : s.name"
                >
                  <span class="visceral-name">{{ s.name }}</span>
                  <span v-if="s.organ" class="visceral-organ">🧬 {{ s.organ.name }}</span>
                  <span v-else-if="s.locked" class="visceral-lock">🔒 未解锁</span>
                  <span v-else class="visceral-empty">空</span>
                </div>
              </div>
            </div>
            <!-- 器官背包 -->
            <div class="organ-bag">
              <div class="bag-title">器官背包（点击移植）</div>
              <div class="bag-list">
                <div
                  v-for="o in inventory.obtainedOrgans"
                  :key="o.id"
                  class="organ-wrap"
                >
                  <button
                    class="organ"
                    :title="o.desc"
                    @click="onOrganClick(o)"
                  >
                    <div class="o-name">{{ o.name }} <span class="o-star">{{ starText(o) }}</span></div>
                    <div class="o-info">移植：{{ o.foodCost }}食/{{ o.dataCost }}星之记忆 维持{{ o.maint }}能（槽位：{{ o.slotName || slotName(o) }}）· 强化{{ o.enhanceLevel || 0 }}/{{ o.star }}</div>
                    <div class="o-func">{{ organFunc(o) }}</div>
                  </button>
                  <button
                    class="btn o-enhance"
                    :disabled="enhanceCost(o) < 0"
                    @click="enhance(o)"
                    :title="enhanceTip(o)"
                  >{{ enhanceCost(o) < 0 ? '已满级' : '强化+' }}</button>
                </div>
                <div v-if="inventory.obtainedOrgans.length === 0" class="empty">暂无器官——猎杀生物获取</div>
              </div>
            </div>
          </div>
        </div>
        <div class="transplanted-row">
          <span class="bag-title">已移植（点击 ✕ 卸下）：</span>
          <span v-for="o in inventory.transplantedOrgans" :key="o.id" class="organ-chip" :title="o.desc">
            {{ o.name }} <span class="o-star-sm">{{ starText(o) }}</span>
            <button class="chip-enhance" :disabled="enhanceCost(o) < 0" @click="enhance(o)" :title="enhanceTip(o)">强化{{ o.enhanceLevel || 0 }}/{{ o.star }}</button>
            <button class="chip-remove" :title="'卸下「' + o.name + '」'" @click="untransplantOrgan(o)">✕</button>
          </span>
          <span v-if="!inventory.transplantedOrgans.length" class="modal-empty">暂无移植器官</span>
        </div>
      </div>
    </div>
  `,
  setup() {
    const S = window.GAME.store
    const D = window.GAME.data
    const { computed } = Vue
    const POS = {
      眼: { top: '8%', left: '42%' },
      脑: { top: '8%', left: '58%' },
      腺体: { top: '22%', left: '50%' },
      左臂: { top: '31%', left: '17%' },
      右臂: { top: '31%', left: '83%' },
      肺: { top: '34%', left: '42%' },
      心脏: { top: '34%', left: '58%' },
      躯干: { top: '46%', left: '50%' },
      胃: { top: '56%', left: '54%' },
      神经: { top: '66%', left: '50%' },
      左腿: { top: '74%', left: '35%' },
      右腿: { top: '74%', left: '65%' },
      胸甲: { top: '42%', left: '50%' },
    }
    function slotPos(name) {
      const p = POS[name] || { top: '40%', left: '40%' }
      return { top: p.top, left: p.left }
    }
    const slots = computed(() => {
      const day = S.player.day
      const isDebug = S.player.charId === 'debugger' // 调试者默认解锁所有槽位
      return D.BODY_SLOTS.map((s) => {
        const locked = isDebug ? false : day < s.unlockDay
        // 器官按固定槽位匹配（每个器官对应唯一身体槽位）
        let organ = null
        if (!locked) {
          organ = S.inventory.transplantedOrgans.find((o) => o.slotName === s.name) || null
        }
        return { name: s.name, type: s.type, locked, organ }
      })
    })
    // 人形仅显示肢体槽，内脏槽单独面板
    const limbSlots = computed(() => slots.value.filter((s) => s.type === D.SlotType.LIMB))
    const organSlots = computed(() => slots.value.filter((s) => s.type === D.SlotType.INTERNAL))
    function slotName(o) {
      return o.slotType === D.SlotType.LIMB ? '肢体' : '内部'
    }
    // 器官功能完整描述：战斗机能卡 / 被动（研究恢复类技能卡算被动）+ 遗物式光环
    function auraText(o) {
      const a = o.aura
      if (!a) return ''
      const p = []
      if (a.blockPerTurn) p.push(`每回合格挡+${a.blockPerTurn}`)
      if (a.drawPerTurn) p.push(`每回合抽${a.drawPerTurn}张`)
      if (a.healPerTurn) p.push(`每回合回血+${a.healPerTurn}`)
      if (a.startEnergy) p.push(`开战能量+${a.startEnergy}`)
      if (a.shieldStart) p.push(`开战格挡+${a.shieldStart}`)
      if (a.strengthStart) p.push(`开战力量+${a.strengthStart}`)
      if (a.dexterityStart) p.push(`开战敏捷+${a.dexterityStart}`)
      return p.length ? `光环：${p.join('、')}` : ''
    }
    function organFunc(o) {
      if (o.battleFunction && o.skillCard && D.isCombatSkill(o.skillCard.type)) {
        const at = auraText(o)
        return `机能卡「${o.skillCard.name}」：${o.skillCard.desc}${at ? '；' + at : ''}`
      }
      return passiveText(o) + (auraText(o) ? '；' + auraText(o) : '')
    }
    function passiveText(o) {
      const per = (o.passiveDays || 1) <= 1 ? '每日' : `每${o.passiveDays}天`
      const p = []
      if (o.passive.food) p.push(`${per}菌丝块+${o.passive.food}`)
      if (o.passive.water) p.push(`${per}盐水+${o.passive.water}`)
      if (o.passive.energy) p.push(`${per}耐力+${o.passive.energy}`)
      if (o.passive.data) p.push(`${per}星之记忆+${o.passive.data}`)
      const attr = []
      if (o.passive.str) attr.push(`力量+${o.passive.str}`)
      if (o.passive.agi) attr.push(`敏捷+${o.passive.agi}`)
      if (o.passive.con) attr.push(`体质+${o.passive.con}`)
      if (o.passive.int) attr.push(`智力+${o.passive.int}`)
      if (o.passive.combat) attr.push(`战斗伤害+${o.passive.combat}`)
      if (attr.length) p.push(`属性：${attr.join('、')}`)
      return p.length ? `被动：${p.join('、')}` : '被动效果'
    }
    function starText(o) {
      if (!o || !o.star) return ''
      return '★'.repeat(o.star)
    }
    function enhanceTip(o) {
      const c = S.enhanceCost(o)
      return c < 0 ? `「${o.name}」已达强化上限（${o.star} 次）` : `强化「${o.name}」：消耗 ${c} 星之记忆 + 1 生物样本（${o.enhanceLevel || 0}/${o.star}）`
    }
    return {
      ui: S.ui,
      closeModal: S.closeModal,
      inventory: S.inventory,
      onOrganClick: S.onOrganClick,
      untransplantOrgan: S.untransplantOrgan,
      enhance: S.enhanceOrgan,
      enhanceCost: S.enhanceCost,
      starText,
      enhanceTip,
      getUnlockedLimb: S.getUnlockedLimb,
      getUnlockedInternal: S.getUnlockedInternal,
      LIMB_SLOT_MAX: D.LIMB_SLOT_MAX,
      INTERNAL_SLOT_MAX: D.INTERNAL_SLOT_MAX,
      slots,
      limbSlots,
      organSlots,
      slotPos,
      slotName,
      organFunc,
      passiveText,
    }
  },
}
