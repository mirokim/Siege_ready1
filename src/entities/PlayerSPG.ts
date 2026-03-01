import Phaser from 'phaser'
import {
  PLAYER_SPEED, PLAYER_HP, PLAYER_AMMO_MAX,
  PLAYER_DEPLOY_TIME, PLAYER_UNDEPLOY_TIME, PLAYER_RELOAD_TIME,
  CANVAS_WIDTH, CANVAS_HEIGHT, ZONE_PLAYER_TOP,
  UNIT_SIZE, COLOR,
} from '../constants'
import { Projectile } from './Projectile'
import { EchoSystem } from '../systems/EchoSystem'

export enum PlayerState {
  IDLE        = 'IDLE',
  MOVING      = 'MOVING',
  DEPLOYING   = 'DEPLOYING',
  SIEGE       = 'SIEGE',
  FIRING      = 'FIRING',
  RELOADING   = 'RELOADING',
  UNDEPLOYING = 'UNDEPLOYING',
}

export class PlayerSPG extends Phaser.GameObjects.GameObject {
  x: number
  y: number
  hp: number
  ammo: number
  state: PlayerState = PlayerState.IDLE

  private gfx: Phaser.GameObjects.Graphics
  private stateTimer = 0        // 현재 상태 남은 시간(ms)
  private keys!: {
    up: Phaser.Input.Keyboard.Key
    down: Phaser.Input.Keyboard.Key
    left: Phaser.Input.Keyboard.Key
    right: Phaser.Input.Keyboard.Key
    deploy: Phaser.Input.Keyboard.Key
  }
  private onFire?: (proj: Projectile) => void
  private echoSystem: EchoSystem

  constructor(
    scene: Phaser.Scene,
    echoSystem: EchoSystem,
    onFire?: (proj: Projectile) => void,
  ) {
    super(scene, 'PlayerSPG')
    scene.add.existing(this)

    this.x = CANVAS_WIDTH / 2
    this.y = CANVAS_HEIGHT - 100
    this.hp = PLAYER_HP
    this.ammo = PLAYER_AMMO_MAX
    this.echoSystem = echoSystem
    this.onFire = onFire

    this.gfx = scene.add.graphics()
    this.gfx.setDepth(20)

    this.setupKeys(scene)
    this.setupMouse(scene)
  }

  private setupKeys(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!
    this.keys = {
      up:     kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:   kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:   kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      deploy: kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    }
    Phaser.Input.Keyboard.JustDown(this.keys.deploy)  // init
  }

