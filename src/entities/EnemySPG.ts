import Phaser from 'phaser'
import {
  ENEMY_HP, ENEMY_DEPLOY_TIME, ENEMY_AIM_TIME, ENEMY_RELOAD_TIME,
  ENEMY_MOVE_SPEED, ENEMY_AIM_SPREAD,
  ZONE_ENEMY_BOTTOM, COLOR,
} from '../constants'
import { w2s, drawIsoBox, isoDepth, WORLD_W } from '../utils/IsoUtils'
import { Projectile } from './Projectile'
import { EchoSystem } from '../systems/EchoSystem'
import { TriangulationUI } from '../systems/TriangulationUI'

enum EnemyState {
  DEPLOYING = 'DEPLOYING',
  AIMING    = 'AIMING',
  MOVING    = 'MOVING',
  RELOADING = 'RELOADING',
}

export class EnemySPG extends Phaser.GameObjects.GameObject {
  x: number
  y: number
  hp: number = ENEMY_HP
  private enemyState: EnemyState = EnemyState.DEPLOYING
  private stateTimer = 0
  private gfx: Phaser.GameObjects.Graphics
  private targetX = 0
  private targetY = 0
  private moveDestX = 0
  private moveDestY = 0
  private onFire?: (proj: Projectile) => void
  private echoSystem: EchoSystem
  private triangUI: TriangulationUI
  private playerRef: { x: number; y: number }

  constructor(
    scene: Phaser.Scene,
    echoSystem: EchoSystem,
    triangUI: TriangulationUI,
    playerRef: { x: number; y: number },
    onFire?: (proj: Projectile) => void,
  ) {
    super(scene, 'EnemySPG')
    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject)
    this.x = 2 + Math.random() * (WORLD_W - 4)
    this.y = 1 + Math.random() * (ZONE_ENEMY_BOTTOM - 2)
    this.echoSystem = echoSystem
    this.triangUI = triangUI
    this.playerRef = playerRef
    this.onFire = onFire
    this.gfx = scene.add.graphics()
    this.gfx.setDepth(20 + isoDepth(this.x, this.y))
    this.stateTimer = ENEMY_DEPLOY_TIME * 1000
  }

  update(delta: number) {
    if (this.hp <= 0) return
    this.stateTimer -= delta
    switch (this.enemyState) {
      case EnemyState.DEPLOYING:
        if (this.stateTimer <= 0) this.transitionTo(EnemyState.AIMING)
        break
      case EnemyState.AIMING:
        if (this.stateTimer <= 0) { this.fire(); this.transitionTo(EnemyState.MOVING) }
        break
      case EnemyState.MOVING:
        this.updateMoving(delta)
        break
      case EnemyState.RELOADING:
        if (this.stateTimer <= 0) this.transitionTo(EnemyState.DEPLOYING)
        break
    }
    this.gfx.setDepth(20 + isoDepth(this.x, this.y))
    this.draw()
  }

  private transitionTo(next: EnemyState) {
    this.enemyState = next
    switch (next) {
      case EnemyState.DEPLOYING:
        this.stateTimer = ENEMY_DEPLOY_TIME * 1000
        break
      case EnemyState.AIMING:
        this.stateTimer = ENEMY_AIM_TIME * 1000
        this.triangUI.showDirectionArrow(this.x, this.y, this.playerRef.x, this.playerRef.y)
        break
      case EnemyState.MOVING:
        this.moveDestX = Phaser.Math.Clamp(this.x + (Math.random() - 0.5) * 8, 1, WORLD_W - 1)
        this.moveDestY = Phaser.Math.Clamp(this.y + (Math.random() - 0.5) * 4, 0.5, ZONE_ENEMY_BOTTOM - 0.5)
        this.stateTimer = 3000
        break
      case EnemyState.RELOADING:
        this.stateTimer = ENEMY_RELOAD_TIME * 1000
        break
    }
  }

  private fire() {
    this.targetX = this.playerRef.x + (Math.random() - 0.5) * ENEMY_AIM_SPREAD * 2
    this.targetY = this.playerRef.y + (Math.random() - 0.5) * ENEMY_AIM_SPREAD * 2
    const dx = this.targetX - this.x
    const dy = this.targetY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    this.echoSystem.createEcho(this.x, this.y, dist, true)
    this.triangUI.recordShot(this.x, this.y, this.playerRef.x, this.playerRef.y)
    const proj = new Projectile(this.scene as Phaser.Scene, this.x, this.y, this.targetX, this.targetY, 'enemy')
    this.onFire?.(proj)
  }

  private updateMoving(delta: number) {
    const dx = this.moveDestX - this.x
    const dy = this.moveDestY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 0.1 || this.stateTimer <= 0) {
      this.transitionTo(EnemyState.RELOADING)
      return
    }
    const speed = ENEMY_MOVE_SPEED * delta / 1000
    this.x += (dx / dist) * speed
    this.y += (dy / dist) * speed
  }

  private draw() {
    this.gfx.clear()
    const isAiming = this.enemyState === EnemyState.AIMING
    const alpha = this.enemyState === EnemyState.MOVING ? 0.65 : 1.0
    const topC  = isAiming
      ? Phaser.Display.Color.ValueToColor(COLOR.ENEMY_SPG).brighten(10).color
      : COLOR.ENEMY_SPG
    const leftC  = Phaser.Display.Color.ValueToColor(topC).darken(35).color
    const rightC = Phaser.Display.Color.ValueToColor(topC).darken(18).color

    this.gfx.setAlpha(alpha)
    drawIsoBox(this.gfx, this.x - 0.7, this.y - 0.4, 1.4, 0.8, 18, topC, leftC, rightC)
    this.gfx.setAlpha(1)

    const ctr = w2s(this.x, this.y)
    const barrelLen = 1.5
    const angle = isAiming
      ? Math.atan2(this.targetY - this.y, this.targetX - this.x)
      : Math.atan2(1, 1)  // default: toward player zone
    const bwx = this.x + Math.cos(angle) * barrelLen
    const bwy = this.y + Math.sin(angle) * barrelLen
    const tip = w2s(bwx, bwy)
    this.gfx.lineStyle(4, topC, alpha)
    this.gfx.strokeLineShape(new Phaser.Geom.Line(ctr.x, ctr.y, tip.x, tip.y))

    if (isAiming) {
      const progress = 1 - this.stateTimer / (ENEMY_AIM_TIME * 1000)
      this.gfx.lineStyle(2, COLOR.DIRECTION_ARROW, 0.7)
      this.gfx.strokeCircle(ctr.x, ctr.y, 20 + progress * 12)
    }

    const hpRatio = this.hp / ENEMY_HP
    this.gfx.fillStyle(0x222222, 0.8)
    this.gfx.fillRect(ctr.x - 24, ctr.y - 40, 48, 5)
    this.gfx.fillStyle(hpRatio > 0.5 ? COLOR.HP_HIGH : COLOR.HP_LOW, 1)
    this.gfx.fillRect(ctr.x - 24, ctr.y - 40, 48 * hpRatio, 5)
  }

  takeDamage(amount: number) { this.hp = Math.max(0, this.hp - amount) }
  isAlive() { return this.hp > 0 }

  override destroy() {
    this.gfx.destroy()
    super.destroy()
  }
}
