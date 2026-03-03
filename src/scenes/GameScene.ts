import Phaser from 'phaser'
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
    if (!this.enemy.isAlive()) this.showGameOver('적 자주포 격파!\n승리!')
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
        if (!this.player.isAlive()) this.showGameOver('자주포 격파!\n패배...')
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
    if (this.baseHp <= 0) this.showGameOver('기지 붕괴!\n패배...')
  }

  private showGameOver(msg: string) {
    if (this.gameOver) return
    this.gameOver = true
    this.gameOverText.setText(msg + '\n\n[R] 재시작')
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
