export enum GamePhase {
  SCOUT = 'SCOUT',
  DUEL  = 'DUEL',
  RESULT = 'RESULT',
}

export class PhaseManager {
  private phase: GamePhase = GamePhase.SCOUT
  private onPhaseChange?: (phase: GamePhase) => void

  setOnPhaseChange(cb: (phase: GamePhase) => void) {
    this.onPhaseChange = cb
  }

  getPhase() { return this.phase }

  transitionTo(next: GamePhase) {
    if (this.phase === next) return
    this.phase = next
    this.onPhaseChange?.(next)
  }

  isScout() { return this.phase === GamePhase.SCOUT }
  isDuel()  { return this.phase === GamePhase.DUEL  }
}
