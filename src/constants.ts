// ─── 화면 ────────────────────────────────────────────────────────────────────
export const CANVAS_WIDTH  = 1920
export const CANVAS_HEIGHT = 1080

// ─── 월드 그리드 (셀 단위) ────────────────────────────────────────────────────
// IsoUtils에서 WORLD_W/H, TILE_W/H 등을 export하므로 여기선 zone 경계만 정의
export const ZONE_ENEMY_BOTTOM = 7    // 적 구역 wy 0~7
export const ZONE_NML_BOTTOM   = 12   // No Man's Land wy 7~12
export const ZONE_PLAYER_TOP   = 12   // 플레이어 구역 wy 12~20
export const BASE_Y            = 19   // 플레이어 기지 wy

// ─── 플레이어 SPG ─────────────────────────────────────────────────────────────
export const PLAYER_SPEED        = 6     // 셀/초
export const PLAYER_HP           = 100
export const PLAYER_DEPLOY_TIME  = 3.0
export const PLAYER_UNDEPLOY_TIME = 2.0
export const PLAYER_RELOAD_TIME  = 4.0
export const PLAYER_AMMO_MAX     = 20

// ─── 적 SPG ───────────────────────────────────────────────────────────────────
export const ENEMY_HP            = 150
export const ENEMY_DEPLOY_TIME   = 3.5
export const ENEMY_AIM_TIME      = 2.0
export const ENEMY_RELOAD_TIME   = 5.0
export const ENEMY_MOVE_SPEED    = 3.0   // 셀/초
export const ENEMY_AIM_SPREAD    = 4.5   // ±4.5 셀 오차

// ─── 포격 ─────────────────────────────────────────────────────────────────────
export const SPLASH_RADIUS       = 1.5   // 셀
export const PROJECTILE_DAMAGE   = 50
export const MINION_PROJECTILE_DAMAGE = 30

/** 사거리 → 비행 시간 (ms), distCells은 셀 단위 */
export function getFlightTime(distCells: number): number {
  if (distCells < 7)  return 0
  if (distCells < 16) return 1000
  return 2000
}

// ─── 잔향(Echo) 시스템 ────────────────────────────────────────────────────────
export const ECHO_DURATION_MS    = 5000
export const ECHO_PHASES         = 3

/** 사거리 → 잔향 크기 등급 (0=없음, 1=기본, 2=큼) */
export function getEchoSize(distCells: number): number {
  if (distCells <= 7)  return 0
  if (distCells <= 15) return 1
  return 2
}

// ─── 기지 HP ──────────────────────────────────────────────────────────────────
export const BASE_HP_MAX         = 100

// ─── 미니언 ───────────────────────────────────────────────────────────────────
export const INFANTRY_HP         = 30
export const INFANTRY_SPEED      = 0.7   // 셀/초
export const INFANTRY_BASE_DMG   = 5

// ─── 웨이브 ───────────────────────────────────────────────────────────────────
export const WAVE_INTERVAL_MS    = 10000

// ─── 페이즈 ───────────────────────────────────────────────────────────────────
export const SCOUT_WAVE_COUNT    = 3
export const SCOUT_DURATION_MS   = 60000

// ─── 색상 팔레트 ──────────────────────────────────────────────────────────────
export const COLOR = {
  // 타일 바닥색
  ENEMY_ZONE:       0x1a1812,
  NML:              0x252218,
  GROUND:           0x2e2e22,

  // 안개
  FOG:              0x050504,

  // 엔티티
  PLAYER_SPG:       0x8fbc8f,
  ENEMY_SPG:        0xbc8f8f,
  PROJECTILE:       0xffe066,
  ENEMY_PROJ:       0xff6644,

  // 잔향
  ECHO_STRONG:      0xffd700,
  ECHO_MED:         0xb8860b,
  ECHO_WEAK:        0x4a3a00,

  // 삼각측량
  TRIANGULATION:    0x00ccff,
  DIRECTION_ARROW:  0xff4444,

  // 보병
  INFANTRY:         0x7799aa,

  // 기지
  BASE_LINE:        0x556655,

  // HUD
  HUD_BG:           0x111111,
  HUD_TEXT:         0xdddddd,
  HP_HIGH:          0x44bb44,
  HP_LOW:           0xbb4444,
  AMMO:             0xaaaaff,

  // 지형 3D 박스
  COVER_TOP:        0x4a5240,
  COVER_LEFT:       0x2e3228,
  COVER_RIGHT:      0x3c4234,
  ROCK_TOP:         0x3a3a2a,
  ROCK_LEFT:        0x252520,
  ROCK_RIGHT:       0x2e2e28,
}
