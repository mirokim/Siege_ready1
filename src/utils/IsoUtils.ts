// ── 아이소메트릭 좌표 시스템 ──────────────────────────────────────────────────
// World: 30×20 셀 그리드 (셀 단위)
// Screen: 1920×1080 캔버스, 2:1 아이소메트릭 투영
//
//   screen_x = ISO_OX + (wx - wy) * TILE_W/2
//   screen_y = ISO_OY + (wx + wy) * TILE_H/2
//
// 맵 꼭짓점(30×20 기준):
//   Top:    (960, 120)  ← world (0,  0)
//   Right:  (1920, 600) ← world (30, 0)
//   Bottom: (1280, 920) ← world (30, 20)
//   Left:   (320,  440) ← world (0,  20)

export const WORLD_W = 30
export const WORLD_H = 20
export const TILE_W  = 64   // 타일 픽셀 너비
export const TILE_H  = 32   // 타일 픽셀 높이 (2:1 비율)

// 스크린 원점 — world(0,0)이 매핑되는 스크린 위치
export const ISO_OX = 960   // CANVAS_WIDTH / 2
export const ISO_OY = 120

// ── 좌표 변환 ─────────────────────────────────────────────────────────────────

/** World 셀 → Screen 픽셀 (타일 최상단 꼭짓점) */
export function w2s(wx: number, wy: number): { x: number; y: number } {
  return {
    x: ISO_OX + (wx - wy) * (TILE_W / 2),
    y: ISO_OY + (wx + wy) * (TILE_H / 2),
  }
}

/** Screen 픽셀 → World 셀 (소수 좌표 반환) */
export function s2w(sx: number, sy: number): { x: number; y: number } {
  const rx = (sx - ISO_OX) / (TILE_W / 2)
  const ry = (sy - ISO_OY) / (TILE_H / 2)
  return {
    x: (rx + ry) / 2,
    y: (ry - rx) / 2,
  }
}

/** 두 World 좌표 사이의 거리 (셀 단위) */
export function worldDist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2)
}

/** Depth key — 카메라에 가까울수록 큰 값 (painter's algorithm) */
export function isoDepth(wx: number, wy: number): number {
  return (wx + wy) * 2
}

// ── 그리기 헬퍼 ───────────────────────────────────────────────────────────────

/**
 * 아이소메트릭 3D 박스 그리기
 * @param wx,wy  — 박스 back-left 월드 좌표 (셀)
 * @param ww,wd  — 박스 너비(wx 방향) / 깊이(wy 방향) in 셀
 * @param boxH   — 박스 스크린 높이 (픽셀)
 * @param topC   — 상단면 색상 (가장 밝음)
 * @param leftC  — 좌측면 색상 (A→D 면)
 * @param rightC — 우측면 색상 (D→C 면)
 */
export function drawIsoBox(
  gfx: Phaser.GameObjects.Graphics,
  wx: number, wy: number,
  ww: number, wd: number,
  boxH: number,
  topC: number, leftC: number, rightC: number,
) {
  const A = w2s(wx,      wy)       // back
  const B = w2s(wx + ww, wy)       // right
  const C = w2s(wx + ww, wy + wd)  // front-right
  const D = w2s(wx,      wy + wd)  // left

  const Ab = { x: A.x, y: A.y + boxH }
  const Db = { x: D.x, y: D.y + boxH }
  const Cb = { x: C.x, y: C.y + boxH }

  // 좌측면: A → D → Db → Ab
  gfx.fillStyle(leftC, 1)
  gfx.fillPoints([A, D, Db, Ab], true)

  // 우측면: D → C → Cb → Db
  gfx.fillStyle(rightC, 1)
  gfx.fillPoints([D, C, Cb, Db], true)

  // 상단면: A → B → C → D
  gfx.fillStyle(topC, 1)
  gfx.fillPoints([A, B, C, D], true)

  // 모서리 윤곽선
  gfx.lineStyle(1, 0x000000, 0.3)
  gfx.strokePoints([A, B, C, D], true)
  gfx.strokePoints([A, Ab], false)
  gfx.strokePoints([D, Db], false)
  gfx.strokePoints([Ab, Db, Cb], false)
}

/**
 * 아이소메트릭 타일 다이아몬드 하나 그리기 (1×1 셀)
 */
export function drawIsoTile(
  gfx: Phaser.GameObjects.Graphics,
  wx: number, wy: number,
  color: number, alpha = 1,
) {
  const { x, y } = w2s(wx, wy)
  const hw = TILE_W / 2
  const hh = TILE_H / 2
  gfx.fillStyle(color, alpha)
  gfx.fillPoints([
    { x,       y         },
    { x: x + hw, y: y + hh },
    { x,       y: y + TILE_H },
    { x: x - hw, y: y + hh },
  ], true)
}

/**
 * 아이소메트릭 타일 다이아몬드 윤곽선
 */
export function strokeIsoTile(
  gfx: Phaser.GameObjects.Graphics,
  wx: number, wy: number,
) {
  const { x, y } = w2s(wx, wy)
  const hw = TILE_W / 2
  const hh = TILE_H / 2
  gfx.strokePoints([
    { x,       y         },
    { x: x + hw, y: y + hh },
    { x,       y: y + TILE_H },
    { x: x - hw, y: y + hh },
  ], true)
}
