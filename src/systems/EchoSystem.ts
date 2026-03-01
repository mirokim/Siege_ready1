import Phaser from 'phaser'
import { ECHO_DURATION_MS, ECHO_PHASES, getEchoSize, COLOR, UNIT_SIZE } from '../constants'

interface EchoEntry {
  x: number
  y: number
  phase: number       // 0=강, 1=중, 2=약
  elapsed: number     // 현재 단계 경과 시간(ms)
  isEnemy: boolean    // 적 잔향 여부
}

// 잔향 반지름 (단계 × 크기 등급)
const RADIUS_TABLE: Record<number, number[]> = {
  0: [0, 0, 0],           // 근거리 — 잔향 없음
  1: [32, 24, 16],        // 기본 잔향
  2: [56, 40, 24],        // 큰 잔향
}

export class EchoSystem {
  private echoes: EchoEntry[] = []
  private gfx: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics()
    this.gfx.setDepth(55)  // 안개(50) 위에 렌더링 — 적 구역에서도 잔향 보임
  }

  /**
   * 새 잔향 생성
   * @param x, y — 발사 위치 (픽셀)
   * @param distanceUnits — 대상까지 거리 (칸 단위)
   * @param isEnemy — 적 발사 여부
   */
  createEcho(x: number, y: number, distanceUnits: number, isEnemy = false) {
    const sizeGrade = getEchoSize(distanceUnits)
    if (sizeGrade === 0) return   // 근거리는 잔향 없음
    this.echoes.push({ x, y, phase: 0, elapsed: 0, isEnemy })
  }

  update(delta: number) {
    for (const echo of this.echoes) {
      echo.elapsed += delta
      if (echo.elapsed >= ECHO_DURATION_MS) {
        echo.elapsed = 0
        echo.phase++
      }
    }
    // 소멸된 잔향 제거
    this.echoes = this.echoes.filter(e => e.phase < ECHO_PHASES)
    this.draw()
  }

  private draw() {
    this.gfx.clear()

    for (const echo of this.echoes) {
      const sizeGrade = echo.isEnemy ? 1 : 1  // 단순화: 모두 기본 크기
      const radii = RADIUS_TABLE[sizeGrade]
      const radius = radii[echo.phase]
      const alpha = [0.7, 0.4, 0.2][echo.phase]
      const color = echo.isEnemy ? COLOR.ENEMY_PROJ : COLOR.ECHO_STRONG

      this.gfx.lineStyle(2, color, alpha)
      this.gfx.strokeCircle(echo.x, echo.y, radius)

      // 내부 채움 (강한 단계만)
      if (echo.phase === 0) {
        this.gfx.fillStyle(color, alpha * 0.3)
        this.gfx.fillCircle(echo.x, echo.y, radius * 0.5)
      }

      // 십자 마커 (발사 중심점)
      this.gfx.lineStyle(1, color, alpha * 0.8)
      const cs = UNIT_SIZE * 0.3
      this.gfx.strokeRect(echo.x - cs / 2, echo.y - cs / 2, cs, cs)
    }
  }

  getEchoes() { return this.echoes }
}
