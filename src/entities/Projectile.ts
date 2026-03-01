import Phaser from 'phaser'
import {
  UNIT_SIZE, SPLASH_RADIUS, PROJECTILE_DAMAGE, MINION_PROJECTILE_DAMAGE,
  getFlightTime, COLOR,
} from '../constants'

export type ProjectileOwner = 'player' | 'enemy'

export class Projectile extends Phaser.GameObjects.GameObject {
  private gfx: Phaser.GameObjects.Graphics
  x: number
  y: number
  private targetX: number
  private targetY: number
  private flightMs: number
  private elapsed = 0
  private done = false
  readonly owner: ProjectileOwner
  readonly damage: number
  private splashGfx: Phaser.GameObjects.Graphics
  private splashTimer = 0
  private splashActive = false
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
    this.x = startX
    this.y = startY
    this.targetX = targetX
    this.targetY = targetY
    this.owner = owner
    this.onHit = onHit

    const dx = targetX - startX
    const dy = targetY - startY
    const distPx = Math.sqrt(dx * dx + dy * dy)
    const distUnits = distPx / UNIT_SIZE
    const rawFlight = getFlightTime(distUnits)
    // 최소 비행 시간: 거리 / 시각 속도 (최소 200ms)
    this.flightMs = Math.max(rawFlight, (distPx / 600) * 1000, 200)

    this.damage = owner === 'player' ? PROJECTILE_DAMAGE : MINION_PROJECTILE_DAMAGE

    this.gfx = scene.add.graphics()
    this.gfx.setDepth(45)
    this.splashGfx = scene.add.graphics()
    this.splashGfx.setDepth(44)
  }

  update(delta: number) {
    if (this.done) {
      // 착탄 이펙트 페이드
      if (this.splashActive) {
        this.splashTimer -= delta
        const alpha = Math.max(0, this.splashTimer / 400)
        this.drawSplash(alpha)
        if (this.splashTimer <= 0) {
          this.splashActive = false
          this.destroy()
        }
      }
      return
    }

    this.elapsed += delta
    const t = Math.min(this.elapsed / this.flightMs, 1)

    // 곡선 느낌을 위한 포물선 보간
    const px = Phaser.Math.Linear(this.x, this.targetX, t)
    const py = Phaser.Math.Linear(this.y, this.targetY, t)
    const arc = -Math.sin(t * Math.PI) * 40  // 아치

    this.drawBullet(px, py + arc)

    if (t >= 1) {
      this.done = true
      this.gfx.clear()
      this.onHit?.(this.targetX, this.targetY, this.owner)
      this.splashActive = true
      this.splashTimer = 400
      this.drawSplash(1)
    }
  }

  private drawBullet(px: number, py: number) {
    this.gfx.clear()
    const color = this.owner === 'player' ? COLOR.PROJECTILE : COLOR.ENEMY_PROJ
    this.gfx.fillStyle(color, 1)
    this.gfx.fillCircle(px, py, 5)
    // 궤적 잔상
    this.gfx.fillStyle(color, 0.3)
    this.gfx.fillCircle(px - (this.targetX - this.x) * 0.02, py - (this.targetY - this.y) * 0.02, 3)
  }

  private drawSplash(alpha: number) {
    this.splashGfx.clear()
    const color = this.owner === 'player' ? COLOR.PROJECTILE : COLOR.ENEMY_PROJ
    this.splashGfx.lineStyle(2, color, alpha)
    this.splashGfx.strokeCircle(this.targetX, this.targetY, SPLASH_RADIUS * alpha)
    this.splashGfx.fillStyle(color, alpha * 0.2)
    this.splashGfx.fillCircle(this.targetX, this.targetY, SPLASH_RADIUS)
  }

  /** 생성 후 히트 콜백을 외부에서 주입 */
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