  private setupMouse(scene: Phaser.Scene) {
    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.tryFire(pointer.worldX, pointer.worldY)
      }
    })
  }

  update(delta: number) {
    switch (this.state) {
      case PlayerState.IDLE:
        this.handleMovement(delta)
        if (Phaser.Input.Keyboard.JustDown(this.keys.deploy)) {
          this.transitionTo(PlayerState.DEPLOYING)
        }
        break

      case PlayerState.MOVING:
        this.updateMoving(delta)
        break

      case PlayerState.DEPLOYING:
        this.stateTimer -= delta
        if (this.stateTimer <= 0) this.transitionTo(PlayerState.SIEGE)
        break

      case PlayerState.SIEGE:
        // 포격 대기 — 마우스 클릭으로 발사
        if (Phaser.Input.Keyboard.JustDown(this.keys.deploy)) {
          this.transitionTo(PlayerState.UNDEPLOYING)
        }
        break

      case PlayerState.FIRING:
        // 즉시 RELOADING으로 전환 (발사는 이미 처리됨)
        this.transitionTo(PlayerState.RELOADING)
        break

      case PlayerState.RELOADING:
        this.stateTimer -= delta
        if (this.stateTimer <= 0) this.transitionTo(PlayerState.SIEGE)
        break

      case PlayerState.UNDEPLOYING:
        this.stateTimer -= delta
        if (this.stateTimer <= 0) this.transitionTo(PlayerState.IDLE)
        break
    }

    this.draw()
  }

  private handleMovement(delta: number) {
    const speed = PLAYER_SPEED * delta / 1000
    let dx = 0, dy = 0

    if (this.keys.up.isDown)    dy -= 1
    if (this.keys.down.isDown)  dy += 1
    if (this.keys.left.isDown)  dx -= 1
    if (this.keys.right.isDown) dx += 1

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy)
      this.x += (dx / len) * speed
      this.y += (dy / len) * speed
      this.clampToPlayerZone()
      this.state = PlayerState.MOVING
    } else if (this.state === PlayerState.MOVING) {
      this.state = PlayerState.IDLE
    }
  }

  private updateMoving(delta: number) {
    this.handleMovement(delta)
  }

  private tryFire(targetX: number, targetY: number) {
    if (this.state !== PlayerState.SIEGE) return
    if (this.ammo <= 0) return

    this.ammo--
    const dx = targetX - this.x
    const dy = targetY - this.y
    const distPx = Math.sqrt(dx * dx + dy * dy)
    const distUnits = distPx / UNIT_SIZE

    // 잔향 생성
    this.echoSystem.createEcho(this.x, this.y, distUnits, false)

    const proj = new Projectile(
      this.scene as Phaser.Scene,
      this.x, this.y,
      targetX, targetY,
      'player',
    )
    this.onFire?.(proj)

    this.transitionTo(PlayerState.FIRING)
  }

  private transitionTo(next: PlayerState) {
    this.state = next
    switch (next) {
      case PlayerState.DEPLOYING:
        this.stateTimer = PLAYER_DEPLOY_TIME * 1000
        break
      case PlayerState.RELOADING:
        this.stateTimer = PLAYER_RELOAD_TIME * 1000
        break
      case PlayerState.UNDEPLOYING:
        this.stateTimer = PLAYER_UNDEPLOY_TIME * 1000
        break
      default:
        break
    }
  }

  private clampToPlayerZone() {
    const pad = UNIT_SIZE
    this.x = Phaser.Math.Clamp(this.x, pad, CANVAS_WIDTH - pad)
    this.y = Phaser.Math.Clamp(this.y, ZONE_PLAYER_TOP + pad, CANVAS_HEIGHT - pad)
  }

  private draw() {
    this.gfx.clear()

    const isSiege = this.state === PlayerState.SIEGE ||
                    this.state === PlayerState.FIRING ||
                    this.state === PlayerState.RELOADING

    // 차체
    const bodyColor = isSiege ? COLOR.PLAYER_SPG : Phaser.Display.Color.ValueToColor(COLOR.PLAYER_SPG).darken(20).color
    this.gfx.fillStyle(bodyColor, 1)
    this.gfx.fillRect(this.x - 18, this.y - 10, 36, 20)

    // 포신
    const cursorX = this.scene.input.mousePointer.worldX
    const cursorY = this.scene.input.mousePointer.worldY
    const angle = isSiege ? Math.atan2(cursorY - this.y, cursorX - this.x) : -Math.PI / 2
    const barrelLen = 28
    this.gfx.lineStyle(4, bodyColor, 1)
    this.gfx.strokeLineShape(new Phaser.Geom.Line(
      this.x, this.y,
      this.x + Math.cos(angle) * barrelLen,
      this.y + Math.sin(angle) * barrelLen,
    ))

    // 궤도
    this.gfx.lineStyle(3, 0x333322, 1)
    this.gfx.strokeRect(this.x - 20, this.y + 8, 40, 6)

    // 방열 중 표시
    if (this.state === PlayerState.DEPLOYING || this.state === PlayerState.UNDEPLOYING) {
      const progress = this.state === PlayerState.DEPLOYING
        ? 1 - this.stateTimer / (PLAYER_DEPLOY_TIME * 1000)
        : this.stateTimer / (PLAYER_UNDEPLOY_TIME * 1000)
      this.gfx.lineStyle(2, 0xffff00, 0.8)
      this.gfx.strokeCircle(this.x, this.y, 24)
      this.gfx.lineStyle(4, 0xffff00, 1)
      // 진행 호
      const startAngle = -Math.PI / 2
      const endAngle = startAngle + progress * Math.PI * 2
      for (let i = 0; i < 32; i++) {
        const a = startAngle + (endAngle - startAngle) * (i / 32)
        if (i === 0) {
          this.gfx.moveTo(this.x + Math.cos(a) * 26, this.y + Math.sin(a) * 26)
        } else {
          this.gfx.lineTo(this.x + Math.cos(a) * 26, this.y + Math.sin(a) * 26)
        }
      }
      this.gfx.strokePath()
    }

    // 재장전 진행바
    if (this.state === PlayerState.RELOADING) {
      const progress = 1 - this.stateTimer / (PLAYER_RELOAD_TIME * 1000)
      this.gfx.fillStyle(0x4444ff, 0.8)
      this.gfx.fillRect(this.x - 22, this.y - 22, 44 * progress, 4)
      this.gfx.lineStyle(1, 0x8888ff, 0.6)
      this.gfx.strokeRect(this.x - 22, this.y - 22, 44, 4)
    }

    // 방열 완료 조준 십자선
    if (this.state === PlayerState.SIEGE) {
      this.gfx.lineStyle(1, COLOR.PLAYER_SPG, 0.4)
      this.gfx.strokeCircle(this.x, this.y, 30)
    }
  }

  takeDamage(amount: number) {
    this.hp = Math.max(0, this.hp - amount)
  }

  isAlive() { return this.hp > 0 }

  override destroy() {
    this.gfx.destroy()
    super.destroy()
  }
}
