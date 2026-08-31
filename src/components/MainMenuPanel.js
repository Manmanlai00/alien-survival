/* 游戏开始主菜单：新游戏 / 继续游戏 / 导出导入存档 */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.MainMenuPanel = {
  template: `
    <div v-if="phase.state === 'menu'" class="menu-overlay">
      <div class="menu-box">
        <h1 class="menu-title">异星生存</h1>
        <p class="menu-sub">Alien Survival · 一切皆活物，你的装备就是移植的生物器官</p>
        <div class="menu-btns">
          <button class="menu-btn primary" @click="newGame">进入游戏</button>
          <button class="menu-btn" :disabled="!saveMeta.exists" @click="continueGame">
            继续游戏
            <span v-if="saveMeta.info" class="menu-save-info">
              {{ saveMeta.info.charName }} · 第{{ saveMeta.info.day }}天 · {{ saveMeta.info.season }}
            </span>
          </button>
        </div>
        <div class="menu-file">
          <button class="menu-btn small" :disabled="!saveMeta.exists" @click="exportSave">导出存档文件</button>
          <label class="menu-btn small file-label">
            导入存档文件
            <input type="file" accept=".json,application/json" @change="importSave" />
          </label>
        </div>
        <!-- 角色存档管理：逐个清除 -->
        <div v-if="saveList.length" class="menu-saves">
          <div class="menu-saves-title">角色存档（点击清除单个存档）</div>
          <div v-for="s in saveList" :key="s.charId" class="save-row">
            <span class="save-row-name">{{ s.info ? s.info.charName : s.charId }}<span class="save-row-sub" v-if="s.info"> · 第{{ s.info.day }}天 · {{ s.info.season }}</span></span>
            <button class="menu-btn small danger" @click="clearOne(s.charId)">清除</button>
          </div>
        </div>
        <p class="menu-tip">每日结束时自动存档（永久死亡，死亡后存档清除）</p>
      </div>
    </div>
  `,
  setup() {
    const S = window.GAME.store
    const D = window.GAME.data
    const { computed } = Vue
    // 存档清除版本号：删除任一存档后递增，强制 saveList 重算（删除非激活角色存档时 saveMeta 锚点值不变，必须额外触发）
    const saveTick = Vue.ref(0)
    // 有存档的角色列表（逐个清除）
    const saveList = computed(() => {
      // 响应式锚点：主菜单可见性 / 存档元信息 / 清除版本变化时重算（否则 computed 缓存导致清除后不刷新）
      void S.phase.state
      void S.saveMeta.exists
      void S.saveMeta.charId
      void saveTick.value
      const list = []
      for (const id in D.CHARACTER_DEFS) {
        if (S.hasSave(id)) list.push({ charId: id, info: S.getSaveSummary(id) })
      }
      return list
    })
    function clearOne(charId) {
      const info = S.getSaveSummary(charId)
      const name = info ? info.charName : charId
      if (!window.confirm(`确定清除「${name}」的存档？此操作不可恢复！`)) return
      S.clearSave(charId)
      S.refreshSaveMeta()
      saveTick.value++
      alert(`已清除「${name}」的存档。`)
    }
    function exportSave() {
      const id = S.saveMeta.charId || S.activeCharId()
      const raw = id ? localStorage.getItem(S.saveKeyFor(id)) : null
      if (!raw) return
      const blob = new Blob([raw], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = '异星生存存档.json'
      a.click()
      URL.revokeObjectURL(a.href)
    }
    function importSave(e) {
      const file = e.target.files && e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result)
          if (!data || data.version !== 1 || !data.player || !data.player.charId) {
            alert('存档格式不正确')
            return
          }
          // 导入到该存档角色对应的专属槽位
          localStorage.setItem(S.saveKeyFor(data.player.charId), reader.result)
          localStorage.setItem('alien_survival_active_v1', data.player.charId)
          S.refreshSaveMeta()
          alert('导入成功（角色：' + (data.player.charName || data.player.charId) + '），可点击「继续游戏」开始')
        } catch (err) {
          alert('导入失败：' + (err && err.message ? err.message : err))
        }
      }
      reader.readAsText(file)
      e.target.value = ''
    }
    return {
      phase: S.phase,
      saveMeta: S.saveMeta,
      saveList,
      clearOne,
      newGame: S.newGame,
      continueGame: S.continueGame,
      exportSave,
      importSave,
    }
  },
}
