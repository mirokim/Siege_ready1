// ─── 화면 / 맵 ────────────────────────────────────────────────────────────────
export const CANVAS_WIDTH  = 1920
export const CANVAS_HEIGHT = 1080
export const UNIT_SIZE     = 32   // 1칸 = 32px

// ─── 구역 경계 (y 픽셀 기준) ──────────────────────────────────────────────────
export const ZONE_ENEMY_TOP    = 0
export const ZONE_ENEMY_BOTTOM = 360   // 적 구역 y 0~360
export const ZONE_NML_BOTTOM   = 600   // No Man's Land y 360~600
export const ZONE_PLAYER_TOP   = 600   // 플레이어 구역 y 600~1080
export const BASE_Y            = 1050  // 플레이어 기지 y

// ─── 플레이어 SPG ─────────────────────────────────────────────────────────────
export const PLAYER_SPEED        = 200   // px/s — 넓어진 맵 반영
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
export const ENEMY_MOVE_SPEED    = 120
// 조준 오차: ±10칸 (320px) → 적이 자주 빗나감
export const ENEMY_AIM_SPREAD    = UNIT_SIZE * 10

// ─── 포격 ─────────────────────────────────────────────────────────────────────
export const PROJECTILE_SPEED    = 700
export const SPLASH_RADIUS       = UNIT_SIZE * 1.5
export const PROJECTILE_DAMAGE   = 50
export const MINION_PROJECTILE_DAMAGE = 30

// 사거리별 비행 시간 (GDD §5-3)
export function getFlightTime(distanceUnits: number): number {
  if (distanceUnits < 7)  return 0
  if (distanceUnits < 16) return 1000
  return 2000
}

// ─── 잔향(Echo) 시스템 ────────────────────────────────────────────────────────
export const ECHO_DURATION_MS    = 5000
export const ECHO_PHASES         = 3
export function getEchoSize(distanceUnits: number): number {
  if (distanceUnits <= 7)  return 0
  if (distanceUnits <= 15) return 1
  return 2
}

// ─── 기지 HP ──────────────────────────────────────────────────────────────────
export const BASE_HP_MAX         = 100

// ─── 미니언 ───────────────────────────────────────────────────────────────────
export const INFANTRY_HP         = 30
export const INFANTRY_SPEED      = 40   // px/s — 느리게 (기존 70)
export const INFANTRY_BASE_DMG   = 5

// ─── 웨이브 ───────────────────────────────────────────────────────────────────
export const WAVE_INTERVAL_MS    = 10000  // 10초 간격 (기존 8초)

// ─── 페이즈 ───────────────────────────────────────────────────────────────────
export const SCOUT_WAVE_COUNT    = 3
export const SCOUT_DURATION_MS   = 60000

// ─── 색상 팔레트 ──────────────────────────────────────────────────────────────
export const COLOR = {
  GROUND:         0x3d3d2e,
  NML:            0x2a2a1e,
  ENEMY_ZONE:     0x1a1a12,
  FOG:            0x050504,
  PLAYER_SPG:     0x8fbc8f,
  ENEMY_SPG:      0xbc8f8f,
  PROJECTILE:     0xffe066,
  ENEMY_PROJ:     0xff6644,
  ECHO_STRONG:    0xffd700,
  ECHO_MED:       0xb8860b,
  ECHO_WEAK:      0x4a3a00,
  TRIANGULATION:  0x00ccff,
  DIRECTION_ARROW:0xff4444,
  INFANTRY:       0x7799aa,
  BASE_LINE:      0x556655,
  HUD_BG:         0x111111,
  HUD_TEXT:       0xdddddd,
  HP_HIGH:        0x44bb44,
  HP_LOW:         0xbb4444,
  AMMO:           0xaaaaff,
  TERRAIN_COVER:  0x4a5240,
  TERRAIN_ROCK:   0x3a3a2a,
}

// ─── 레인 — 더 이상 고정 레인 사용 안 함, WaveManager가 랜덤 처리 ─────────────
export const LANES = [
  CANVAS_WIDTH * 0.20,
  CANVAS_WIDTH * 0.35,
  CANVAS_WIDTH * 0.50,
  CANVAS_WIDTH * 0.65,
  CANVAS_WIDTH * 0.80,
]
