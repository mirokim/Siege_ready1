import Phaser from 'phaser'
import {
  INFANTRY_HP, INFANTRY_SPEED, INFANTRY_BASE_DMG,
  BASE_Y, COLOR, UNIT_SIZE,
} from '../constants'

export class Infantry extends Phaser.GameObjects.GameObject {
  x: number
  y: number
  hp: number
  private gfx: Phaser.GameObjects.Graphics
  private dead = false
  private reachedBase = false
  readonly baseDamage = INFANTRY_BASE_DMG

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, 'Infantry')
    scene.add.existing(this)
    this.x = x
    this.y = y
    this.hp = INFANTRY_HP
    this.gfx = scene.add.graphics()
    this.gfx.setDepth(15)
  }

  update(delta: number) {
    if (this.dead) return

    // 기지(BASE_Y)를 향해 직진
    this.y += INFANTRY_SPEED * delta / 1000

    if (this.y >= BASE_Y) {
      this.reachedBase = true
      this.dead = true
      this.gfx.clear()
    }

    this.draw()
  }

  private draw() {
    this.gfx.clear()

    const hpRatio = this.hp / INFANTRY_HP
    const bodyColor = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0xbb4444),
      Phaser.Display.Color.ValueToColor(COLOR.INFANTRY),
      100, Math.floor(hpRatio * 100),
    )
    const color = Phaser.Display.Color.GetColor(bodyColor.r, bodyColor.g, bodyColor.b)

    // 보병 분대: 작은 사각형들
    const offsets = [{ x: -6, y: 0 }, { x: 0, y: -4 }, { x: 6, y: 0 }, { x: 0, y: 4 }]
    for (const off of offsets) {
      this.gfx.fillStyle(color, 0.9)
      this.gfx.fillRect(this.x + off.x - 3, this.y + off.y - 3, 6, 6)
    }

    // HP바
    this.gfx.fillStyle(0x222222, 0.8)
    this.gfx.fillRect(this.x - 14, this.y - 14, 28, 3)
    this.gfx.fillStyle(hpRatio > 0.5 ? COLOR.HP_HIGH : COLOR.HP_LOW, 1)
    this.gfx.fillRect(this.x - 14, this.y - 14, 28 * hpRatio, 3)
  }

  takeDamage(amount: number) {
    this.hp -= amount
    if (this.hp <= 0) {
      this.dead = true
      this.gfx.clear()
    }
  }

  isDead() { return this.dead }
  hasReachedBase() { return this.reachedBase }

  getSplashHitCheck(hitX: number, hitY: number, splashR: number): boolean {
    const dx = this.x - hitX
    const dy = this.y - hitY
    return Math.sqrt(dx * dx + dy * dy) <= splashR + UNIT_SIZE
  }

  override destroy() {
    this.gfx.destroy()
    super.destroy()
  }
}
