/* 路口区域：展示当前地点已勘探解锁的路口，点击直接通行；未解锁路口不显示 */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.RoadsPanel = {
  template: `
    <div v-if="loc" class="roads-panel">
      <div class="roads-title">路口（点击直接通行）</div>
      <div class="roads-list">
        <button
          v-for="n in openRoads"
          :key="n"
          class="btn road-btn"
          :title="lockedTitle(n)"
          @click="onDestination(n)"
        >
          {{ locations[n].name }}<span v-if="specialIcon(n)" class="road-special" :title="specialTitle(n)">{{ specialIcon(n) }}</span>（{{ ecoText(locations[n].eco) }}）<span v-if="requireLocked(n)" class="road-lock">🔒</span>
        </button>
        <span v-if="openRoads.length === 0" class="roads-empty">尚未勘探出任何道路</span>
      </div>
    </div>
  `,
  setup() {
    const S = window.GAME.store
    const D = window.GAME.data
    const { computed } = Vue
    const loc = computed(() => S.locations[S.world.currentLocation])
    const ecoText = (eco) => D.ecoText(eco)
    const openRoads = computed(() =>
      loc.value ? loc.value.neighbors.filter((n) => S.isRoadOpen(loc.value.id, n)) : []
    )
    // 需要先研究能力才能进入的地点（显示 🔒）
    function requireLocked(n) {
      const dest = S.locations[n]
      return dest && dest.require && !(S.player.upg[dest.require] > 0)
    }
    function lockedTitle(n) {
      if (!requireLocked(n)) return ''
      const dest = S.locations[n]
      const name = D.RESEARCH_DEFS[dest.require] ? D.RESEARCH_DEFS[dest.require].name : dest.require
      return `需要先研究「${name}」才能前往`
    }
    // 特殊区域标记（深海/地底/悬空）
    function specialIcon(n) {
      const dest = S.locations[n]
      const sp = dest && dest.require && D.SPECIAL_META && D.SPECIAL_META[dest.require]
      return sp ? sp.icon : ''
    }
    function specialTitle(n) {
      const dest = S.locations[n]
      const sp = dest && dest.require && D.SPECIAL_META && D.SPECIAL_META[dest.require]
      return sp ? sp.name + '区域：' + sp.desc : ''
    }
    return {
      loc,
      ecoText,
      openRoads,
      locations: S.locations,
      requireLocked,
      lockedTitle,
      specialIcon,
      specialTitle,
      onDestination: S.onDestination,
    }
  },
}
