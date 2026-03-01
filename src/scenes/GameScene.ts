import Phaser from 'phaser'
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  ZONE_ENEMY_BOTTOM, ZONE_NML_BOTTOM, BASE_Y,
  BASE_HP_MAX, SPLASH_RADIUS,
  SCOUT_WAVE_COUNT, SCOUT_DURATION_MS,
  COLOR,
} from '../constants'
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
  // ── 핵심 시스템 ────────────────────────────────────────────────
  private echoSystem!: EchoSystem
  private waveManager!: WaveManager
  private phaseManager!: PhaseManager
  private triangUI!: TriangulationUI

  // ── 엔티티 ─────────────────────────────────────────────────────
  private player!: PlayerSPG
  private enemy!: EnemySPG
  private projectiles: Projectile[] = []

  // ── 게임 상태 ──────────────────────────────────────────────────
  private baseHp = BASE_HP_MAX
  private scoutTimer = SCOUT_DURATION_MS
  private bgGfx!: Phaser.GameObjects.Graphics
  private zoneLabels: Phaser.GameObjects.Text[] = []
  private gameOver = false
  private gameOverText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'GameScene' })
  }

  create() {
    // 1. 배경
    this.bgGfx = this.add.graphics()
    this.bgGfx.setDepth(0)
    this.drawBackground()

    // 2. 시스템 초기화 (TerrainSystem은 배경 직후 — depth 5)
    new TerrainSystem(this)
    this.echoSystem   = new EchoSystem(this)
    this.triangUI     = new TriangulationUI(this)
    this.phaseManager = new PhaseManager()
    new FogSystem(this)

    this.waveManager = new WaveManager(this, (dmg: number) => {
      this.baseHp = Math.max(0, this.baseHp - dmg)
      this.checkGameOver()
    })

    // 3. 플레이어 SPG
    this.player = new PlayerSPG(
      this,
      this.echoSystem,
      (proj: Projectile) => this.addProjectile(proj),
    )

    // 4. 적 SPG
    this.enemy = new EnemySPG(
      this,
      this.echoSystem,
      this.triangUI,
      this.player,
      (proj: Projectile) => this.addProjectile(proj),
    )

    // 5. 페이즈 전환 콜백
    this.phaseManager.setOnPhaseChange((phase) => {
      this.onPhaseChange(phase)
    })

    // 6. HUD 씬 병렬 실행
    this.scene.launch('HUDScene')

    // 7. 게임오버 텍스트
    this.gameOverText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, '', {
      fontFamily: 'monospace', fontSize: '36px', color: '#ffcc44',
      backgroundColor: '#00000099', padding: { x: 24, y: 16 },
    }).setOrigin(0.5).setDepth(100).setVisible(false)

    // 8. 재시작 키
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

    if (!this.enemy.isAlive()) {
      this.showGameOver('적 자주포 격파!\n승리!')
    }
  }

  // ── 발사체 관리 ────────────────────────────────────────────────
  private addProjectile(proj: Projectile) {
    proj.setOnHit((x, y, owner) => this.applyHit(x, y, owner))
    this.projectiles.push(proj)
  }

  private updateProjectiles(delta: number) {
    for (const proj of this.projectiles) {
      proj.update(delta)
    }
    this.projectiles = this.projectiles.filter(p => {
      if (p.isDone()) { p.destroy(); return false }
      return true
    })
  }

  // ── 페이즈 관리 ────────────────────────────────────────────────
  private updatePhase(delta: number) {
    if (this.phaseManager.isScout()) {
      this.scoutTimer -= delta
      if (this.scoutTimer <= 0 || this.waveManager.getWaveNumber() >= SCOUT_WAVE_COUNT) {
        this.phaseManager.transitionTo(GamePhase.DUEL)
      }
    }
  }

  private onPhaseChange(_phase: GamePhase) {
    // 대결 페이즈 전환 효과 — 추후 확장
  }

  // ── 충돌 처리 ──────────────────────────────────────────────────
  applyHit(hitX: number, hitY: number, owner: 'player' | 'enemy') {
    if (owner === 'player') {
      this.waveManager.applySplashDamage(hitX, hitY, SPLASH_RADIUS, 50)
      const dx = this.enemy.x - hitX
      const dy = this.enemy.y - hitY
      if (Math.sqrt(dx * dx + dy * dy) < SPLASH_RADIUS + 20) {
        this.enemy.takeDamage(50)
      }
    } else {
      const dx = this.player.x - hitX
      const dy = this.player.y - hitY
      if (Math.sqrt(dx * dx + dy * dy) < SPLASH_RADIUS + 20) {
        this.player.takeDamage(40)
        if (!this.player.isAlive()) {
          this.showGameOver('자주포 격파!\n패배...')
        }
      }
    }
  }

  // ── HUD emit ───────────────────────────────────────────────────
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

  // ── 게임오버 ──────────────────────────────────────────────────
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

  // ── 배경 그리기 ────────────────────────────────────────────────
  private drawBackground() {
    this.bgGfx.clear()

    // 적 구역
    this.bgGfx.fillStyle(COLOR.ENEMY_ZONE, 1)
    this.bgGfx.fillRect(0, 0, CANVAS_WIDTH, ZONE_ENEMY_BOTTOM)

    // No Man's Land — 약간 다른 텍스처 느낌
    this.bgGfx.fillStyle(COLOR.NML, 1)
    this.bgGfx.fillRect(0, ZONE_ENEMY_BOTTOM, CANVAS_WIDTH, ZONE_NML_BOTTOM - ZONE_ENEMY_BOTTOM)
    // NML 노이즈 패턴 (10px 격자)
    this.bgGfx.lineStyle(1, 0x222218, 0.2)
    for (let y = ZONE_ENEMY_BOTTOM; y < ZONE_NML_BOTTOM; y += 40) {
      this.bgGfx.strokeLineShape(new Phaser.Geom.Line(0, y, CANVAS_WIDTH, y))
    }

    // 플레이어 구역
    this.bgGfx.fillStyle(COLOR.GROUND, 1)
    this.bgGfx.fillRect(0, ZONE_NML_BOTTOM, CANVAS_WIDTH, CANVAS_HEIGHT - ZONE_NML_BOTTOM)
    // 플레이어 구역 격자 (전술 그리드 느낌)
    this.bgGfx.lineStyle(1, 0x333328, 0.15)
    for (let y = ZONE_NML_BOTTOM; y < CANVAS_HEIGHT; y += 64) {
      this.bgGfx.strokeLineShape(new Phaser.Geom.Line(0, y, CANVAS_WIDTH, y))
    }
    for (let x = 0; x < CANVAS_WIDTH; x += 64) {
      this.bgGfx.strokeLineShape(new Phaser.Geom.Line(x, ZONE_NML_BOTTOM, x, CANVAS_HEIGHT))
    }

    // 기지 라인
    this.bgGfx.fillStyle(COLOR.BASE_LINE, 0.4)
    this.bgGfx.fillRect(0, BASE_Y - 8, CANVAS_WIDTH, 8)

    // 구역 레이블
    const labelStyle = { fontFamily: 'monospace', fontSize: '13px', color: '#33332a' }
    this.zoneLabels.forEach(t => t.destroy())
    this.zoneLabels = [
      this.add.text(10, 10, '[ 적 구역 ]', labelStyle).setDepth(1),
      this.add.text(10, ZONE_ENEMY_BOTTOM + 6, '[ No Man\'s Land ]', labelStyle).setDepth(1),
      this.add.text(10, ZONE_NML_BOTTOM + 6, '[ 플레이어 구역 ]', labelStyle).setDepth(1),
    ]
  }
}
