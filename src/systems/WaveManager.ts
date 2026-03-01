import Phaser from 'phaser'
import { Infantry } from '../entities/Infantry'
import { CANVAS_WIDTH, ZONE_ENEMY_BOTTOM, WAVE_INTERVAL_MS } from '../constants'

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
    this.waveTimer = 4000  // 4초 후 첫 웨이브
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

    // 웨이브당 1~3개 그룹, 각 그룹은 맵 전체 너비에서 완전 랜덤 X 선택
    const groupCount = 1 + Math.floor(Math.random() * 3)
    const countPerGroup = Math.min(2 + Math.floor(this.waveNumber / 2), 5)

    for (let g = 0; g < groupCount; g++) {
      // 그룹 X: 양끝 80px 제외한 전체 너비에서 랜덤
      const baseX = 80 + Math.random() * (CANVAS_WIDTH - 160)

      for (let i = 0; i < countPerGroup; i++) {
        // 그룹 내 개체 간격: 최대 ±50px 분산
        const spawnX = Phaser.Math.Clamp(
          baseX + (Math.random() - 0.5) * 100,
          40,
          CANVAS_WIDTH - 40,
        )
        // Y: NML 시작점에서 약간 들어온 위치부터 그룹 간격
        const spawnY = ZONE_ENEMY_BOTTOM + 20 + i * 20
        this.minions.push(new Infantry(this.scene, spawnX, spawnY))
      }
    }
  }

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
