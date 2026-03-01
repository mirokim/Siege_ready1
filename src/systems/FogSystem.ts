import Phaser from 'phaser'
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  ZONE_ENEMY_BOTTOM, ZONE_NML_BOTTOM,
  COLOR,
} from '../constants'

// 안개 레이어: 적 구역 거의 불투명, NML 반투명, 플레이어 구역 없음
// depth 50 — 엔티티(20) 위, 잔향(55)/HUD(60) 아래
export class FogSystem {
  private fogGfx: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene) {
    this.fogGfx = scene.add.graphics()
    this.fogGfx.setDepth(50)
    this.draw()
  }

  private draw() {
    this.fogGfx.clear()

    // 적 구역 — 짙은 안개 (α 0.96 → 적이 거의 안 보임)
    this.fogGfx.fillStyle(COLOR.FOG, 0.96)
    this.fogGfx.fillRect(0, 0, CANVAS_WIDTH, ZONE_ENEMY_BOTTOM)

    // No Man's Land — 옅은 안개 (α 0.55)
    this.fogGfx.fillStyle(COLOR.FOG, 0.55)
    this.fogGfx.fillRect(0, ZONE_ENEMY_BOTTOM, CANVAS_WIDTH, ZONE_NML_BOTTOM - ZONE_ENEMY_BOTTOM)

    // 플레이어 구역 — 안개 없음
    void CANVAS_HEIGHT
  }

  update() {
    this.draw()
  }
}
