import Phaser from 'phaser'
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
