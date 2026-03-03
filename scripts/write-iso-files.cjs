// Helper script to write all isometric TypeScript files
const fs = require('fs')
const path = require('path')

const base = path.join(__dirname, '..')
const src = path.join(base, 'src')

function write(rel, content) {
  const p = path.join(src, rel)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, content, 'utf8')
  console.log('Wrote:', rel)
}

// ─── PlayerSPG.ts ─────────────────────────────────────────────────────────────
write('entities/PlayerSPG.ts', `import Phaser from 'phaser'
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
`)

// ─── EnemySPG.ts ──────────────────────────────────────────────────────────────
write('entities/EnemySPG.ts', `import Phaser from 'phaser'
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
`)

// ─── EchoSystem.ts ────────────────────────────────────────────────────────────
write('systems/EchoSystem.ts', `import Phaser from 'phaser'
import { ECHO_DURATION_MS, ECHO_PHASES, getEchoSize, COLOR } from '../constants'
import { w2s } from '../utils/IsoUtils'

interface EchoEntry {
  wx: number
  wy: number
  phase: number
  elapsed: number
  isEnemy: boolean
}

const RADIUS_TABLE: Record<number, number[]> = {
  0: [0, 0, 0],
  1: [32, 24, 16],
  2: [56, 40, 24],
}

export class EchoSystem {
  private echoes: EchoEntry[] = []
  private gfx: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics()
    this.gfx.setDepth(55)
  }

  createEcho(wx: number, wy: number, distCells: number, isEnemy = false) {
    const sizeGrade = getEchoSize(distCells)
    if (sizeGrade === 0) return
    this.echoes.push({ wx, wy, phase: 0, elapsed: 0, isEnemy })
  }

  update(delta: number) {
    for (const echo of this.echoes) {
      echo.elapsed += delta
      if (echo.elapsed >= ECHO_DURATION_MS) {
        echo.elapsed = 0
        echo.phase++
      }
    }
    this.echoes = this.echoes.filter(e => e.phase < ECHO_PHASES)
    this.draw()
  }

  private draw() {
    this.gfx.clear()
    for (const echo of this.echoes) {
      const radii = RADIUS_TABLE[1]
      const radius = radii[echo.phase]
      const alpha = [0.7, 0.4, 0.2][echo.phase]
      const color = echo.isEnemy ? COLOR.ENEMY_PROJ : COLOR.ECHO_STRONG
      const { x: sx, y: sy } = w2s(echo.wx, echo.wy)

      this.gfx.lineStyle(2, color, alpha)
      this.gfx.strokeCircle(sx, sy, radius)

      if (echo.phase === 0) {
        this.gfx.fillStyle(color, alpha * 0.3)
        this.gfx.fillCircle(sx, sy, radius * 0.5)
      }

      this.gfx.lineStyle(1, color, alpha * 0.8)
      const cs = 6
      this.gfx.strokeRect(sx - cs / 2, sy - cs / 2, cs, cs)
    }
  }

  getEchoes() { return this.echoes }
}
`)

