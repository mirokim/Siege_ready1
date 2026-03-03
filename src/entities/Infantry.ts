import Phaser from 'phaser'
import { INFANTRY_HP, INFANTRY_SPEED, INFANTRY_BASE_DMG, BASE_Y, COLOR } from '../constants'
import { w2s, drawIsoBox, isoDepth } from '../utils/IsoUtils'

export class Infantry extends Phaser.GameObjects.GameObject {
  x: number   // world 셀
  y: number   // world 셀
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
    this.gfx.setDepth(20 + isoDepth(x, y))
  }

  update(delta: number) {
    if (this.dead) return

    this.y += INFANTRY_SPEED * delta / 1000
    this.gfx.setDepth(20 + isoDepth(this.x, this.y))

    if (this.y >= BASE_Y) {
      this.reachedBase = true
      this.dead = true
      this.gfx.clear()
      return
    }

    this.draw()
  }

  private draw() {
    this.gfx.clear()

    const hpRatio = this.hp / INFANTRY_HP
    const interpColor = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0xbb4444),
      Phaser.Display.Color.ValueToColor(COLOR.INFANTRY),
      100,
      Math.floor(hpRatio * 100),
    )
    const topC  = Phaser.Display.Color.GetColor(interpColor.r, interpColor.g, interpColor.b)
    const leftC = Phaser.Display.Color.ValueToColor(topC).darken(35).color
    const rightC = Phaser.Display.Color.ValueToColor(topC).darken(18).color

    const hw = 0.25
    drawIsoBox(this.gfx, this.x - hw, this.y - hw, hw * 2, hw * 2, 10, topC, leftC, rightC)

    const { x: sx, y: sy } = w2s(this.x, this.y)
    const barW = 20
    this.gfx.fillStyle(0x222222, 0.8)
    this.gfx.fillRect(sx - barW / 2, sy - 18, barW, 3)
    this.gfx.fillStyle(hpRatio > 0.5 ? COLOR.HP_HIGH : COLOR.HP_LOW, 1)
    this.gfx.fillRect(sx - barW / 2, sy - 18, barW * hpRatio, 3)
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
    return Math.sqrt(dx * dx + dy * dy) <= splashR + 0.5
  }

  override destroy() {
    this.gfx.destroy()
    super.destroy()
  }
}
