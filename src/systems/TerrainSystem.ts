import Phaser from 'phaser'
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  ZONE_ENEMY_BOTTOM, ZONE_NML_BOTTOM,
  COLOR,
} from '../constants'

export interface TerrainRect {
  x: number
  y: number
  w: number
  h: number
  type: 'cover' | 'rock' | 'ruin'
}

// depth 5 — 배경(0) 위, 엔티티(20) 아래
export class TerrainSystem {
  private gfx: Phaser.GameObjects.Graphics
  readonly obstacles: TerrainRect[] = []

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics()
    this.gfx.setDepth(5)
    this.generate()
    this.draw()
  }

  private generate() {
    // ── 플레이어 구역 — 엄폐물/참호 (10~14개) ────────────────────
    const coverCount = 10 + Math.floor(Math.random() * 5)
    const playerZoneH = CANVAS_HEIGHT - ZONE_NML_BOTTOM

    for (let i = 0; i < coverCount; i++) {
      const w = 80 + Math.random() * 120
      const h = 28 + Math.random() * 40
      this.obstacles.push({
        type: 'cover',
        x: 60 + Math.random() * (CANVAS_WIDTH - 120 - w),
        y: ZONE_NML_BOTTOM + 50 + Math.random() * (playerZoneH - 160),
        w,
        h,
      })
    }

    // ── No Man's Land — 잔해/바위 클러스터 (7~10개) ──────────────
    const nmlH = ZONE_NML_BOTTOM - ZONE_ENEMY_BOTTOM
    const rockCount = 7 + Math.floor(Math.random() * 4)

    for (let i = 0; i < rockCount; i++) {
      const isBig = Math.random() < 0.35
      const w = isBig ? 80 + Math.random() * 80 : 30 + Math.random() * 50
      const h = isBig ? 32 + Math.random() * 30 : 18 + Math.random() * 22
      this.obstacles.push({
        type: Math.random() < 0.5 ? 'rock' : 'ruin',
        x: 60 + Math.random() * (CANVAS_WIDTH - 120 - w),
        y: ZONE_ENEMY_BOTTOM + 20 + Math.random() * (nmlH - h - 40),
        w,
        h,
      })
    }
  }

  private draw() {
    this.gfx.clear()
    for (const obs of this.obstacles) {
      switch (obs.type) {
        case 'cover':
          this.drawCover(obs)
          break
        case 'rock':
          this.drawRock(obs)
          break
        case 'ruin':
          this.drawRuin(obs)
          break
      }
    }
  }

  private drawCover(o: TerrainRect) {
    // 콘크리트 방호벽
    this.gfx.fillStyle(COLOR.TERRAIN_COVER, 1)
    this.gfx.fillRect(o.x, o.y, o.w, o.h)
    // 상단 하이라이트
    this.gfx.fillStyle(0x5c6450, 1)
    this.gfx.fillRect(o.x + 2, o.y + 2, o.w - 4, 8)
    // 좌측 음영
    this.gfx.fillStyle(0x363d2e, 0.7)
    this.gfx.fillRect(o.x, o.y, 5, o.h)
    // 테두리
    this.gfx.lineStyle(1, 0x666655, 0.9)
    this.gfx.strokeRect(o.x, o.y, o.w, o.h)
  }

  private drawRock(o: TerrainRect) {
    // 불규칙 바위 (사각형 + 오버레이로 근사)
    this.gfx.fillStyle(COLOR.TERRAIN_ROCK, 1)
    this.gfx.fillRect(o.x, o.y, o.w, o.h)
    // 내부 밝은 부분
    this.gfx.fillStyle(0x4a4a38, 0.8)
    this.gfx.fillRect(o.x + 4, o.y + 3, o.w * 0.55, o.h * 0.45)
    // 균열선
    this.gfx.lineStyle(1, 0x2a2a20, 0.9)
    this.gfx.strokeRect(o.x, o.y, o.w, o.h)
    this.gfx.lineStyle(1, 0x222218, 0.5)
    this.gfx.strokeLineShape(new Phaser.Geom.Line(
      o.x + o.w * 0.3, o.y + 2,
      o.x + o.w * 0.5, o.y + o.h - 2,
    ))
  }

  private drawRuin(o: TerrainRect) {
    // 폐허 (부서진 벽)
    const segW = o.w / 3
    for (let s = 0; s < 3; s++) {
      if (Math.random() < 0.25) continue  // 일부 세그먼트 없음 → 부서진 느낌
      const sx = o.x + s * segW
      const sh = o.h * (0.5 + Math.random() * 0.5)
      const sy = o.y + (o.h - sh)
      this.gfx.fillStyle(0x454535, 1)
      this.gfx.fillRect(sx, sy, segW - 2, sh)
      this.gfx.fillStyle(0x555545, 0.5)
      this.gfx.fillRect(sx + 2, sy + 2, segW * 0.5, sh * 0.3)
      this.gfx.lineStyle(1, 0x333325, 0.8)
      this.gfx.strokeRect(sx, sy, segW - 2, sh)
    }
  }
}
