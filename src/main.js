/* 入口：创建 Vue 应用、注册组件、初始化游戏 */
;(function () {
window.GAME = window.GAME || {}
const S = window.GAME.store

// 扩展 UI 挂载区：渲染通过 G.def.ui 注册的动态组件（新增组件无需修改下方模板）
window.GAME.components = window.GAME.components || {}
window.GAME.components.UiExtras = {
  template: `<div class="ui-extras"><component v-for="n in extras" :key="n" :is="n" /></div>`,
  setup() {
    // 直接引用全局数组（registry 加载期已初始化），运行期 def.ui push 后 v-for 可见
    return { extras: window.GAME.UI_EXTRA }
  },
}

const app = Vue.createApp({
  template: `
    <div class="game-root">
      <StatusBar />
      <QuestPanel />
      <div class="mid">
        <div class="mid-left">
          <RoadsPanel />
          <LocationPanel />
        </div>
      </div>
      <LogPanel />
      <div class="bottom">
        <InfoPanel />
      </div>
      <ActionBar />
      <div v-if="ui.busy" class="global-loading">
        <div class="loading-pixel" :class="'lk-' + (ui.actionKind || 'explore')">
          <div class="lp-frame">
            <div class="lp-grid"></div>
            <!-- 探索：雷达扫描 -->
            <div class="lk-anim la-radar">
              <div class="lp-scan"></div>
              <div class="lp-sweep"></div>
              <div class="lp-ring"></div>
              <div class="lp-ring lp-ring-2"></div>
              <div class="lp-core"></div>
            </div>
            <!-- 移动：行进箭头 -->
            <div class="lk-anim la-steps">
              <i class="lk-arrow"></i><i class="lk-arrow a2"></i><i class="lk-arrow a3"></i>
            </div>
            <!-- 采集：挥动工具 -->
            <div class="lk-anim la-harvest">
              <div class="lk-tool"></div>
              <i class="lk-bit b1"></i><i class="lk-bit b2"></i><i class="lk-bit b3"></i>
            </div>
            <!-- 制作：铁砧锤击 -->
            <div class="lk-anim la-craft">
              <div class="lk-hammer"></div>
              <i class="lk-spark s1"></i><i class="lk-spark s2"></i><i class="lk-spark s3"></i>
            </div>
            <!-- 研究：翻书 -->
            <div class="lk-anim la-research">
              <div class="lk-book"><div class="lk-page"></div></div>
              <i class="lk-know"></i>
            </div>
            <!-- 休息：月与呼噜 -->
            <div class="lk-anim la-rest">
              <div class="lk-moon"></div>
              <span class="lk-z z1">Z</span><span class="lk-z z2">Z</span><span class="lk-z z3">Z</span>
            </div>
            <!-- 使用：倾倒药瓶 -->
            <div class="lk-anim la-use">
              <div class="lk-vial"></div>
              <i class="lk-drop d1"></i><i class="lk-drop d2"></i>
            </div>
          </div>
        </div>
        <div class="loading-text">{{ loadingText }}</div>
      </div>
      <div v-if="player.dead" class="dead-overlay">
        <div class="dead-box">
          <h2 v-if="deadEnding">{{ deadEnding.icon }} 结局 · {{ deadEnding.name }}</h2>
          <p class="dead-ending-text">{{ deadEnding ? deadEnding.text : '你的血肉溶解，融入了这颗活物星球，循环仍在继续……' }}</p>
          <p class="dead-stats">生存了 {{ player.day }} 天 · 移植器官 {{ organCount }} 个</p>
          <button @click="toMenu()">回到主菜单</button>
        </div>
      </div>
      <MainMenuPanel />
      <BattlePanel />
      <CharacterSelectPanel />
      <MapModal />
      <ConsumeModal />
      <ResearchModal />
      <CraftModal />
      <AbilityModal />
      <BodyModal />
      <DeckModal />
      <BuildingModal />
      <CardIndexModal />
      <OrganCardIndexModal />
      <ResourceModal />
      <ItemsModal />
      <BestiaryModal />
      <LoreModal />
      <DiseaseModal />
      <TutorialPanel />
      <EventNotice />
      <ChoiceModal />
      <UiExtras />
      <!-- 耐力不足弹窗：提示休息（点击背景不关闭） -->
      <div v-if="ui.restPrompt" class="modal-overlay rest-prompt">
        <div class="modal-box rest-prompt-box">
          <div class="modal-head">
            <h3>耐力不足</h3>
            <button class="btn cancel modal-close" @click="dismissRest">关闭</button>
          </div>
          <div class="rest-prompt-text">{{ ui.restPrompt.text }}</div>
          <div class="rest-prompt-actions">
            <button class="btn" @click="restNow">休息（{{ C.REST_TIME }}时间）</button>
            <button class="btn cancel" @click="dismissRest">稍后</button>
          </div>
        </div>
      </div>
    </div>
  `,
  setup() {
    // loading 文字对应当前执行的动作（动画为纯 CSS 像素风，见 .loading-pixel）
    const loadingText = Vue.computed(() => {
      const map = { explore: '探索中…', move: '移动中…', harvest: '采集中…', craft: '制作中…', research: '研究中…', rest: '休息中…', use: '使用中…', eat: '进食中…', drink: '饮用中…', med: '用药中…' }
      return map[S.ui.actionKind] || '执行中…'
    })
    // 死亡时判定结局并解锁记录（跨周目图鉴收集）
    const deadEnding = Vue.computed(() => {
      if (!S.player.dead) return null
      const e = S.determineEnding()
      if (e && e.id) S.unlockEnding(e.id)
      return e
    })
    const organCount = Vue.computed(() => S.inventory.transplantedOrgans.length)
    return { player: S.player, ui: S.ui, toMenu: S.toMenu, dismissRest: S.dismissRest, restNow: S.restNow, C: window.GAME.data.C, loadingText, deadEnding, organCount }
  },
})

for (const name in window.GAME.components) {
  app.component(name, window.GAME.components[name])
}

// 暴露应用实例：def.ui 运行期注册新组件时同步注册进 Vue
window.GAME.app = app

app.mount('#app')

// 全局按钮点击音效（各类通用交互反馈）：tab 切换用专属音，其余用通用点击音
let musicStarted = false
document.addEventListener('click', (e) => {
  const t = e.target
  const el = t && t.closest ? t.closest('button, .sq-btn') : null
  if (!el || !window.GAME.sound) return
  if (el.classList && (el.classList.contains('cat-tab') || el.classList.contains('tut-tab'))) window.GAME.sound.switchT()
  else window.GAME.sound.click()
  // 首次交互时启动背景音乐（浏览器自动播放策略要求用户手势）
  const S = window.GAME.store
  if (!musicStarted && S && S.phase && window.GAME.sound.music) {
    musicStarted = true
    if (S.phase.state === 'playing' && S.playLocationMusic) S.playLocationMusic()
    else window.GAME.sound.music.play('sector')
  }
})

// PWA：注册 Service Worker（仅 https 或 localhost），离线可玩
if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
})()
