import Phaser from 'phaser'
import {
  PLAYER_SPEED, PLAYER_HP, PLAYER_AMMO_MAX,
  PLAYER_DEPLOY_TIME, PLAYER_UNDEPLOY_TIME, PLAYER_RELOAD_TIME,
  ZONE_PLAYER_TOP, BASE_Y, COLOR,
} from '../constants'
import { w2s, s2w, drawIsoBox, isoDepth, WORLD_W } from '../utils/IsoUtils'
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
  private stateTimer = 0
  private aimWX = 0
  private aimWY = 0
  private keys!: {
    up: Phaser.Input.Keyboard.Key
    down: Phaser.Input.Keyboard.Key
    left: Phaser.Input.Keyboard.Key
    right: Phaser.Input.Keyboard.Key
    deploy: Phaser.Input.Keyboard.Key
  }
  private onFire?: (proj: Projectile) => void
  private echoSystem: EchoSystem

  constructor(scene: Phaser.Scene, echoSystem: EchoSystem, onFire?: (proj: Projectile) => void) {
    super(scene, 'PlayerSPG')
    scene.add.existing(this)
    this.x = WORLD_W / 2
    this.y = BASE_Y - 2
    this.hp = PLAYER_HP
    this.ammo = PLAYER_AMMO_MAX
    this.echoSystem = echoSystem
    this.onFire = onFire
    this.gfx = scene.add.graphics()
    this.gfx.setDepth(20 + isoDepth(this.x, this.y))
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
    Phaser.Input.Keyboard.JustDown(this.keys.deploy)
  }

  private setupMouse(scene: Phaser.Scene) {
    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const w = s2w(pointer.x, pointer.y)
      this.aimWX = w.x
      this.aimWY = w.y
    })
    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        const w = s2w(pointer.x, pointer.y)
        this.tryFire(w.x, w.y)
      }
    })
  }

  update(delta: number) {
    switch (this.state) {
      case PlayerState.IDLE:
        this.handleMovement(delta)
        if (Phaser.Input.Keyboard.JustDown(this.keys.deploy)) this.transitionTo(PlayerState.DEPLOYING)
        break
      case PlayerState.MOVING:
        this.handleMovement(delta)
        break
      case PlayerState.DEPLOYING:
        this.stateTimer -= delta
        if (this.stateTimer <= 0) this.transitionTo(PlayerState.SIEGE)
        break
      case PlayerState.SIEGE:
        if (Phaser.Input.Keyboard.JustDown(this.keys.deploy)) this.transitionTo(PlayerState.UNDEPLOYING)
        break
      case PlayerState.FIRING:
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
    this.gfx.setDepth(20 + isoDepth(this.x, this.y))
    this.draw()
  }

  private handleMovement(delta: number) {
    const speed = PLAYER_SPEED * delta / 1000
    let dwx = 0, dwy = 0
    if (this.keys.up.isDown)    { dwx -= 1; dwy -= 1 }
    if (this.keys.down.isDown)  { dwx += 1; dwy += 1 }
    if (this.keys.left.isDown)  { dwx -= 1; dwy += 1 }
    if (this.keys.right.isDown) { dwx += 1; dwy -= 1 }
    if (dwx !== 0 || dwy !== 0) {
      const len = Math.sqrt(dwx * dwx + dwy * dwy)
      this.x += (dwx / len) * speed
      this.y += (dwy / len) * speed
      this.clampToPlayerZone()
      if (this.state === PlayerState.IDLE) this.state = PlayerState.MOVING
    } else if (this.state === PlayerState.MOVING) {
      this.state = PlayerState.IDLE
    }
  }

  private tryFire(targetWX: number, targetWY: number) {
    if (this.state !== PlayerState.SIEGE) return
    if (this.ammo <= 0) return
    this.ammo--
    const dx = targetWX - this.x
    const dy = targetWY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    this.echoSystem.createEcho(this.x, this.y, dist, false)
    const proj = new Projectile(this.scene as Phaser.Scene, this.x, this.y, targetWX, targetWY, 'player')
    this.onFire?.(proj)
    this.transitionTo(PlayerState.FIRING)
  }

  private transitionTo(next: PlayerState) {
    this.state = next
    switch (next) {
      case PlayerState.DEPLOYING:   this.stateTimer = PLAYER_DEPLOY_TIME * 1000; break
      case PlayerState.RELOADING:   this.stateTimer = PLAYER_RELOAD_TIME * 1000; break
      case PlayerState.UNDEPLOYING: this.stateTimer = PLAYER_UNDEPLOY_TIME * 1000; break
      default: break
    }
  }

  private clampToPlayerZone() {
    const pad = 0.5
    this.x = Phaser.Math.Clamp(this.x, pad, WORLD_W - pad)
    this.y = Phaser.Math.Clamp(this.y, ZONE_PLAYER_TOP + pad, BASE_Y - pad)
  }

  private draw() {
    this.gfx.clear()
    const isSiege = this.state === PlayerState.SIEGE ||
                    this.state === PlayerState.FIRING ||
                    this.state === PlayerState.RELOADING
    const topC  = isSiege ? COLOR.PLAYER_SPG : Phaser.Display.Color.ValueToColor(COLOR.PLAYER_SPG).darken(20).color
    const leftC  = Phaser.Display.Color.ValueToColor(topC).darken(35).color
    const rightC = Phaser.Display.Color.ValueToColor(topC).darken(18).color
    drawIsoBox(this.gfx, this.x - 0.7, this.y - 0.4, 1.4, 0.8, 18, topC, leftC, rightC)
    const ctr = w2s(this.x, this.y)
    const barrelLen = 1.5
    let bwx: number, bwy: number
    if (isSiege) {
      const dx = this.aimWX - this.x
      const dy = this.aimWY - this.y
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      bwx = this.x + (dx / len) * barrelLen
      bwy = this.y + (dy / len) * barrelLen
    } else {
      bwx = this.x - barrelLen * 0.5
      bwy = this.y - barrelLen * 0.5
    }
    const tip = w2s(bwx, bwy)
    this.gfx.lineStyle(4, topC, 1)
    this.gfx.strokeLineShape(new Phaser.Geom.Line(ctr.x, ctr.y, tip.x, tip.y))
    if (this.state === PlayerState.DEPLOYING || this.state === PlayerState.UNDEPLOYING) {
      const progress = this.state === PlayerState.DEPLOYING
        ? 1 - this.stateTimer / (PLAYER_DEPLOY_TIME * 1000)
        : this.stateTimer / (PLAYER_UNDEPLOY_TIME * 1000)
      this.gfx.lineStyle(2, 0xffff00, 0.8)
      this.gfx.strokeCircle(ctr.x, ctr.y, 28)
      this.gfx.lineStyle(4, 0xffff00, 1)
      const sa = -Math.PI / 2
      const ea = sa + progress * Math.PI * 2
      for (let i = 0; i <= 32; i++) {
        const a = sa + (ea - sa) * (i / 32)
        const px = ctr.x + Math.cos(a) * 30
        const py = ctr.y + Math.sin(a) * 30
        if (i === 0) this.gfx.moveTo(px, py)
        else this.gfx.lineTo(px, py)
      }
      this.gfx.strokePath()
    }
    if (this.state === PlayerState.RELOADING) {
      const progress = 1 - this.stateTimer / (PLAYER_RELOAD_TIME * 1000)
      this.gfx.fillStyle(0x4444ff, 0.8)
      this.gfx.fillRect(ctr.x - 24, ctr.y - 30, 48 * progress, 5)
      this.gfx.lineStyle(1, 0x8888ff, 0.6)
      this.gfx.strokeRect(ctr.x - 24, ctr.y - 30, 48, 5)
    }
    if (this.state === PlayerState.SIEGE) {
      this.gfx.lineStyle(1, COLOR.PLAYER_SPG, 0.35)
      this.gfx.strokeCircle(ctr.x, ctr.y, 34)
    }
    const hpRatio = this.hp / PLAYER_HP
    this.gfx.fillStyle(0x111111, 0.8)
    this.gfx.fillRect(ctr.x - 24, ctr.y - 40, 48, 5)
    this.gfx.fillStyle(hpRatio > 0.4 ? COLOR.HP_HIGH : COLOR.HP_LOW, 1)
    this.gfx.fillRect(ctr.x - 24, ctr.y - 40, 48 * hpRatio, 5)
  }

  takeDamage(amount: number) { this.hp = Math.max(0, this.hp - amount) }
  isAlive() { return this.hp > 0 }

  override destroy() {
    this.gfx.destroy()
    super.destroy()
  }
}
