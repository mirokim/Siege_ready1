import Phaser from 'phaser'
import { ECHO_DURATION_MS, ECHO_PHASES, getEchoSize, COLOR } from '../constants'
import { w2s } from '../utils/IsoUtils'

interface EchoEntry {
  wx: number
  wy: number
  phase: number
  elapsed: number
  isEnemy: boolean
}

const RADIUS_TABLE: Record<number, number[]> = {
  0: [0, 0, 0],
  1: [32, 24, 16],
  2: [56, 40, 24],
}

export class EchoSystem {
  private echoes: EchoEntry[] = []
  private gfx: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics()
    this.gfx.setDepth(55)
  }

  createEcho(wx: number, wy: number, distCells: number, isEnemy = false) {
    const sizeGrade = getEchoSize(distCells)
    if (sizeGrade === 0) return
    this.echoes.push({ wx, wy, phase: 0, elapsed: 0, isEnemy })
  }

  update(delta: number) {
    for (const echo of this.echoes) {
      echo.elapsed += delta
      if (echo.elapsed >= ECHO_DURATION_MS) {
        echo.elapsed = 0
        echo.phase++
      }
    }
    this.echoes = this.echoes.filter(e => e.phase < ECHO_PHASES)
    this.draw()
  }

  private draw() {
    this.gfx.clear()
    for (const echo of this.echoes) {
      const radii = RADIUS_TABLE[1]
      const radius = radii[echo.phase]
      const alpha = [0.7, 0.4, 0.2][echo.phase]
      const color = echo.isEnemy ? COLOR.ENEMY_PROJ : COLOR.ECHO_STRONG
      const { x: sx, y: sy } = w2s(echo.wx, echo.wy)

      this.gfx.lineStyle(2, color, alpha)
      this.gfx.strokeCircle(sx, sy, radius)

      if (echo.phase === 0) {
        this.gfx.fillStyle(color, alpha * 0.3)
        this.gfx.fillCircle(sx, sy, radius * 0.5)
      }

      this.gfx.lineStyle(1, color, alpha * 0.8)
      const cs = 6
      this.gfx.strokeRect(sx - cs / 2, sy - cs / 2, cs, cs)
    }
  }

  getEchoes() { return this.echoes }
}
