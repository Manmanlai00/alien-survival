/* 地图系统弹窗：网状地形图，节点为地区、连线为道路，点击可前往 */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.MapModal = {
  template: `
    <div v-if="ui.modal === 'map'" class="modal-overlay">
      <div class="modal-box map-box">
        <div class="modal-head">
          <h3>星球地图</h3>
          <button class="btn cancel modal-close" @click="closeModal">关闭</button>
        </div>
        <div class="map-sub">
          当前：{{ current.name }}（{{ ecoText(current.eco) }}）· {{ seasonName }} · 第 {{ player.day }} 天
          <span class="map-hint">已解锁道路为实线，未解锁为虚线；点击节点可前往（需道路相通）</span>
          <span class="map-hint">滚轮缩放 {{ Math.round(zoom * 100) }}%</span>
        </div>
        <div
          class="map-canvas"
          :class="{ dragging: dragging }"
          ref="canvasEl"
          @wheel.prevent="onWheel"
          @mousedown="onCanvasDown"
          @mousemove="onCanvasMove"
          @mouseup="onCanvasUp"
          @mouseleave="onCanvasUp"
        >
          <svg viewBox="0 0 1400 1000" class="map-svg" :style="{ width: (zoom * 100) + '%' }">
            <!-- 道路连线 -->
            <line
              v-for="(e, i) in edges"
              :key="'e' + i"
              :x1="e.x1" :y1="e.y1" :x2="e.x2" :y2="e.y2"
              class="map-edge"
              :class="e.open ? 'open' : 'locked'"
            />
            <!-- 地区节点 -->
            <g
              v-for="loc in allLocs"
              :key="loc.id"
              class="map-node"
              :class="nodeClass(loc)"
              :transform="'translate(' + pos(loc)[0] + ',' + pos(loc)[1] + ')'"
              @click="onNode(loc)"
            >
              <circle r="26" />
              <title>{{ nodeTitle(loc) }}</title>
              <text class="map-node-name" y="4">{{ loc.name }}</text>
              <text v-if="specialOf(loc)" class="map-node-special" y="18">{{ specialOf(loc).icon }}</text>
              <text v-if="isCurrent(loc)" class="map-node-mark" y="30">▲</text>
              <text v-if="hasSuper(loc)" class="map-node-super" y="-14">☄</text>
            </g>
          </svg>
        </div>
        <div v-if="msg" class="map-msg">{{ msg }}</div>
      </div>
    </div>
  `,
  setup() {
    const S = window.GAME.store
    const D = window.GAME.data
    const { computed, ref } = Vue
    const ecoText = (eco) => D.ecoText(eco)
    // 节点坐标：按生态区域自然散布（错落非对称、间距充足不重叠），保持地理逻辑：北山、东地热、东南熔岩海、南湖泽、西南荒漠、西风蚀/坟场、西北遗迹/洞窟
    const MAP_POS = {
      camp: [700, 640],
      // 共生森林（营地西北）
      forest_edge: [620, 430],
      forest_heart: [585, 335],
      vine_pit: [655, 255],
      // 极高山脉（北）
      summit: [700, 160],
      glacier_pass: [790, 110],
      // 孢子雨林（东北偏北）
      spore_edge: [830, 300],
      spore_heart: [905, 215],
      spore_canopy: [975, 130],
      // 星空高原（东北角）
      starry_field: [1100, 160],
      crater_lake: [1190, 240],
      star_peak: [1280, 170],
      // 磁力高原（东北偏东）
      mag_field: [900, 430],
      iron_peak: [1000, 480],
      levi_valley: [1100, 400],
      // 地热裂谷（东）
      geo_spring: [1180, 560],
      geo_heart: [1290, 650],
      vein_nest: [1360, 560],
      // 熔岩深渊（东南角）
      lava_rim: [1180, 800],
      magma_river: [1280, 880],
      obsidian_hall: [1330, 780],
      // 暗潮海岸（东南偏中）
      tide_shore: [900, 700],
      reef_flat: [1000, 790],
      abyss_shelf: [1090, 870],
      // 甲烷湖泽（南偏中）
      lake_shore: [700, 760],
      reed_marsh: [760, 880],
      lake_deep: [640, 950],
      // 腐化泥沼（南偏西）
      corrupt_bog: [520, 830],
      venom_lake: [430, 750],
      decay_wood: [350, 860],
      // 遗忘荒漠（西南）
      dune_sea: [480, 590],
      oasis_wreck: [380, 660],
      lost_tomb: [300, 750],
      // 风蚀峡谷（西偏中）
      wind_pass: [520, 500],
      canyon_bottom: [410, 470],
      mesa_top: [330, 380],
      // 巨兽坟场（西）
      bone_mound: [260, 500],
      bone_sea: [150, 450],
      // 冰封冻野（西北偏西）
      frozen_wilds: [90, 300],
      // 盐晶荒原（西北偏西）
      salt_plain: [380, 280],
      salt_canyon: [290, 230],
      // 远古遗迹（西北偏中）
      ruins_plaza: [470, 200],
      ruins_hall: [400, 120],
      // 幽深洞窟（西北角）
      cave_entrance: [520, 90],
      crystal_hall: [610, 40],
    }
    const allLocs = Object.values(D.LOCATIONS)
    const current = computed(() => S.locations[S.world.currentLocation])
    const seasonName = computed(() => D.SEASON_NAMES[S.player.season])
    const msg = ref('')
    // 滚轮缩放（100% - 300%，最小 100%），以鼠标位置为缩放中心
    const zoom = ref(1)
    const canvasEl = ref(null)
    function onWheel(e) {
      const oldZoom = zoom.value
      const next = e.deltaY < 0 ? oldZoom * 1.15 : oldZoom / 1.15
      const newZoom = Math.min(3, Math.max(1, next))
      if (newZoom === oldZoom) return
      const ratio = newZoom / oldZoom
      // 记录鼠标相对画布视口的位置
      const rect = canvasEl.value ? canvasEl.value.getBoundingClientRect() : null
      zoom.value = newZoom
      if (canvasEl.value) {
        const c = rect ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : { x: 0, y: 0 }
        Vue.nextTick(() => {
          // 内容沿左上缩放，调整滚动位置使鼠标下的地图点保持不动
          canvasEl.value.scrollLeft = (c.x + canvasEl.value.scrollLeft) * ratio - c.x
          canvasEl.value.scrollTop = (c.y + canvasEl.value.scrollTop) * ratio - c.y
        })
      }
    }
    // 鼠标左键拖拽平移地图
    const drag = { active: false, startX: 0, startY: 0, scrollX: 0, scrollY: 0, moved: false }
    const dragging = computed(() => drag.active)
    function onCanvasDown(e) {
      if (e.button !== 0) return
      drag.active = true
      drag.moved = false
      drag.startX = e.clientX
      drag.startY = e.clientY
      drag.scrollX = canvasEl.value ? canvasEl.value.scrollLeft : 0
      drag.scrollY = canvasEl.value ? canvasEl.value.scrollTop : 0
      e.preventDefault()
    }
    function onCanvasMove(e) {
      if (!drag.active || !canvasEl.value) return
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.moved = true
      canvasEl.value.scrollLeft = drag.scrollX - dx
      canvasEl.value.scrollTop = drag.scrollY - dy
    }
    function onCanvasUp() {
      drag.active = false
    }
    function pos(loc) {
      return MAP_POS[loc.id] || [0, 0]
    }
    function isCurrent(loc) {
      return loc.id === S.world.currentLocation
    }
    // 特殊区域标记（深海/地底/悬空）
    function specialOf(loc) {
      return loc.require && D.SPECIAL_META && D.SPECIAL_META[loc.require] ? D.SPECIAL_META[loc.require] : null
    }
    // 超级生物（流星事件）节点标记
    function hasSuper(loc) {
      return !!S.getSuperCreature(loc.id)
    }
    // 调试者：地图全解锁
    const isDebug = computed(() => S.player.charId === 'debugger')
    function isDiscovered(loc) {
      return isDebug.value || !!S.world.discovered[loc.id]
    }
    function nodeClass(loc) {
      if (isCurrent(loc)) return 'cur'
      return isDiscovered(loc) ? 'known' : 'unknown'
    }
    function nodeTitle(loc) {
      if (isCurrent(loc)) return `${loc.name}（当前所在地）`
      if (!isDiscovered(loc)) return `${loc.name}：尚未探索到该地区`
      const e = S.getActiveEnemy(loc)
      let t = `${loc.name}（${ecoText(loc.eco)}）${e ? '· 生物：' + e.name : ''}`
      const sc = S.getSuperCreature(loc.id)
      if (sc) t += ` · ☄超级生物「${sc.enemy.name}」剩余 ${Math.max(sc.expireDay - S.player.day, 1)} 天`
      const sp = specialOf(loc)
      if (sp) t += ` · 【${sp.name}】${sp.desc}`
      return t
    }
    // 全部道路连线（去重，双向判定已解锁）
    const edges = computed(() => {
      const list = []
      const seen = {}
      for (const loc of allLocs) {
        for (const n of loc.neighbors) {
          const key = loc.id < n ? loc.id + '_' + n : n + '_' + loc.id
          if (seen[key]) continue
          const dest = D.LOCATIONS[n]
          if (!dest) continue
          const a = MAP_POS[loc.id]
          const b = MAP_POS[n]
          if (!a || !b) continue
          seen[key] = true
          list.push({
            x1: a[0],
            y1: a[1],
            x2: b[0],
            y2: b[1],
            open: S.isRoadOpen(loc.id, n),
          })
        }
      }
      return list
    })
    function onNode(loc) {
      if (drag.moved) return // 拖拽平移时不触发节点点击
      if (isCurrent(loc)) return
      // 调试者：无视道路/能力限制，点击任意地点直接到达
      if (isDebug.value) {
        S.onDestination(loc.id)
        S.closeModal()
        return
      }
      if (S.isRoadOpen(S.world.currentLocation, loc.id)) {
        // 需要先研究能力的地点
        if (loc.require && !(S.player.upg[loc.require] > 0)) {
          const name = D.RESEARCH_DEFS[loc.require] ? D.RESEARCH_DEFS[loc.require].name : loc.require
          msg.value = `「${loc.name}」需要先研究「${name}」才能前往。`
          return
        }
        S.onDestination(loc.id)
        S.closeModal()
        return
      }
      msg.value = isDiscovered(loc)
        ? `「${loc.name}」与当前地区的道路尚未开通，无法直接前往。`
        : `尚未探索到「${loc.name}」，探索周边地区解锁道路。`
    }
    return {
      ui: S.ui,
      player: S.player,
      world: S.world,
      ecoText,
      hasSuper,
      allLocs,
      current,
      seasonName,
      zoom,
      onWheel,
      canvasEl,
      dragging,
      onCanvasDown,
      onCanvasMove,
      onCanvasUp,
      pos,
      isCurrent,
      specialOf,
      nodeClass,
      nodeTitle,
      edges,
      onNode,
      msg,
      closeModal: S.closeModal,
    }
  },
}
