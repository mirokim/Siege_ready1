import Phaser from 'phaser'
import { Infantry } from '../entities/Infantry'
import { ZONE_ENEMY_BOTTOM, WAVE_INTERVAL_MS } from '../constants'
import { WORLD_W } from '../utils/IsoUtils'

export class WaveManager {
  private minions: Infantry[] = []
  private waveTimer = 4000
  private waveNumber = 0
  private onMinionReachBase?: (dmg: number) => void

  constructor(private scene: Phaser.Scene, onMinionReachBase?: (dmg: number) => void) {
    this.onMinionReachBase = onMinionReachBase
  }

  update(delta: number) {
    this.waveTimer -= delta
    if (this.waveTimer <= 0) {
      this.spawnWave()
      this.waveTimer = WAVE_INTERVAL_MS
    }

    for (const m of this.minions) {
      m.update(delta)
      if (m.hasReachedBase()) this.onMinionReachBase?.(m.baseDamage)
    }

    this.minions = this.minions.filter(m => {
      if (m.isDead()) { m.destroy(); return false }
      return true
    })
  }

  private spawnWave() {
    this.waveNumber++
    const groupCount = 1 + Math.floor(Math.random() * 3)
    const countPerGroup = Math.min(2 + Math.floor(this.waveNumber / 2), 5)

    for (let g = 0; g < groupCount; g++) {
      const baseX = 1 + Math.random() * (WORLD_W - 2)
      for (let i = 0; i < countPerGroup; i++) {
        const spawnX = Phaser.Math.Clamp(baseX + (Math.random() - 0.5) * 3, 0.5, WORLD_W - 0.5)
        const spawnY = ZONE_ENEMY_BOTTOM + 0.2 + i * 0.4
        this.minions.push(new Infantry(this.scene, spawnX, spawnY))
      }
    }
  }

  applySplashDamage(hitX: number, hitY: number, splashRadius: number, damage: number) {
    for (const m of this.minions) {
      if (m.getSplashHitCheck(hitX, hitY, splashRadius)) m.takeDamage(damage)
    }
  }

  getMinions() { return this.minions }
  getWaveNumber() { return this.waveNumber }
}
