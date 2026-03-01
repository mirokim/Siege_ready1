import Phaser from 'phaser'
import {
  CANVAS_WIDTH,
  ZONE_ENEMY_BOTTOM, ZONE_NML_BOTTOM,
  COLOR,
} from '../constants'

// 안개 레이어: 적 구역 완전 안개, NML 반투명, 플레이어 구역 투명
export class FogSystem {
  private fogGfx: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene) {
    this.fogGfx = scene.add.graphics()
    this.fogGfx.setDepth(50)
    this.draw()
  }

  private draw() {
    this.fogGfx.clear()

    // 적 구역 — 짙은 안개 (알파 0.88)
    this.fogGfx.fillStyle(COLOR.FOG, 0.88)
    this.fogGfx.fillRect(0, ZONE_ENEMY_BOTTOM, CANVAS_WIDTH, ZONE_ENEMY_BOTTOM)

    // 적 구역 상단 (y 0 ~ ZONE_ENEMY_BOTTOM)
    this.fogGfx.fillStyle(COLOR.FOG, 0.88)
    this.fogGfx.fillRect(0, 0, CANVAS_WIDTH, ZONE_ENEMY_BOTTOM)

    // No Man's Land — 옅은 안개 (알파 0.35)
    this.fogGfx.fillStyle(COLOR.FOG, 0.35)
    this.fogGfx.fillRect(0, ZONE_ENEMY_BOTTOM, CANVAS_WIDTH, ZONE_NML_BOTTOM - ZONE_ENEMY_BOTTOM)

    // 플레이어 구역 — 안개 없음
  }

  // 호출 시 안개 다시 그리기 (향후 동적 안개 제거에 사용)
  update() {
    this.draw()
  }
}