// ─── TerrainSystem.ts ─────────────────────────────────────────────────────────
write('systems/TerrainSystem.ts', `import Phaser from 'phaser'
import {
  ZONE_ENEMY_BOTTOM, ZONE_NML_BOTTOM, COLOR,
} from '../constants'
import { drawIsoBox, WORLD_W } from '../utils/IsoUtils'

export interface TerrainRect {
  wx: number; wy: number
  ww: number; wd: number
  type: 'cover' | 'rock' | 'ruin'
}

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
    const playerZoneH = 20 - ZONE_NML_BOTTOM
    const coverCount = 8 + Math.floor(Math.random() * 5)
    for (let i = 0; i < coverCount; i++) {
      const ww = 1.0 + Math.random() * 2.0
      const wd = 0.5 + Math.random() * 1.0
      this.obstacles.push({
        type: 'cover',
        wx: 1 + Math.random() * (WORLD_W - 2 - ww),
        wy: ZONE_NML_BOTTOM + 0.5 + Math.random() * (playerZoneH - wd - 2),
        ww, wd,
      })
    }

    const nmlH = ZONE_NML_BOTTOM - ZONE_ENEMY_BOTTOM
    const rockCount = 6 + Math.floor(Math.random() * 4)
    for (let i = 0; i < rockCount; i++) {
      const big = Math.random() < 0.35
      const ww = big ? 1.5 + Math.random() * 1.5 : 0.6 + Math.random() * 0.8
      const wd = big ? 0.8 + Math.random() * 0.6 : 0.3 + Math.random() * 0.4
      this.obstacles.push({
        type: Math.random() < 0.5 ? 'rock' : 'ruin',
        wx: 1 + Math.random() * (WORLD_W - 2 - ww),
        wy: ZONE_ENEMY_BOTTOM + 0.3 + Math.random() * (nmlH - wd - 0.6),
        ww, wd,
      })
    }
  }

  private draw() {
    this.gfx.clear()
    // Sort back-to-front for proper occlusion
    const sorted = [...this.obstacles].sort((a, b) => (a.wx + a.wy) - (b.wx + b.wy))
    for (const obs of sorted) {
      switch (obs.type) {
        case 'cover': this.drawCover(obs); break
        case 'rock':  this.drawRock(obs);  break
        case 'ruin':  this.drawRuin(obs);  break
      }
    }
  }

  private drawCover(o: TerrainRect) {
    drawIsoBox(this.gfx, o.wx, o.wy, o.ww, o.wd, 22, COLOR.COVER_TOP, COLOR.COVER_LEFT, COLOR.COVER_RIGHT)
  }

  private drawRock(o: TerrainRect) {
    drawIsoBox(this.gfx, o.wx, o.wy, o.ww, o.wd, 14, COLOR.ROCK_TOP, COLOR.ROCK_LEFT, COLOR.ROCK_RIGHT)
  }

  private drawRuin(o: TerrainRect) {
    const segW = o.ww / 3
    for (let s = 0; s < 3; s++) {
      if (Math.random() < 0.25) continue
      const sh = o.wd * (0.5 + Math.random() * 0.5)
      const sy = o.wy + (o.wd - sh)
      const h = 8 + Math.random() * 8
      drawIsoBox(this.gfx, o.wx + s * segW, sy, segW * 0.85, sh, h, COLOR.ROCK_TOP, COLOR.ROCK_LEFT, COLOR.ROCK_RIGHT)
    }
  }
}
`)

// ─── FogSystem.ts ─────────────────────────────────────────────────────────────
write('systems/FogSystem.ts', `import Phaser from 'phaser'
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
`)

// ─── WaveManager.ts ───────────────────────────────────────────────────────────
write('systems/WaveManager.ts', `import Phaser from 'phaser'
import { Infantry } from '../entities/Infantry'
import { ZONE_ENEMY_BOTTOM, WAVE_INTERVAL_MS } from '../constants'
import { WORLD_W } from '../utils/IsoUtils'

export class WaveManager {
  private minions: Infantry[] = []
  private waveTimer = 4000
  private waveNumber = 0
  private onMinionReachBase?: (dmg: number) => void

  constructor(private scene: Phaser.Scene, onMinionReachBase?: (dmg: number) => void) {
    this.onMinionReachBase = onMinionReachBase
  }

  update(delta: number) {
    this.waveTimer -= delta
    if (this.waveTimer <= 0) {
      this.spawnWave()
      this.waveTimer = WAVE_INTERVAL_MS
    }

    for (const m of this.minions) {
      m.update(delta)
      if (m.hasReachedBase()) this.onMinionReachBase?.(m.baseDamage)
    }

    this.minions = this.minions.filter(m => {
      if (m.isDead()) { m.destroy(); return false }
      return true
    })
  }

  private spawnWave() {
    this.waveNumber++
    const groupCount = 1 + Math.floor(Math.random() * 3)
    const countPerGroup = Math.min(2 + Math.floor(this.waveNumber / 2), 5)

    for (let g = 0; g < groupCount; g++) {
      const baseX = 1 + Math.random() * (WORLD_W - 2)
      for (let i = 0; i < countPerGroup; i++) {
        const spawnX = Phaser.Math.Clamp(baseX + (Math.random() - 0.5) * 3, 0.5, WORLD_W - 0.5)
        const spawnY = ZONE_ENEMY_BOTTOM + 0.2 + i * 0.4
        this.minions.push(new Infantry(this.scene, spawnX, spawnY))
      }
    }
  }

  applySplashDamage(hitX: number, hitY: number, splashRadius: number, damage: number) {
    for (const m of this.minions) {
      if (m.getSplashHitCheck(hitX, hitY, splashRadius)) m.takeDamage(damage)
    }
  }

  getMinions() { return this.minions }
  getWaveNumber() { return this.waveNumber }
}
`)

// ─── TriangulationUI.ts ───────────────────────────────────────────────────────
write('systems/TriangulationUI.ts', `import Phaser from 'phaser'
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
`)

