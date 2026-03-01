import Phaser from 'phaser'
import {
  ENEMY_HP, ENEMY_DEPLOY_TIME, ENEMY_AIM_TIME, ENEMY_RELOAD_TIME,
  ENEMY_MOVE_SPEED, ENEMY_AIM_SPREAD,
  CANVAS_WIDTH, ZONE_ENEMY_BOTTOM,
  UNIT_SIZE, COLOR,
} from '../constants'
import { Projectile } from './Projectile'
import { EchoSystem } from '../systems/EchoSystem'
import { TriangulationUI } from '../systems/TriangulationUI'

enum EnemyState {
  DEPLOYING   = 'DEPLOYING',
  AIMING      = 'AIMING',
  MOVING      = 'MOVING',
  RELOADING   = 'RELOADING',
}

export class EnemySPG extends Phaser.GameObjects.GameObject {
  x: number
  y: number
  hp: number = ENEMY_HP
  // 'state'는 Phaser.GameObjects.GameObject에 number|string으로 존재하므로 다른 이름 사용
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

    this.x = Phaser.Math.Between(60, CANVAS_WIDTH - 60)
    this.y = Phaser.Math.Between(20, ZONE_ENEMY_BOTTOM - 20)
    this.echoSystem = echoSystem
    this.triangUI = triangUI
    this.playerRef = playerRef
    this.onFire = onFire

    this.gfx = scene.add.graphics()
    this.gfx.setDepth(20)
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
        if (this.stateTimer <= 0) {
          this.fire()
          this.transitionTo(EnemyState.MOVING)
        }
        break
      case EnemyState.MOVING:
        this.updateMoving(delta)
        break
      case EnemyState.RELOADING:
        if (this.stateTimer <= 0) this.transitionTo(EnemyState.DEPLOYING)
        break
    }

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
        this.moveDestX = Phaser.Math.Clamp(
          this.x + Phaser.Math.Between(-UNIT_SIZE * 4, UNIT_SIZE * 4),
          40, CANVAS_WIDTH - 40,
        )
        this.moveDestY = Phaser.Math.Clamp(
          this.y + Phaser.Math.Between(-UNIT_SIZE * 2, UNIT_SIZE * 2),
          20, ZONE_ENEMY_BOTTOM - 20,
        )
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
    const distUnits = Math.sqrt(dx * dx + dy * dy) / UNIT_SIZE

    this.echoSystem.createEcho(this.x, this.y, distUnits, true)
    this.triangUI.recordShot(this.x, this.y, this.playerRef.x, this.playerRef.y)

    const proj = new Projectile(this.scene as Phaser.Scene, this.x, this.y, this.targetX, this.targetY, 'enemy')
    this.onFire?.(proj)
  }

  private updateMoving(delta: number) {
    const dx = this.moveDestX - this.x
    const dy = this.moveDestY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 4 || this.stateTimer <= 0) {
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
    const alpha = this.enemyState === EnemyState.MOVING ? 0.6 : 1.0

    this.gfx.fillStyle(COLOR.ENEMY_SPG, alpha)
    this.gfx.fillRect(this.x - 18, this.y - 10, 36, 20)

    const angle = isAiming
      ? Math.atan2(this.targetY - this.y, this.targetX - this.x)
      : Math.PI / 2
    this.gfx.lineStyle(4, COLOR.ENEMY_SPG, alpha)
    this.gfx.strokeLineShape(new Phaser.Geom.Line(this.x, this.y, this.x + Math.cos(angle) * 28, this.y + Math.sin(angle) * 28))

    if (isAiming) {
      const progress = 1 - this.stateTimer / (ENEMY_AIM_TIME * 1000)
      this.gfx.lineStyle(2, COLOR.DIRECTION_ARROW, 0.7)
      this.gfx.strokeCircle(this.x, this.y, 20 + progress * 10)
    }

    const hpRatio = this.hp / ENEMY_HP
    this.gfx.fillStyle(0x222222, 0.8)
    this.gfx.fillRect(this.x - 22, this.y - 20, 44, 4)
    this.gfx.fillStyle(hpRatio > 0.5 ? COLOR.HP_HIGH : COLOR.HP_LOW, 1)
    this.gfx.fillRect(this.x - 22, this.y - 20, 44 * hpRatio, 4)
  }

  takeDamage(amount: number) { this.hp = Math.max(0, this.hp - amount) }
  isAlive() { return this.hp > 0 }

  override destroy() {
    this.gfx.destroy()
    super.destroy()
  }
}
