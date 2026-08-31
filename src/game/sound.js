/* ============ 音效系统（本地文件音效 + Web Audio 程序化合成兜底） ============ */
window.GAME = window.GAME || {}
window.GAME.sound = (function () {
  let ctx = null
  let muted = false
  // 本地音效文件目录（与 index.html 同级）
  const SFX_PATH = 'assets/sounds/'

  // ---- 文件音效：懒加载池化播放，失败自动回退合成 ----
  // pool: { els: Audio[], idx: 轮换游标, broken: 已确认缺失/播放失败 }
  // 懒加载策略：preload=none 播放时才发起请求，避免加载期请求被导航取消（ERR_ABORTED）
  const poolMap = {}
  function playFile(nameOrList) {
    const names = Array.isArray(nameOrList) ? nameOrList : [nameOrList]
    for (const name of names) {
      let pool = poolMap[name]
      if (pool && pool.broken) continue // 已知缺失/失败，尝试下一个候选
      if (!pool) {
        const els = []
        for (let i = 0; i < 2; i++) {
          const a = new Audio(SFX_PATH + name + '.mp3')
          a.preload = 'none'
          a.onerror = () => { pool.broken = true }
          els.push(a)
        }
        pool = { els, idx: 0, broken: false }
        poolMap[name] = pool
      }
      const a = pool.els[pool.idx % 2]
      pool.idx++
      try {
        a.currentTime = 0
      } catch (e) { /* 未就绪时忽略 */ }
      const pr = a.play()
      if (pr && pr.catch) pr.catch(() => { pool.broken = true })
      return true
    }
    return false
  }
  function fileOr(list, fallback) {
    return function () {
      if (muted) return
      if (!playFile(list)) fallback()
    }
  }

  // ---- 合成兜底（原有 Web Audio 程序化音效） ----
  function ensure() {
    if (muted) return null
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  }
  function tone(freq, dur, type, vol, when, slide) {
    const c = ensure()
    if (!c) return
    const t = c.currentTime + (when || 0)
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = type || 'sine'
    o.frequency.setValueAtTime(freq, t)
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(slide, 1), t + dur)
    g.gain.setValueAtTime(vol || 0.12, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g)
    g.connect(c.destination)
    o.start(t)
    o.stop(t + dur + 0.02)
  }
  function noise(dur, vol, filterFreq) {
    const c = ensure()
    if (!c) return
    const t = c.currentTime
    const len = Math.max(Math.floor(c.sampleRate * dur), 1)
    const buf = c.createBuffer(1, len, c.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    const src = c.createBufferSource()
    src.buffer = buf
    const f = c.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = filterFreq || 1000
    const g = c.createGain()
    g.gain.setValueAtTime(vol || 0.1, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f)
    f.connect(g)
    g.connect(c.destination)
    src.start(t)
  }

  // 合成兜底函数（与原有 API 一一对应）
  const syn = {
    click() { tone(600, 0.06, 'square', 0.05) },
    open() { tone(500, 0.08, 'triangle', 0.07); tone(750, 0.1, 'triangle', 0.05, 0.05) },
    close() { tone(700, 0.06, 'triangle', 0.05); tone(450, 0.08, 'triangle', 0.04, 0.04) },
    explore() { noise(0.25, 0.07, 900); tone(300, 0.2, 'sine', 0.04, 0, 200) },
    discover() { tone(520, 0.1, 'sine', 0.08); tone(780, 0.12, 'sine', 0.08, 0.08); tone(1040, 0.16, 'sine', 0.07, 0.16) },
    harvest() { tone(660, 0.08, 'triangle', 0.08); tone(880, 0.1, 'triangle', 0.06, 0.06) },
    research() { tone(700, 0.07, 'sine', 0.06); tone(1000, 0.09, 'sine', 0.06, 0.06); tone(1300, 0.12, 'sine', 0.05, 0.12) },
    craft() { tone(500, 0.08, 'square', 0.05); tone(700, 0.08, 'square', 0.05, 0.07); tone(1000, 0.14, 'square', 0.06, 0.14) },
    use() { tone(750, 0.07, 'triangle', 0.07); tone(1000, 0.1, 'triangle', 0.05, 0.05) },
    heal() { tone(600, 0.1, 'sine', 0.07); tone(800, 0.12, 'sine', 0.07, 0.08); tone(1000, 0.16, 'sine', 0.06, 0.16) },
    rest() { tone(400, 0.15, 'sine', 0.06); tone(500, 0.2, 'sine', 0.05, 0.1) },
    move() { noise(0.12, 0.05, 600); tone(200, 0.1, 'sine', 0.04) },
    pickup() { tone(880, 0.08, 'square', 0.05); tone(1100, 0.1, 'square', 0.04, 0.05) },
    battleStart() { tone(200, 0.2, 'sawtooth', 0.07); tone(300, 0.25, 'sawtooth', 0.06, 0.1); noise(0.3, 0.07, 700) },
    attack() { noise(0.12, 0.1, 1500); tone(120, 0.15, 'square', 0.09, 0, 80) },
    hurt() { tone(150, 0.2, 'sawtooth', 0.09, 0, 100); noise(0.15, 0.07, 600) },
    block() { tone(900, 0.06, 'square', 0.06); noise(0.06, 0.05, 3000) },
    dodge() { tone(1200, 0.08, 'sine', 0.05, 0, 1600); tone(1600, 0.1, 'sine', 0.04, 0.05, 2000) },
    healPlayer() { tone(600, 0.08, 'sine', 0.06); tone(900, 0.1, 'sine', 0.06, 0.06); tone(1200, 0.14, 'sine', 0.05, 0.12) },
    victory() { tone(523, 0.12, 'triangle', 0.07); tone(659, 0.12, 'triangle', 0.07, 0.1); tone(784, 0.2, 'triangle', 0.08, 0.2) },
    defeat() { tone(400, 0.2, 'sawtooth', 0.07, 0, 300); tone(250, 0.3, 'sawtooth', 0.07, 0.15, 180) },
    error() { tone(200, 0.15, 'square', 0.07); tone(150, 0.2, 'square', 0.06, 0.08) },
    day() { tone(440, 0.1, 'sine', 0.06); tone(660, 0.14, 'sine', 0.06, 0.1) },
    // 新增兜底
    upgrade() { tone(400, 0.07, 'square', 0.06); tone(600, 0.07, 'square', 0.06, 0.06); tone(800, 0.12, 'square', 0.06, 0.12) },
    equip() { tone(300, 0.08, 'sine', 0.07); tone(450, 0.1, 'sine', 0.06, 0.08) },
    alert() { tone(520, 0.09, 'square', 0.06); tone(390, 0.12, 'square', 0.06, 0.09) },
    switchT() { tone(600, 0.05, 'triangle', 0.05); tone(800, 0.05, 'triangle', 0.04, 0.04) },
    status() { tone(180, 0.18, 'sawtooth', 0.07, 0, 120) },
    gain() { tone(700, 0.08, 'sine', 0.07); tone(900, 0.1, 'sine', 0.07, 0.06); tone(1100, 0.14, 'sine', 0.06, 0.12) },
    boss() { tone(120, 0.4, 'sawtooth', 0.1, 0, 60); noise(0.4, 0.08, 500) },
    heavyHit() { tone(90, 0.25, 'square', 0.1, 0, 60); noise(0.2, 0.1, 800) },
    enemyDie() { noise(0.3, 0.1, 700); tone(200, 0.3, 'sine', 0.07, 0, 100) },
    powerup() { tone(200, 0.12, 'sawtooth', 0.07, 0, 400); tone(400, 0.16, 'sawtooth', 0.06, 0.1, 600) },
    extraTurn() { tone(500, 0.06, 'sine', 0.06); tone(700, 0.08, 'sine', 0.06, 0.05); tone(1000, 0.1, 'sine', 0.05, 0.1) },
  }

  // ---- 背景音乐（BGM）：按生态氛围循环播放 ----
  // 音乐来源：OpenGameArt「Dark Sci-Fi Audio Pack」by SRG774（CC0 公域，可商用免署名）
  const MUSIC_PATH = 'assets/music/'
  // 生态 → 音乐映射（按氛围分组）：sector 神秘探索 / airy 空旷高远 / pulse 律动低沉 / urgent 紧迫
  const ECO_MUSIC = {
    '营地平原': 'sector', '远古遗迹': 'sector', '幽深洞窟': 'sector', '地热裂谷': 'sector', '地脉核心': 'sector', '盐晶荒原': 'sector',
    '极高山脉': 'airy', '冰封冻野': 'airy', '星空高原': 'airy', '风蚀峡谷': 'airy', '遗忘荒漠': 'airy',
    '甲烷湖泽': 'pulse', '暗潮海岸': 'pulse', '孢子雨林': 'pulse', '腐化泥沼': 'pulse', '巨兽坟场': 'pulse', '共生森林': 'pulse',
    '熔岩深渊': 'urgent', '磁力高原': 'urgent',
  }
  const musicEls = {}
  let curMusic = null
  function musicOf(key) {
    return ECO_MUSIC[key] || 'sector'
  }
  // 直接播放指定轨道（loop 循环、音量恒定，同轨不重启）
  function playTrack(track) {
    if (curMusic === track) {
      const a = musicEls[track]
      if (a && a.paused && !muted) a.play().catch(() => {})
      return
    }
    if (curMusic && musicEls[curMusic]) musicEls[curMusic].pause()
    curMusic = track
    let a = musicEls[track]
    if (!a) {
      a = new Audio(MUSIC_PATH + track + '.mp3')
      a.loop = true
      a.volume = 0.45
      musicEls[track] = a
    }
    if (!muted) a.play().catch(() => {})
  }
  function playMusic(key) {
    playTrack(musicOf(key))
  }
  // 战斗专门 BGM：切换到高张力曲目（urgent），战斗结束后由地点音乐接管
  function playBattle() {
    playTrack('urgent')
  }
  function stopMusic() {
    if (curMusic && musicEls[curMusic]) {
      musicEls[curMusic].pause()
      musicEls[curMusic].currentTime = 0
    }
    curMusic = null
  }

  // ---- 与 loading 动画同步的"进行中"音效：动画开始起播、动画结束即停 ----
  // 每种动作类型对应一种轻量工作音色（间隔播报），避免使用文件循环造成的突兀感
  let actionTick = null
  function actionTickFn(kind) {
    const map = {
      explore: () => { noise(0.2, 0.045, 700); tone(220, 0.16, 'sine', 0.03, 0, 150) }, // 沙沙探索
      harvest: () => { noise(0.06, 0.06, 2400); tone(500, 0.05, 'triangle', 0.04) }, // 采集敲击
      craft: () => { tone(300, 0.08, 'square', 0.03); noise(0.05, 0.04, 1200) }, // 制作敲打
      research: () => { tone(620, 0.05, 'sine', 0.03); tone(820, 0.05, 'sine', 0.03, 0.04) }, // 星之记忆读写
      rest: () => { tone(330, 0.28, 'sine', 0.035) }, // 舒缓呼吸
      move: () => { noise(0.09, 0.045, 500); tone(180, 0.08, 'sine', 0.03) }, // 脚步移动
      use: () => { tone(420, 0.07, 'triangle', 0.035) }, // 使用物品
    }
    return (map[kind] || map.use || map.explore)
  }
  function startActionLoop(kind) {
    stopActionLoop()
    if (muted) return
    const fn = actionTickFn(kind)
    fn()
    actionTick = setInterval(fn, 420)
  }
  function stopActionLoop() {
    if (actionTick) {
      clearInterval(actionTick)
      actionTick = null
    }
  }

  return {
    setMuted(m) {
      muted = m
      if (m) {
        stopActionLoop()
        for (const k in musicEls) musicEls[k].pause()
      } else if (curMusic && musicEls[curMusic]) {
        musicEls[curMusic].play().catch(() => {})
      }
    },
    // 交互音效：文件优先，合成兜底
    click: fileOr('click-button', syn.click),
    open: fileOr('pop-sound', syn.open),
    close: fileOr('ui-back-sound', syn.close),
    explore: fileOr(['swish-1', 'swoosh-fast-1'], syn.explore),
    discover: fileOr('chime', syn.discover),
    harvest: fileOr(['pop-sound', 'ui-sound-3'], syn.harvest),
    research: fileOr('riser-1', syn.research),
    craft: fileOr('ui-sound-6', syn.craft),
    use: fileOr('ui-sound-7', syn.use),
    heal: fileOr('ui-sound-8', syn.heal),
    rest: fileOr('ui-sound', syn.rest),
    move: fileOr('swipe', syn.move),
    pickup: fileOr('ui-sound-4', syn.pickup),
    battleStart: fileOr('game-start', syn.battleStart),
    attack: fileOr(['impact-hit', 'impact-hit-1', 'impact-hit-2', 'impact-hit-3'], syn.attack),
    hurt: fileOr('deep-hit', syn.hurt),
    block: fileOr('swoosh-sharp-hit', syn.block),
    dodge: fileOr('hover', syn.dodge),
    healPlayer: fileOr('ui-sound-8', syn.healPlayer),
    victory: fileOr('whoosh-achievement', syn.victory),
    defeat: fileOr('dramatic-impact', syn.defeat),
    error: fileOr('ui-sound-off', syn.error),
    day: fileOr('notification-1', syn.day),
    // 新增交互音效
    upgrade: fileOr('riser-2', syn.upgrade), // 卡牌升级
    equip: fileOr('button-pressed', syn.equip), // 移植器官 / 装备
    alert: fileOr('notification-1', syn.alert), // 警告弹窗（耐力不足等）
    switchT: fileOr('ui-sound-4', syn.switchT), // 弹窗 tab 切换
    status: fileOr('ui-sound-off', syn.status), // 负面状态触发
    gain: fileOr('apple-pay-success', syn.gain), // 获得核心 / 星之记忆 / 奖励
    boss: fileOr('cinematic-bang', syn.boss), // 超级生物 / boss 战
    heavyHit: fileOr(['deep-hit-2', 'impact-and-subdrop'], syn.heavyHit), // 重击命中
    enemyDie: fileOr('impact-hit-launch', syn.enemyDie), // 敌人倒下
    powerup: fileOr('dramatic-buildup-1', syn.powerup), // 敌人狂暴 / 蓄力
    extraTurn: fileOr('swoosh', syn.extraTurn), // 风袭额外回合
    // 背景音乐：play(生态名或轨道名) / battle(战斗专用) / stop
    music: { play: playMusic, battle: playBattle, stop: stopMusic },
    // 与 loading 动画同步的"进行中"音效
    startActionLoop,
    stopActionLoop,
  }
})()