// ─── GameScene.ts ─────────────────────────────────────────────────────────────
write('scenes/GameScene.ts', `import Phaser from 'phaser'
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  ZONE_ENEMY_BOTTOM, ZONE_NML_BOTTOM, BASE_Y,
  BASE_HP_MAX, SPLASH_RADIUS,
  SCOUT_WAVE_COUNT, SCOUT_DURATION_MS,
  COLOR,
} from '../constants'
import { w2s, drawIsoTile, WORLD_W, WORLD_H } from '../utils/IsoUtils'
import { PlayerSPG } from '../entities/PlayerSPG'
import { EnemySPG } from '../entities/EnemySPG'
import { Projectile } from '../entities/Projectile'
import { EchoSystem } from '../systems/EchoSystem'
import { FogSystem } from '../systems/FogSystem'
import { WaveManager } from '../systems/WaveManager'
import { PhaseManager, GamePhase } from '../systems/PhaseManager'
import { TriangulationUI } from '../systems/TriangulationUI'
import { TerrainSystem } from '../systems/TerrainSystem'
import type { HUDData } from './HUDScene'

export class GameScene extends Phaser.Scene {
  private echoSystem!: EchoSystem
  private waveManager!: WaveManager
  private phaseManager!: PhaseManager
  private triangUI!: TriangulationUI

  private player!: PlayerSPG
  private enemy!: EnemySPG
  private projectiles: Projectile[] = []

  private baseHp = BASE_HP_MAX
  private scoutTimer = SCOUT_DURATION_MS
  private bgGfx!: Phaser.GameObjects.Graphics
  private gameOver = false
  private gameOverText!: Phaser.GameObjects.Text

  constructor() { super({ key: 'GameScene' }) }

  create() {
    this.bgGfx = this.add.graphics()
    this.bgGfx.setDepth(0)
    this.drawBackground()

    new TerrainSystem(this)
    this.echoSystem  = new EchoSystem(this)
    this.triangUI    = new TriangulationUI(this)
    this.phaseManager = new PhaseManager()
    new FogSystem(this)

    this.waveManager = new WaveManager(this, (dmg: number) => {
      this.baseHp = Math.max(0, this.baseHp - dmg)
      this.checkGameOver()
    })

    this.player = new PlayerSPG(this, this.echoSystem, (proj: Projectile) => this.addProjectile(proj))
    this.enemy  = new EnemySPG(this, this.echoSystem, this.triangUI, this.player,
      (proj: Projectile) => this.addProjectile(proj))

    this.phaseManager.setOnPhaseChange(phase => this.onPhaseChange(phase))
    this.scene.launch('HUDScene')

    this.gameOverText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, '', {
      fontFamily: 'monospace', fontSize: '36px', color: '#ffcc44',
      backgroundColor: '#00000099', padding: { x: 24, y: 16 },
    }).setOrigin(0.5).setDepth(100).setVisible(false)

    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R).on('down', () => {
      if (this.gameOver) this.restartGame()
    })
  }

  update(_time: number, delta: number) {
    if (this.gameOver) return
    this.echoSystem.update(delta)
    this.triangUI.update(delta)
    this.waveManager.update(delta)
    this.player.update(delta)
    if (this.enemy.isAlive()) this.enemy.update(delta)
    this.updateProjectiles(delta)
    this.updatePhase(delta)
    this.emitHUD()
    if (!this.enemy.isAlive()) this.showGameOver('적 자주포 격파!\\n승리!')
  }

  private addProjectile(proj: Projectile) {
    proj.setOnHit((x, y, owner) => this.applyHit(x, y, owner))
    this.projectiles.push(proj)
  }

  private updateProjectiles(delta: number) {
    for (const proj of this.projectiles) proj.update(delta)
    this.projectiles = this.projectiles.filter(p => {
      if (p.isDone()) { p.destroy(); return false }
      return true
    })
  }

  private updatePhase(delta: number) {
    if (this.phaseManager.isScout()) {
      this.scoutTimer -= delta
      if (this.scoutTimer <= 0 || this.waveManager.getWaveNumber() >= SCOUT_WAVE_COUNT) {
        this.phaseManager.transitionTo(GamePhase.DUEL)
      }
    }
  }

  private onPhaseChange(_phase: GamePhase) {}

  applyHit(hitWX: number, hitWY: number, owner: 'player' | 'enemy') {
    if (owner === 'player') {
      this.waveManager.applySplashDamage(hitWX, hitWY, SPLASH_RADIUS, 50)
      const dx = this.enemy.x - hitWX
      const dy = this.enemy.y - hitWY
      if (Math.sqrt(dx * dx + dy * dy) < SPLASH_RADIUS + 0.8) {
        this.enemy.takeDamage(50)
      }
    } else {
      const dx = this.player.x - hitWX
      const dy = this.player.y - hitWY
      if (Math.sqrt(dx * dx + dy * dy) < SPLASH_RADIUS + 0.8) {
        this.player.takeDamage(40)
        if (!this.player.isAlive()) this.showGameOver('자주포 격파!\\n패배...')
      }
    }
  }

  private emitHUD() {
    const data: HUDData = {
      playerHp:    this.player.hp,
      baseHp:      this.baseHp,
      ammo:        this.player.ammo,
      playerState: this.player.state,
      phase:       this.phaseManager.getPhase(),
      waveNumber:  this.waveManager.getWaveNumber(),
      enemyHp:     this.enemy.hp,
    }
    this.events.emit('updateHUD', data)
  }

  private checkGameOver() {
    if (this.baseHp <= 0) this.showGameOver('기지 붕괴!\\n패배...')
  }

  private showGameOver(msg: string) {
    if (this.gameOver) return
    this.gameOver = true
    this.gameOverText.setText(msg + '\\n\\n[R] 재시작')
    this.gameOverText.setVisible(true)
  }

  private restartGame() {
    this.scene.stop('HUDScene')
    this.scene.restart()
  }

  private drawBackground() {
    this.bgGfx.clear()

    // 구역별 타일 색상으로 전체 그리드 그리기
    for (let wx = 0; wx < WORLD_W; wx++) {
      for (let wy = 0; wy < WORLD_H; wy++) {
        let color: number
        if (wy < ZONE_ENEMY_BOTTOM) {
          color = COLOR.ENEMY_ZONE
        } else if (wy < ZONE_NML_BOTTOM) {
          color = COLOR.NML
        } else {
          color = COLOR.GROUND
        }
        // 체커보드 강조: 약간 밝기 변조
        const variant = (wx + wy) % 2 === 0 ? 0 : 1
        if (variant) {
          color = Phaser.Display.Color.ValueToColor(color).brighten(4).color
        }
        drawIsoTile(this.bgGfx, wx, wy, color)
      }
    }

    // 구역 경계선 (ISO 다이아몬드 라인)
    this.bgGfx.lineStyle(1, 0x888866, 0.5)
    const enemyBotLeft  = w2s(0,      ZONE_ENEMY_BOTTOM)
    const enemyBotRight = w2s(WORLD_W, ZONE_ENEMY_BOTTOM)
    this.bgGfx.strokeLineShape(new Phaser.Geom.Line(enemyBotLeft.x, enemyBotLeft.y, enemyBotRight.x, enemyBotRight.y))

    this.bgGfx.lineStyle(1, 0x888866, 0.5)
    const nmlBotLeft  = w2s(0,      ZONE_NML_BOTTOM)
    const nmlBotRight = w2s(WORLD_W, ZONE_NML_BOTTOM)
    this.bgGfx.strokeLineShape(new Phaser.Geom.Line(nmlBotLeft.x, nmlBotLeft.y, nmlBotRight.x, nmlBotRight.y))

    // 기지 라인
    this.bgGfx.lineStyle(2, COLOR.BASE_LINE, 0.7)
    const baseLeft  = w2s(0,      BASE_Y)
    const baseRight = w2s(WORLD_W, BASE_Y)
    this.bgGfx.strokeLineShape(new Phaser.Geom.Line(baseLeft.x, baseLeft.y, baseRight.x, baseRight.y))

    // 구역 레이블 (스크린 공간)
    const labelStyle = { fontFamily: 'monospace', fontSize: '12px', color: '#33332a' }
    const ezMid = w2s(WORLD_W / 2, ZONE_ENEMY_BOTTOM / 2)
    const nmlMid = w2s(WORLD_W / 2, (ZONE_ENEMY_BOTTOM + ZONE_NML_BOTTOM) / 2)
    const plMid  = w2s(WORLD_W / 2, (ZONE_NML_BOTTOM + WORLD_H) / 2)
    this.add.text(ezMid.x,  ezMid.y,  '[ 적 구역 ]',        labelStyle).setOrigin(0.5).setDepth(1)
    this.add.text(nmlMid.x, nmlMid.y, "[ No Man's Land ]",  labelStyle).setOrigin(0.5).setDepth(1)
    this.add.text(plMid.x,  plMid.y,  '[ 플레이어 구역 ]',  labelStyle).setOrigin(0.5).setDepth(1)
  }
}
`)

