import Phaser from 'phaser'
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLOR } from '../constants'

interface ShotRecord {
  // 방향선: 적 발사 위치 → 플레이어 위치 방향으로 연장
  originX: number
  originY: number
  dirX: number   // 정규화된 방향벡터
  dirY: number
  timestamp: number
}

const LINE_FADE_MS = 20000  // 방향선 20초 후 소멸
const ESTIMATE_MARKER_R = 16

export class TriangulationUI {
  private linesGfx: Phaser.GameObjects.Graphics
  private arrowGfx: Phaser.GameObjects.Graphics
  private shots: ShotRecord[] = []
  private arrowVisible = false
  private arrowAngle = 0
  private arrowTimer = 0

  constructor(private scene: Phaser.Scene) {
    this.linesGfx = scene.add.graphics()
    this.linesGfx.setDepth(56)  // 안개(50) 위
    this.arrowGfx = scene.add.graphics()
    this.arrowGfx.setDepth(65)  // 안개 + 잔향 위
  }

  /**
   * 적이 포격 준비 중 — 화면 가장자리 방향 화살표 표시
   * @param enemyX, enemyY — 적 위치 (추정치 or 실제)
   * @param playerX, playerY — 플레이어 위치
   */
  showDirectionArrow(enemyX: number, enemyY: number, playerX: number, playerY: number) {
    const dx = enemyX - playerX
    const dy = enemyY - playerY
    this.arrowAngle = Math.atan2(dy, dx)
    this.arrowVisible = true
    this.arrowTimer = 2500  // 2.5초 표시
  }

  /**
   * 포탄 발사 확인 — 방향선 맵에 기록
   */
  recordShot(enemyX: number, enemyY: number, playerX: number, playerY: number) {
    const dx = playerX - enemyX
    const dy = playerY - enemyY
    const len = Math.sqrt(dx * dx + dy * dy)
    this.shots.push({
      originX: playerX,
      originY: playerY,
      dirX: dx / len,
      dirY: dy / len,
      timestamp: this.scene.time.now,
    })
    this.arrowVisible = false
  }

  update(delta: number) {
    const now = this.scene.time.now
    this.shots = this.shots.filter(s => now - s.timestamp < LINE_FADE_MS)

    if (this.arrowVisible) {
      this.arrowTimer -= delta
      if (this.arrowTimer <= 0) this.arrowVisible = false
    }

    this.drawLines(now)
    this.drawArrow()
  }

  private drawLines(now: number) {
    this.linesGfx.clear()

    for (const shot of this.shots) {
      const age = now - shot.timestamp
      const alpha = Math.max(0, 1 - age / LINE_FADE_MS) * 0.7

      this.linesGfx.lineStyle(1, COLOR.TRIANGULATION, alpha)

      // 방향선: 플레이어 위치에서 적 방향으로 화면 끝까지
      const t = this.rayDistance(shot.originX, shot.originY, shot.dirX, shot.dirY)
      this.linesGfx.strokeLineShape(
        new Phaser.Geom.Line(
          shot.originX,
          shot.originY,
          shot.originX + shot.dirX * t,
          shot.originY + shot.dirY * t,
        ),
      )
    }

    // 2개 이상 방향선 교차점 계산 → 추정 마커
    if (this.shots.length >= 2) {
      const intersect = this.findIntersection(
        this.shots[this.shots.length - 2],
        this.shots[this.shots.length - 1],
      )
      if (intersect) {
        const age = now - this.shots[this.shots.length - 1].timestamp
        const a = Math.max(0, 1 - age / LINE_FADE_MS) * 0.9
        this.linesGfx.lineStyle(2, COLOR.TRIANGULATION, a)
        this.linesGfx.strokeCircle(intersect.x, intersect.y, ESTIMATE_MARKER_R)
        this.linesGfx.fillStyle(COLOR.TRIANGULATION, a * 0.4)
        this.linesGfx.fillCircle(intersect.x, intersect.y, ESTIMATE_MARKER_R * 0.5)
      }
    }
  }

  private drawArrow() {
    this.arrowGfx.clear()
    if (!this.arrowVisible) return

    const alpha = Math.min(1, this.arrowTimer / 1000) * 0.9
    const cx = CANVAS_WIDTH / 2
    const cy = CANVAS_HEIGHT / 2
    const edgeDist = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.45

    const ax = cx + Math.cos(this.arrowAngle) * edgeDist
    const ay = cy + Math.sin(this.arrowAngle) * edgeDist
    // 화면 클리핑
    const clipped = this.clipToScreen(cx, cy, ax, ay)

    const size = 20
    const angle = this.arrowAngle
    const p1x = clipped.x + Math.cos(angle) * size
    const p1y = clipped.y + Math.sin(angle) * size
    const p2x = clipped.x + Math.cos(angle + 2.4) * (size * 0.6)
    const p2y = clipped.y + Math.sin(angle + 2.4) * (size * 0.6)
    const p3x = clipped.x + Math.cos(angle - 2.4) * (size * 0.6)
    const p3y = clipped.y + Math.sin(angle - 2.4) * (size * 0.6)

    this.arrowGfx.fillStyle(COLOR.DIRECTION_ARROW, alpha)
    this.arrowGfx.fillTriangle(p1x, p1y, p2x, p2y, p3x, p3y)
    this.arrowGfx.lineStyle(2, 0xffffff, alpha * 0.5)
    this.arrowGfx.strokeTriangle(p1x, p1y, p2x, p2y, p3x, p3y)
  }

  // 선분이 화면 밖으로 나가는 경우 클리핑
  private clipToScreen(_x0: number, _y0: number, x1: number, y1: number) {
    const margin = 40
    const cx = Phaser.Math.Clamp(x1, margin, CANVAS_WIDTH - margin)
    const cy = Phaser.Math.Clamp(y1, margin, CANVAS_HEIGHT - margin)
    return { x: cx, y: cy }
  }

  // 두 방향선의 교차점 계산 (무한 직선)
  private findIntersection(a: ShotRecord, b: ShotRecord) {
    const denom = a.dirX * b.dirY - a.dirY * b.dirX
    if (Math.abs(denom) < 0.001) return null  // 평행

    const dx = b.originX - a.originX
    const dy = b.originY - a.originY
    const t = (dx * b.dirY - dy * b.dirX) / denom

    return {
      x: a.originX + a.dirX * t,
      y: a.originY + a.dirY * t,
    }
  }

  // 원점에서 방향으로 화면 경계까지의 거리
  private rayDistance(ox: number, oy: number, dx: number, dy: number): number {
    const ts: number[] = []
    if (Math.abs(dx) > 0.001) {
      ts.push((0 - ox) / dx, (CANVAS_WIDTH - ox) / dx)
    }
    if (Math.abs(dy) > 0.001) {
      ts.push((0 - oy) / dy, (CANVAS_HEIGHT - oy) / dy)
    }
    const pos = ts.filter(t => t > 0)
    return pos.length ? Math.min(...pos) : 9999
  }
}
