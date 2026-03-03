import Phaser from 'phaser'
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
    this.texts['playerHp'].setText(`HP ${d.playerHp}/${PLAYER_HP}`)

    const bRatio = Math.max(0, d.baseHp / BASE_HP_MAX)
    this.drawBar(10, 32, 200, 16, bRatio, bRatio > 0.4 ? 0x44aacc : 0xcc6644)
    this.texts['baseHp'].setText(`기지 ${d.baseHp}/${BASE_HP_MAX}`)

    const eRatio = Math.max(0, d.enemyHp / ENEMY_HP)
    this.drawBar(CANVAS_WIDTH - 210, 10, 200, 16, eRatio, COLOR.ENEMY_SPG)
    this.texts['enemyHp'].setText(`적 ${Math.max(0, d.enemyHp)}`)

    this.texts['state'].setText(`상태: ${d.playerState}`)
    this.texts['ammo'].setText(`탄약: ${d.ammo}/${PLAYER_AMMO_MAX}`)
    this.texts['phase'].setText(d.phase === GamePhase.SCOUT ? '[ 정찰 페이즈 ]' : '[ 대결 페이즈 ]')
    this.texts['wave'].setText(`웨이브 ${d.waveNumber}`)
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
