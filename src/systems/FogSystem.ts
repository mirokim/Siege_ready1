import Phaser from 'phaser'
import { ZONE_ENEMY_BOTTOM, ZONE_NML_BOTTOM, COLOR } from '../constants'
import { w2s, WORLD_W } from '../utils/IsoUtils'

// 아이소메트릭 구역을 다이아몬드 폴리곤으로 안개 적용
// depth 50 — 엔티티(20) 위, 잔향(55) 아래
export class FogSystem {
  private fogGfx: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene) {
    this.fogGfx = scene.add.graphics()
    this.fogGfx.setDepth(50)
    this.draw()
  }

  private draw() {
    this.fogGfx.clear()

    // 적 구역 폴리곤 (wy 0 ~ ZONE_ENEMY_BOTTOM)
    const ezTL = w2s(0,      0)
    const ezTR = w2s(WORLD_W, 0)
    const ezBR = w2s(WORLD_W, ZONE_ENEMY_BOTTOM)
    const ezBL = w2s(0,      ZONE_ENEMY_BOTTOM)
    this.fogGfx.fillStyle(COLOR.FOG, 0.96)
    this.fogGfx.fillPoints([ezTL, ezTR, ezBR, ezBL], true)

    // NML 폴리곤 (wy ZONE_ENEMY_BOTTOM ~ ZONE_NML_BOTTOM)
    const nmlTL = ezBL
    const nmlTR = ezBR
    const nmlBR = w2s(WORLD_W, ZONE_NML_BOTTOM)
    const nmlBL = w2s(0,      ZONE_NML_BOTTOM)
    this.fogGfx.fillStyle(COLOR.FOG, 0.52)
    this.fogGfx.fillPoints([nmlTL, nmlTR, nmlBR, nmlBL], true)
  }
}
