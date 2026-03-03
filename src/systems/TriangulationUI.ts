import Phaser from 'phaser'
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLOR } from '../constants'
import { w2s } from '../utils/IsoUtils'

interface ShotRecord {
  // 스크린 공간 기록 (iso 변환 후)
  ox: number; oy: number
  dx: number; dy: number   // 정규화 방향벡터
  timestamp: number
}

const LINE_FADE_MS = 20000
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
    this.linesGfx.setDepth(56)
    this.arrowGfx = scene.add.graphics()
    this.arrowGfx.setDepth(65)
  }

  showDirectionArrow(eWX: number, eWY: number, pWX: number, pWY: number) {
    const es = w2s(eWX, eWY)
    const ps = w2s(pWX, pWY)
    this.arrowAngle = Math.atan2(es.y - ps.y, es.x - ps.x)
    this.arrowVisible = true
    this.arrowTimer = 2500
  }

  recordShot(eWX: number, eWY: number, pWX: number, pWY: number) {
    const es = w2s(eWX, eWY)
    const ps = w2s(pWX, pWY)
    const dx = es.x - ps.x
    const dy = es.y - ps.y
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    this.shots.push({ ox: ps.x, oy: ps.y, dx: dx / len, dy: dy / len, timestamp: this.scene.time.now })
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
      const t = this.rayDistance(shot.ox, shot.oy, shot.dx, shot.dy)
      this.linesGfx.strokeLineShape(new Phaser.Geom.Line(
        shot.ox, shot.oy,
        shot.ox + shot.dx * t, shot.oy + shot.dy * t,
      ))
    }
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
    const { x: clx, y: cly } = this.clipToScreen(cx, cy, ax, ay)
    const size = 22
    const a = this.arrowAngle
    const p1x = clx + Math.cos(a) * size
    const p1y = cly + Math.sin(a) * size
    const p2x = clx + Math.cos(a + 2.4) * (size * 0.6)
    const p2y = cly + Math.sin(a + 2.4) * (size * 0.6)
    const p3x = clx + Math.cos(a - 2.4) * (size * 0.6)
    const p3y = cly + Math.sin(a - 2.4) * (size * 0.6)
    this.arrowGfx.fillStyle(COLOR.DIRECTION_ARROW, alpha)
    this.arrowGfx.fillTriangle(p1x, p1y, p2x, p2y, p3x, p3y)
    this.arrowGfx.lineStyle(2, 0xffffff, alpha * 0.5)
    this.arrowGfx.strokeTriangle(p1x, p1y, p2x, p2y, p3x, p3y)
  }

  private clipToScreen(_ox: number, _oy: number, x1: number, y1: number) {
    const m = 40
    return { x: Phaser.Math.Clamp(x1, m, CANVAS_WIDTH - m), y: Phaser.Math.Clamp(y1, m, CANVAS_HEIGHT - m) }
  }

  private findIntersection(a: ShotRecord, b: ShotRecord) {
    const denom = a.dx * b.dy - a.dy * b.dx
    if (Math.abs(denom) < 0.001) return null
    const relX = b.ox - a.ox
    const relY = b.oy - a.oy
    const t = (relX * b.dy - relY * b.dx) / denom
    return { x: a.ox + a.dx * t, y: a.oy + a.dy * t }
  }

  private rayDistance(ox: number, oy: number, dx: number, dy: number): number {
    const ts: number[] = []
    if (Math.abs(dx) > 0.001) ts.push((0 - ox) / dx, (CANVAS_WIDTH - ox) / dx)
    if (Math.abs(dy) > 0.001) ts.push((0 - oy) / dy, (CANVAS_HEIGHT - oy) / dy)
    const pos = ts.filter(t => t > 0)
    return pos.length ? Math.min(...pos) : 9999
  }
}