// ─── HUDScene.ts ──────────────────────────────────────────────────────────────
write('scenes/HUDScene.ts', `import Phaser from 'phaser'
import { CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_HP, BASE_HP_MAX, PLAYER_AMMO_MAX, COLOR, ENEMY_HP } from '../constants'
import { PlayerState } from '../entities/PlayerSPG'
import { GamePhase } from '../systems/PhaseManager'

export interface HUDData {
  playerHp: number
  baseHp: number
  ammo: number
  playerState: PlayerState
  phase: GamePhase
  waveNumber: number
  enemyHp: number
}

export class HUDScene extends Phaser.Scene {
  private gfx!: Phaser.GameObjects.Graphics
  private texts: Record<string, Phaser.GameObjects.Text> = {}
  private hudData: HUDData = {
    playerHp: PLAYER_HP,
    baseHp: BASE_HP_MAX,
    ammo: PLAYER_AMMO_MAX,
    playerState: PlayerState.IDLE,
    phase: GamePhase.SCOUT,
    waveNumber: 0,
    enemyHp: ENEMY_HP,
  }

  constructor() { super({ key: 'HUDScene' }) }

  create() {
    this.gfx = this.add.graphics()
    const mono = { fontFamily: 'monospace', color: '#ccccbb' }
    this.texts['playerHp'] = this.add.text(218, 12, '', { ...mono, fontSize: '11px' })
    this.texts['baseHp']   = this.add.text(218, 34, '', { ...mono, fontSize: '11px' })
    this.texts['enemyHp']  = this.add.text(CANVAS_WIDTH - 218, 12, '', { ...mono, fontSize: '11px', color: '#cc9999' }).setOrigin(1, 0)
    this.texts['state']    = this.add.text(10, 58, '', { ...mono, fontSize: '12px', color: '#99ccbb' })
    this.texts['ammo']     = this.add.text(10, 74, '', { ...mono, fontSize: '12px', color: '#aaaaff' })
    this.texts['phase']    = this.add.text(CANVAS_WIDTH / 2, 8, '', { ...mono, fontSize: '16px', color: '#ffcc44' }).setOrigin(0.5, 0)
    this.texts['wave']     = this.add.text(CANVAS_WIDTH - 10, 34, '', { ...mono, fontSize: '12px', color: '#aabbcc' }).setOrigin(1, 0)
    this.texts['controls'] = this.add.text(10, CANVAS_HEIGHT - 20,
      'WASD: 이동 (아이소메트릭)   E: 방열/해제   클릭: 포격',
      { ...mono, fontSize: '11px', color: '#666655' })

    this.scene.get('GameScene').events.on('updateHUD', (data: HUDData) => { this.hudData = data })
  }

  update() {
    this.gfx.clear()
    const d = this.hudData

    const pRatio = Math.max(0, d.playerHp / PLAYER_HP)
    this.drawBar(10, 10, 200, 16, pRatio, pRatio > 0.4 ? COLOR.HP_HIGH : COLOR.HP_LOW)
    this.texts['playerHp'].setText(\`HP \${d.playerHp}/\${PLAYER_HP}\`)

    const bRatio = Math.max(0, d.baseHp / BASE_HP_MAX)
    this.drawBar(10, 32, 200, 16, bRatio, bRatio > 0.4 ? 0x44aacc : 0xcc6644)
    this.texts['baseHp'].setText(\`기지 \${d.baseHp}/\${BASE_HP_MAX}\`)

    const eRatio = Math.max(0, d.enemyHp / ENEMY_HP)
    this.drawBar(CANVAS_WIDTH - 210, 10, 200, 16, eRatio, COLOR.ENEMY_SPG)
    this.texts['enemyHp'].setText(\`적 \${Math.max(0, d.enemyHp)}\`)

    this.texts['state'].setText(\`상태: \${d.playerState}\`)
    this.texts['ammo'].setText(\`탄약: \${d.ammo}/\${PLAYER_AMMO_MAX}\`)
    this.texts['phase'].setText(d.phase === GamePhase.SCOUT ? '[ 정찰 페이즈 ]' : '[ 대결 페이즈 ]')
    this.texts['wave'].setText(\`웨이브 \${d.waveNumber}\`)
  }

  private drawBar(x: number, y: number, w: number, h: number, ratio: number, color: number) {
    this.gfx.fillStyle(0x111111, 0.75)
    this.gfx.fillRect(x, y, w + 4, h + 4)
    this.gfx.fillStyle(color, 1)
    this.gfx.fillRect(x + 2, y + 2, w * ratio, h)
    this.gfx.lineStyle(1, 0x666655, 0.6)
    this.gfx.strokeRect(x, y, w + 4, h + 4)
  }
}
`)

console.log('All files written successfully!')
