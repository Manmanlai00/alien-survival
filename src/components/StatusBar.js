/* 顶栏：季节 / 时间 / 地点 / 生物群落 */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.StatusBar = {
  template: `
    <div class="status-bar">
      <div class="cell" :title="weather.desc">
        <div class="label">今日天气</div>
        <div>{{ weather.icon }} {{ weather.name }}</div>
      </div>
      <div class="cell">
        <div class="label">季节</div>
        <div>{{ seasonName }}（{{ player.seasonDay }}/{{ C.SEASON_LENGTH_DAYS }}）</div>
      </div>
      <div class="cell">
        <div class="label">时间</div>
        <div>第{{ player.day }}天 · {{ player.timeLeft }}/{{ C.MAX_TIME_PER_DAY }}</div>
      </div>
      <div class="cell">
        <div class="label">当前地点</div>
        <div>{{ loc ? loc.name + '·' + ecoText(loc.eco) : '未知' }}</div>
      </div>
      <div class="cell grow">
        <div class="label">生物群落</div>
        <div v-if="enemies.length">
          <span v-for="(x, i) in enemies" :key="x.e.name" class="enemy-cell">
            {{ x.e.name }}<span v-if="x.seasonal">（{{ seasonName }}出现）</span>
            <span class="enemy-sub">（{{ difficultyName(x.e.effectivePower || x.e.power) }} · {{ x.cur > 0 ? x.cur + '/' + x.e.maxPop : (x.e.maxPop <= 1 ? '已灭绝' : '已绝迹') }}）</span><span v-if="i < enemies.length - 1">；</span>
          </span>
        </div>
        <div v-else>无大型生物</div>
      </div>
    </div>
  `,
  setup() {
    const S = window.GAME.store
    const D = window.GAME.data
    const { computed } = Vue
    const seasonName = computed(() => D.SEASON_NAMES[S.player.season])
    const ecoText = (eco) => D.ecoText(eco)
    const loc = computed(() => S.locations[S.world.currentLocation])
    // 当前地点全部生物群落（含季节生物），各自显示数量与难度
    const enemies = computed(() => {
      const l = loc.value
      if (!l) return []
      const list = []
      const push = (e, seasonal) => {
        const cur = seasonal
          ? (S.world.seasonalPops && S.world.seasonalPops[l.id] && S.world.seasonalPops[l.id][S.player.season] !== undefined ? S.world.seasonalPops[l.id][S.player.season] : e.maxPop)
          : (l.enemyPops[e.name] !== undefined ? l.enemyPops[e.name] : e.maxPop)
        list.push({ e, cur, seasonal })
      }
      for (const e of l.enemies || []) push(e, false)
      const se = l.seasonalEnemies && l.seasonalEnemies[S.player.season]
      if (se) push(se, true)
      return list
    })
    return {
      player: S.player,
      loc,
      ecoText,
      enemies,
      seasonName,
      weather: S.weather,
      locations: S.locations,
      C: D.C,
      difficultyName: D.difficultyName,
    }
  },
}
