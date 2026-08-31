/* 配方制作弹窗：左侧按用途竖向分类 + 可制作筛选；顶部按生态分类；悬停查看详情 */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.CraftModal = {
  template: `
    <div v-if="ui.modal === 'craft'" class="modal-overlay">
      <div class="modal-box craft-box">
        <div class="modal-head">
          <h3>配方制作</h3>
          <span class="modal-sub">共 {{ D.RECIPES.length }} 个配方 · 显示 {{ shownRecipes.length }} 个</span>
          <button class="btn cancel modal-close" @click="closeModal">关闭</button>
        </div>
        <div class="craft-body">
          <div class="craft-side">
            <label class="craft-only-toggle">
              <input type="checkbox" v-model="onlyCraftable" />
              <span>只看可制作</span>
            </label>
            <div class="use-cats">
              <button
                v-for="c in USE_CATS"
                :key="c.key"
                class="use-cat"
                :class="{ on: curUse === c.key }"
                @click="curUse = c.key"
              >{{ c.label }}</button>
            </div>
          </div>
          <div class="craft-main">
            <div class="cat-tabs">
              <button
                v-for="c in ECO_TABS"
                :key="c"
                class="cat-tab"
                :class="{ on: curCat === c }"
                @click="curCat = c"
              >{{ c }}</button>
            </div>
            <div class="recipe-grid">
              <div
                v-for="rc in shownRecipes"
                :key="rc.id"
                class="recipe-tile"
                :class="{ disabled: !canCraft(rc) }"
                @click="craft(rc)"
                @mouseenter="hovered = rc.id"
                @mouseleave="hovered = null"
              >
                <div class="recipe-tile-name">{{ rc.name }}</div>
                <div v-if="rc.eco" class="recipe-tile-eco">{{ rc.eco }}</div>
              </div>
              <div v-if="shownRecipes.length === 0" class="craft-empty">没有符合条件的配方</div>
            </div>
          </div>
        </div>
        <div v-if="hoverTip" class="recipe-tip">
          <div class="tip-title">{{ hoverTip.rc.name }}</div>
          <div v-if="hoverTip.req" class="tip-line">前置研究：{{ hoverTip.req }}（未掌握）</div>
          <div v-if="hoverTip.rc.eco" class="tip-line eco">生态来源：{{ hoverTip.rc.eco }}{{ hoverTip.mainName ? '（主材料：' + hoverTip.mainName + '）' : '' }}</div>
          <div class="tip-line" v-for="(n, k) in hoverTip.rc.in" :key="k">
            需要 {{ ITEMS[k].name }} ×{{ n }}
            <span v-if="sourceOf(k).length" class="tip-src">｜来源：{{ sourceText(k) }}</span>
          </div>
          <div class="tip-line out">产出：{{ hoverTip.rc.desc }}</div>
          <div v-if="hoverTip.effect" class="tip-line effect">使用效果：{{ hoverTip.effect }}</div>
          <div class="tip-hint">{{ hoverTip.hint }}</div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const S = window.GAME.store
    const D = window.GAME.data
    const { ref, computed } = Vue
    const isDebug = computed(() => S.player.charId === 'debugger')
    // 生态分类 tab：全部 / 通用（无生态配方）/ 各生态区；以后新增配方带 eco 字段即自动归类解锁
    const ECO_TABS = computed(() => ['全部', '通用'].concat(Object.keys(D.ECO_SERIES)))
    function recipeEco(rc) {
      return rc.eco || '通用'
    }
    const curCat = ref('全部')
    // 用途分类：按配方产出物品的 use 效果归类
    const USE_CAT_KEYS = ['食物', '饮水', '医疗', '护甲', '武器', '精神', '耐力', '探索', '材料']
    function recipeUseCat(rc) {
      // 注册时经 G.def.recipe 工厂已自动算好 cat，优先复用（第三方叠加配方自动归类）
      if (rc.cat) return rc.cat
      const outId = Object.keys(rc.out)[0]
      const def = D.ITEMS[outId]
      if (!def) return '材料'
      const u = def.use || {}
      if (u.hunger) return '食物'
      if (u.thirst) return '饮水'
      if (u.bandage || u.heal) return '医疗'
      if (u.armor) return '护甲'
      if (u.combat) return '武器'
      if (u.morale) return '精神'
      if (u.stamina) return '耐力'
      if (u.data || u.scout) return '探索'
      return '材料'
    }
    const USE_CATS = computed(() => {
      const counts = {}
      for (const rc of D.RECIPES) {
        const k = recipeUseCat(rc)
        counts[k] = (counts[k] || 0) + 1
      }
      return [{ key: '全部', label: '全部 ' + D.RECIPES.length }].concat(
        USE_CAT_KEYS.map((k) => ({ key: k, label: k + (counts[k] ? ' ' + counts[k] : '') }))
      )
    })
    const curUse = ref('全部')
    const onlyCraftable = ref(false)
    const shownRecipes = computed(() => {
      let list = D.RECIPES
      if (curCat.value !== '全部') list = list.filter((rc) => recipeEco(rc) === curCat.value)
      if (curUse.value !== '全部') list = list.filter((rc) => recipeUseCat(rc) === curUse.value)
      if (onlyCraftable.value) list = list.filter((rc) => S.canCraft(rc))
      return list
    })
    function recipeReq(rc) {
      return D.RECIPE_REQ[rc.id] || null
    }
    const hovered = ref(null)
    const hoverTip = computed(() => {
      const rc = hovered.value ? D.RECIPES.find((r) => r.id === hovered.value) : null
      if (!rc) return null
      const req = recipeReq(rc)
      const reqUnlocked = isDebug.value || !req || (S.player.upg[req] > 0)
      const ok = reqUnlocked && S.canCraft(rc)
      return {
        rc,
        req: req && !isDebug.value && !(S.player.upg[req] > 0) ? (D.RESEARCH_DEFS[req] ? D.RESEARCH_DEFS[req].name : req) : '',
        effect: D.itemUseText(Object.keys(rc.out)[0]),
        mainName: rc.eco && D.ECO_SERIES[rc.eco] ? (D.ITEMS[D.ECO_SERIES[rc.eco].main.id] ? D.ITEMS[D.ECO_SERIES[rc.eco].main.id].name : D.ECO_SERIES[rc.eco].main.name) : '',
        hint: isDebug.value ? `调试者：免材料全解锁` : (!reqUnlocked ? `需先研究「${D.RESEARCH_DEFS[req].name}」` : (ok ? `点击制作（${C.CRAFT_TIME}时间）` : '资源不足')),
      }
    })
    const C = D.C
    // 材料获取来源：由数据层 def.itemSources 汇总（生态采集/生态材料/配方制作/基础兜底）
    function sourceOf(id) {
      return D.def && D.def.itemSources ? D.def.itemSources(id) : []
    }
    function sourceText(id) {
      const list = sourceOf(id)
      if (!list.length) return '暂无明确来源'
      return list.length > 3 ? list.slice(0, 3).join('、') + ' 等' + list.length + '处' : list.join('、')
    }
    return {
      ui: S.ui,
      closeModal: S.closeModal,
      D,
      ITEMS: D.ITEMS,
      canCraft: S.canCraft,
      craft: S.craft,
      ECO_TABS,
      curCat,
      USE_CATS,
      curUse,
      onlyCraftable,
      shownRecipes,
      hovered,
      hoverTip,
      sourceOf,
      sourceText,
      C,
    }
  },
}
