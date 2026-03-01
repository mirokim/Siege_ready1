import Phaser from 'phaser'
import { Infantry } from '../entities/Infantry'
import { LANES, ZONE_ENEMY_BOTTOM, WAVE_INTERVAL_MS } from '../constants'

export class WaveManager {
  private minions: Infantry[] = []
  private waveTimer = 0
  private waveNumber = 0
  private onMinionReachBase?: (dmg: number) => void

  constructor(
    private scene: Phaser.Scene,
    onMinionReachBase?: (dmg: number) => void,
  ) {
    this.onMinionReachBase = onMinionReachBase
    this.waveTimer = 3000  // 3초 후 첫 웨이브
  }

  update(delta: number) {
    this.waveTimer -= delta
    if (this.waveTimer <= 0) {
      this.spawnWave()
      this.waveTimer = WAVE_INTERVAL_MS
    }

    for (const m of this.minions) {
      m.update(delta)
      if (m.hasReachedBase()) {
        this.onMinionReachBase?.(m.baseDamage)
      }
    }

    // 죽거나 기지 도달한 미니언 제거
    this.minions = this.minions.filter(m => {
      if (m.isDead()) {
        m.destroy()
        return false
      }
      return true
    })
  }

  private spawnWave() {
    this.waveNumber++

    // 스테이지 초기: 랜덤 레인 2개에 보병 분대 3기씩
    const count = Math.min(3 + this.waveNumber, 6)
    const lanesUsed = this.waveNumber % 2 === 0
      ? [LANES[0], LANES[2]]
      : [LANES[1]]

    for (const laneX of lanesUsed) {
      for (let i = 0; i < count; i++) {
        const spawnX = laneX + (Math.random() - 0.5) * 40
        const spawnY = ZONE_ENEMY_BOTTOM + 20 + i * 24
        const m = new Infantry(this.scene, spawnX, spawnY)
        this.minions.push(m)
      }
    }
  }

  /**
   * 착탄 좌표로 미니언에 스플래시 데미지
   */
  applySplashDamage(hitX: number, hitY: number, splashRadius: number, damage: number) {
    for (const m of this.minions) {
      if (m.getSplashHitCheck(hitX, hitY, splashRadius)) {
        m.takeDamage(damage)
      }
    }
  }

  getMinions() { return this.minions }
  getWaveNumber() { return this.waveNumber }
}
