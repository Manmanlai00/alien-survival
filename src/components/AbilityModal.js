/* 特殊能力弹窗 */
window.GAME = window.GAME || {}
window.GAME.components = window.GAME.components || {}

window.GAME.components.AbilityModal = {
  template: `
    <div v-if="ui.modal === 'ability'" class="modal-overlay">
      <div class="modal-box">
        <div class="modal-head">
          <h3>特殊能力</h3>
          <button class="btn cancel modal-close" @click="closeModal">关闭</button>
        </div>
        <div v-if="ability" class="ability-info">
          <div class="ability-name">{{ ability.name }}</div>
          <div class="ability-desc">{{ ability.desc }}</div>
          <button class="btn ability big" :disabled="player.abilityCooldown > 0 || !canAbility" @click="useAbility">
            {{ player.abilityCooldown > 0 ? '还需 ' + player.abilityCooldown + ' 天恢复' : '使用（' + ability.time + '时间）' }}
          </button>
        </div>
        <div v-else class="modal-empty">尚未获得特殊能力</div>
      </div>
    </div>
  `,
  setup() {
    const S = window.GAME.store
    const { computed } = Vue
    const ability = computed(() => S.getCharacterAbility())
    const canAbility = computed(() => (ability.value ? S.canPay(ability.value.time, 0) : false))
    return {
      ui: S.ui,
      player: S.player,
      ability,
      canAbility,
      useAbility: S.useAbility,
      closeModal: S.closeModal,
    }
  },
}
