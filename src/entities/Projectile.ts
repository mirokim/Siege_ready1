import Phaser from 'phaser'
import {
  SPLASH_RADIUS, PROJECTILE_DAMAGE, MINION_PROJECTILE_DAMAGE,
  getFlightTime, COLOR,
} from '../constants'
import { w2s, worldDist } from '../utils/IsoUtils'

export type ProjectileOwner = 'player' | 'enemy'

export class Projectile extends Phaser.GameObjects.GameObject {
  private gfx: Phaser.GameObjects.Graphics
  private splashGfx: Phaser.GameObjects.Graphics

  // world 셀 좌표
  private startX: number
  private startY: number
  private targetX: number
  private targetY: number

  private flightMs: number
  private elapsed = 0
  private done = false
  private splashTimer = 0
  private splashActive = false
  private arcHeight: number   // 스크린 픽셀 단위 최대 호 높이

  readonly owner: ProjectileOwner
  readonly damage: number
  private onHit?: (x: number, y: number, owner: ProjectileOwner) => void

  constructor(
    scene: Phaser.Scene,
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    owner: ProjectileOwner,
    onHit?: (x: number, y: number, owner: ProjectileOwner) => void,
  ) {
    super(scene, 'Projectile')
    scene.add.existing(this)

    this.startX  = startX
    this.targetX = targetX
    this.startY  = startY
    this.targetY = targetY
    this.owner   = owner
    this.onHit   = onHit
    this.damage  = owner === 'player' ? PROJECTILE_DAMAGE : MINION_PROJECTILE_DAMAGE

    const dist = worldDist(startX, startY, targetX, targetY)
    const rawFlight = getFlightTime(dist)
    this.flightMs = Math.max(rawFlight, dist * 60, 200)
    this.arcHeight = Math.min(dist * 8, 120)  // 셀당 8px, 최대 120px

    this.gfx = scene.add.graphics()
    this.gfx.setDepth(45)
    this.splashGfx = scene.add.graphics()
    this.splashGfx.setDepth(44)
  }

  update(delta: number) {
    if (this.done) {
      if (this.splashActive) {
        this.splashTimer -= delta
        const alpha = Math.max(0, this.splashTimer / 400)
        this.drawSplash(alpha)
        if (this.splashTimer <= 0) {
          this.splashActive = false
        }
      }
      return
    }

    this.elapsed += delta
    const t = Math.min(this.elapsed / this.flightMs, 1)

    // world 좌표 보간
    const wx = Phaser.Math.Linear(this.startX, this.targetX, t)
    const wy = Phaser.Math.Linear(this.startY, this.targetY, t)

    // 스크린 위치 + 호 오프셋 (위로 솟는 포물선)
    const { x: sx, y: sy } = w2s(wx, wy)
    const arcOffset = -Math.sin(t * Math.PI) * this.arcHeight

    this.drawBullet(sx, sy + arcOffset)

    if (t >= 1) {
      this.done = true
      this.gfx.clear()
      this.onHit?.(this.targetX, this.targetY, this.owner)
      this.splashActive = true
      this.splashTimer = 400
      this.drawSplash(1)
    }
  }

  private drawBullet(sx: number, sy: number) {
    this.gfx.clear()
    const color = this.owner === 'player' ? COLOR.PROJECTILE : COLOR.ENEMY_PROJ
    this.gfx.fillStyle(color, 1)
    this.gfx.fillCircle(sx, sy, 5)
    // 잔상
    const { x: tx, y: ty } = w2s(this.targetX, this.targetY)
    const { x: ox, y: oy } = w2s(this.startX, this.startY)
    const trailDx = (tx - ox) * 0.02
    const trailDy = (ty - oy) * 0.02
    this.gfx.fillStyle(color, 0.3)
    this.gfx.fillCircle(sx - trailDx, sy - trailDy, 3)
  }

  private drawSplash(alpha: number) {
    this.splashGfx.clear()
    if (alpha <= 0) return

    const { x: sx, y: sy } = w2s(this.targetX, this.targetY)
    // 스플래시 반지름을 스크린 픽셀로 변환 (SPLASH_RADIUS 셀 * 32px/셀 근사)
    const splashPx = SPLASH_RADIUS * 32
    const color = this.owner === 'player' ? COLOR.PROJECTILE : COLOR.ENEMY_PROJ
    this.splashGfx.lineStyle(2, color, alpha)
    this.splashGfx.strokeCircle(sx, sy, splashPx * alpha)
    this.splashGfx.fillStyle(color, alpha * 0.2)
    this.splashGfx.fillCircle(sx, sy, splashPx)
  }

  setOnHit(cb: (x: number, y: number, owner: ProjectileOwner) => void) {
    this.onHit = cb
  }

  isDone() { return this.done && !this.splashActive }

  override destroy() {
    this.gfx.destroy()
    this.splashGfx.destroy()
    super.destroy()
  }
}
