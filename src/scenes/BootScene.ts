import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload() {
    // 외부 에셋 없음 — 모든 그래픽은 procedural
    // 필요 시 여기서 폰트/오디오 로드
  }

  create() {
    this.scene.start('GameScene')
  }
}
