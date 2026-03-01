// ─── 화면 / 맵 ────────────────────────────────────────────────────────────────
export const CANVAS_WIDTH  = 1280
export const CANVAS_HEIGHT = 720
export const UNIT_SIZE     = 32   // 1칸 = 32px

// ─── 구역 경계 (y 픽셀 기준) ──────────────────────────────────────────────────
export const ZONE_ENEMY_TOP    = 0
export const ZONE_ENEMY_BOTTOM = 240   // 적 구역 y 0~240
export const ZONE_NML_BOTTOM   = 400   // No Man's Land y 240~400
export const ZONE_PLAYER_TOP   = 400   // 플레이어 구역 y 400~720
export const BASE_Y            = 700   // 플레이어 기지 y

// ─── 플레이어 SPG ─────────────────────────────────────────────────────────────
export const PLAYER_SPEED        = 160   // px/s (IDLE→MOVING)
export const PLAYER_HP           = 100
export const PLAYER_DEPLOY_TIME  = 3.0   // 방열 시간 (초)
export const PLAYER_UNDEPLOY_TIME = 2.0  // 방열 해제 시간 (초)
export const PLAYER_RELOAD_TIME  = 4.0   // 재장전 시간 (초)
export const PLAYER_AMMO_MAX     = 20

// ─── 적 SPG ───────────────────────────────────────────────────────────────────
export const ENEMY_HP            = 150
export const ENEMY_DEPLOY_TIME   = 3.5
export const ENEMY_AIM_TIME      = 2.0
export const ENEMY_RELOAD_TIME   = 5.0   // 플레이어(4s)보다 느림 — 약점
export const ENEMY_MOVE_SPEED    = 120
export const ENEMY_AIM_SPREAD    = UNIT_SIZE * 2  // 조준 오차 ±2칸

// ─── 포격 ─────────────────────────────────────────────────────────────────────
export const PROJECTILE_SPEED    = 600   // px/s (시각적 이동)
export const SPLASH_RADIUS       = UNIT_SIZE * 1.5  // 기본 스플래시 (3×3칸 근사)
export const PROJECTILE_DAMAGE   = 50
export const MINION_PROJECTILE_DAMAGE = 30

// 사거리별 비행 시간 (GDD §5-3)
export function getFlightTime(distanceUnits: number): number {
  if (distanceUnits < 7)  return 0      // 즉시
  if (distanceUnits < 16) return 1000   // 1초 (ms)
  return 2000                            // 2초
}

// ─── 잔향(Echo) 시스템 ────────────────────────────────────────────────────────
export const ECHO_DURATION_MS    = 5000  // 단계별 지속 시간 (강/중/약 각 5초)
export const ECHO_PHASES         = 3
// 거리별 잔향 크기 (GDD §5-4)
export function getEchoSize(distanceUnits: number): number {
  if (distanceUnits <= 7)  return 0   // 잔향 없음
  if (distanceUnits <= 15) return 1   // 기본
  return 2                             // 큰 잔향
}

// ─── 기지 HP ──────────────────────────────────────────────────────────────────
export const BASE_HP_MAX         = 100

// ─── 미니언 ───────────────────────────────────────────────────────────────────
export const INFANTRY_HP         = 30
export const INFANTRY_SPEED      = 70   // px/s
export const INFANTRY_BASE_DMG   = 5    // 기지 도달 시 피해

// ─── 웨이브 ───────────────────────────────────────────────────────────────────
export const WAVE_INTERVAL_MS    = 8000  // 웨이브 간격

// ─── 페이즈 ───────────────────────────────────────────────────────────────────
export const SCOUT_WAVE_COUNT    = 3     // 정찰 페이즈 웨이브 수
export const SCOUT_DURATION_MS   = 60000 // 정찰 페이즈 최대 시간 (60초)

// ─── 색상 팔레트 ──────────────────────────────────────────────────────────────
export const COLOR = {
  GROUND:         0x3d3d2e,
  NML:            0x2a2a1e,
  ENEMY_ZONE:     0x1a1a12,
  FOG:            0x0d0d08,
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
}

// ─── 레인 X 위치 (No Man's Land 미니언 스폰) ─────────────────────────────────
export const LANES = [
  CANVAS_WIDTH * 0.25,
  CANVAS_WIDTH * 0.50,
  CANVAS_WIDTH * 0.75,
]
