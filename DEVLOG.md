# Siege Ready — 개발 기록 및 현황

> 마지막 업데이트: 2026-03-03
> GitHub: https://github.com/mirokim/Siege_ready1
> 최신 커밋: `2f7bfa8` feat: convert to isometric 2.5D bird's-eye view

---

## 1. 프로젝트 개요

포병 로그라이트 디펜스 게임.
플레이어가 자주포(SPG)를 조종해 적 SPG와 전투하고, 밀려오는 보병 웨이브로부터 기지를 방어한다.

**핵심 콘셉트:**
- **잔향(Echo) 시스템**: 포격 위치에 3단계 페이드 원형 마커 → 적 위치 추적 단서
- **삼각측량**: 적 포격 방향선 2개 이상이 교차하면 추정 위치 마커 표시
- **방열 상태 머신**: IDLE → DEPLOYING → SIEGE → FIRING → RELOADING → SIEGE
- **안개 전쟁**: 적 구역은 짙은 안개, NML은 반투명 안개
- **Scout / Duel 페이즈**: 초반 정찰 페이즈 → 대결 페이즈

---

## 2. 기술 스택

| 항목 | 버전 |
|------|------|
| 엔진 | Phaser 3.88+ |
| 언어 | TypeScript 5.x |
| 번들러 | Vite 6.x |
| 그래픽 | 100% Procedural (Phaser Graphics API, 외부 에셋 없음) |
| 물리 | Phaser Arcade (기본 설정, 실제 물리는 거의 미사용) |

---

## 3. 실행 방법

```bash
git clone https://github.com/mirokim/Siege_ready1.git
cd Siege_ready1
npm install
npm run dev        # localhost:3000 개발 서버
npm run build      # dist/ 빌드
```

---

## 4. 프로젝트 구조

```
siege-ready/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.ts                   # Phaser.Game 초기화 (1920×1080, FIT scale)
    ├── constants.ts              # 모든 게임 상수 (셀 단위 기반)
    ├── utils/
    │   └── IsoUtils.ts           # 아이소메트릭 좌표 변환 유틸
    ├── scenes/
    │   ├── BootScene.ts          # 빠른 전환 씬 (에셋 로드 없음)
    │   ├── GameScene.ts          # 메인 게임 씬
    │   └── HUDScene.ts           # 병렬 HUD 씬 (scene.launch)
    ├── entities/
    │   ├── PlayerSPG.ts          # 플레이어 자주포 (상태 머신)
    │   ├── EnemySPG.ts           # 적 자주포 AI
    │   ├── Projectile.ts         # 포탄 (아이소 포물선 비행)
    │   └── Infantry.ts           # 보병 미니언
    └── systems/
        ├── EchoSystem.ts         # 잔향 생성/페이드
        ├── FogSystem.ts          # 안개 레이어 (구역별 폴리곤)
        ├── WaveManager.ts        # 보병 웨이브 스폰/관리
        ├── PhaseManager.ts       # Scout/Duel 페이즈 전환
        ├── TriangulationUI.ts    # 방향 화살표 + 방향선 + 교차점
        └── TerrainSystem.ts      # 랜덤 지형 (cover/rock/ruin)
```

---

## 5. 좌표 시스템 — 아이소메트릭 2.5D

### 5-1. 기본 개념

2026-03-03 기준 전체 렌더링이 **2:1 아이소메트릭 투영**으로 전환되었다.

```
World 공간: 30×20 셀 그리드
Screen 공간: 1920×1080 픽셀 (Phaser canvas)

변환 공식:
  screen_x = 960  + (wx - wy) * 32
  screen_y = 120  + (wx + wy) * 16
```

### 5-2. 맵 다이아몬드 경계 (30×20 그리드)

```
        Top (960, 120)      ← world (0, 0)
       /                \
Left (320, 440)      Right (1920, 600)
  ← world (0,20)       ← world (30, 0)
       \                /
       Bottom (1280, 920)   ← world (30, 20)
```

### 5-3. 유틸 함수 (`src/utils/IsoUtils.ts`)

```ts
w2s(wx, wy)  → { x, y }    // World 셀 → Screen 픽셀
s2w(sx, sy)  → { x, y }    // Screen 픽셀 → World 셀
worldDist(ax, ay, bx, by)   // 두 월드 좌표 간 거리 (셀)
isoDepth(wx, wy)            // Depth key: (wx+wy)*2 (높을수록 카메라에 가까움)
drawIsoBox(gfx, wx, wy, ww, wd, boxH, topC, leftC, rightC)  // 3D 박스
drawIsoTile(gfx, wx, wy, color, alpha)                       // 1×1 다이아몬드 타일
```

---

## 6. 구역 경계 (셀 단위)

| 구역 | wy 범위 | 설명 |
|------|---------|------|
| 적 구역 | 0 ~ 7 | 안개 96%, 적 SPG 활동 영역 |
| No Man's Land | 7 ~ 12 | 안개 52%, 보병 통과 구역 |
| 플레이어 구역 | 12 ~ 20 | 안개 없음, 플레이어 이동 가능 |
| 기지 라인 | wy = 19 | 보병이 도달하면 기지 HP 감소 |

---

## 7. 게임 상수 (`src/constants.ts`)

### 주요 값

```ts
// 구역 (셀 단위)
ZONE_ENEMY_BOTTOM = 7
ZONE_NML_BOTTOM   = 12
ZONE_PLAYER_TOP   = 12
BASE_Y            = 19

// 플레이어
PLAYER_SPEED      = 6      // 셀/초
PLAYER_HP         = 100
PLAYER_DEPLOY_TIME  = 3.0  // 방열 시간(초)
PLAYER_UNDEPLOY_TIME = 2.0
PLAYER_RELOAD_TIME  = 4.0
PLAYER_AMMO_MAX   = 20

// 적 SPG
ENEMY_HP          = 150
ENEMY_DEPLOY_TIME = 3.5
ENEMY_AIM_TIME    = 2.0
ENEMY_RELOAD_TIME = 5.0
ENEMY_MOVE_SPEED  = 3.0    // 셀/초
ENEMY_AIM_SPREAD  = 4.5    // ±셀 오차

// 포격
SPLASH_RADIUS     = 1.5    // 셀
PROJECTILE_DAMAGE = 50
getFlightTime(dist) // 7셀 미만=0ms, 16셀 미만=1000ms, 이상=2000ms

// 보병
INFANTRY_SPEED    = 0.7    // 셀/초
INFANTRY_HP       = 30
INFANTRY_BASE_DMG = 5

// 웨이브
WAVE_INTERVAL_MS  = 10000  // 10초 간격
SCOUT_WAVE_COUNT  = 3      // 3웨이브 후 Duel 페이즈
```

---

## 8. 엔티티 상세

### PlayerSPG (`src/entities/PlayerSPG.ts`)

**상태 머신:**
```
IDLE ↔ MOVING           (WASD 이동)
IDLE → DEPLOYING         (E키, 3초)
DEPLOYING → SIEGE
SIEGE → FIRING           (마우스 클릭)
FIRING → RELOADING       (즉시, 4초 대기)
RELOADING → SIEGE
SIEGE → UNDEPLOYING      (E키, 2초)
UNDEPLOYING → IDLE
```

**WASD 아이소메트릭 이동:**
```
W → world (-1, -1)  → 화면 위로 (적 방향 전진)
S → world (+1, +1)  → 화면 아래로
A → world (-1, +1)  → 화면 좌로
D → world (+1, -1)  → 화면 우로
```

**이동 제한:** wx 0.5~29.5, wy 12.5~18.5 (플레이어 구역 안에만)

**렌더링:** 1.4×0.8 셀 아이소메트릭 박스 + 포신 (마우스 방향 추적)

### EnemySPG (`src/entities/EnemySPG.ts`)

**AI 사이클:** DEPLOYING(3.5s) → AIMING(2s) → 발사 → MOVING(3s) → RELOADING(5s) → 반복

- 조준: 플레이어 위치 + `±ENEMY_AIM_SPREAD * 2` 랜덤 오차
- 이동: 현재 위치에서 ±4 셀 범위의 랜덤 목표로 이동
- AIMING 시 TriangulationUI에 방향 화살표 요청

**중요 구현 주의:**
- Phaser.GameObjects.GameObject의 `state` 프로퍼티 충돌 → `enemyState`로 내부 사용
- `scene.add.existing(this as unknown as Phaser.GameObjects.GameObject)` 캐스팅 필요

### Projectile (`src/entities/Projectile.ts`)

- World 셀 좌표로 시작/목표 저장
- 비행: `t = elapsed/flightMs`, world 선형 보간 → 스크린 변환 → Y 오프셋으로 포물선
- 호 높이: `arcHeight = min(dist * 8, 120)` 픽셀
- 잔상: 시작-목표 방향의 2% 뒤에 반투명 원
- 착탄 이펙트: 400ms 스플래시 링 (SPLASH_RADIUS * 32 픽셀)

### Infantry (`src/entities/Infantry.ts`)

- wy = ZONE_ENEMY_BOTTOM 에서 스폰, wy = BASE_Y 도달 시 기지 데미지
- `isoDepth(wx, wy)` 기반 depth 매 프레임 갱신 (painter's algorithm)
- 0.5×0.5 셀 아이소메트릭 박스, HP에 따라 파랑→빨강 보간

---

## 9. 시스템 상세

### EchoSystem (`src/systems/EchoSystem.ts`)

```
잔향 생성: createEcho(wx, wy, distCells, isEnemy)
  - distCells ≤ 7: 잔향 없음
  - 7~15: 기본 크기 (반지름: 32→24→16px 3단계)
  - >15: 큰 크기 (반지름: 56→40→24px)

각 단계: 5000ms (ECHO_DURATION_MS)
총 3단계 후 소멸
depth: 55 (안개 50 위에서 렌더, 적 구역에서도 보임)
```

### FogSystem (`src/systems/FogSystem.ts`)

안개를 아이소메트릭 평행사변형 폴리곤으로 그림:
- 적 구역 (wy 0~7): `COLOR.FOG` alpha 0.96
- NML (wy 7~12): `COLOR.FOG` alpha 0.52
- depth: 50

### TerrainSystem (`src/systems/TerrainSystem.ts`)

랜덤 생성 후 **단 한 번만 그림** (정적).
- 플레이어 구역: 엄폐물(cover) 8~12개 (1~3셀 크기)
- NML: 바위(rock)/폐허(ruin) 6~9개 (0.6~3셀 크기)
- back-to-front 정렬 후 drawIsoBox 호출
- depth: 5 (배경 0 위, 엔티티 20 아래)

### WaveManager (`src/systems/WaveManager.ts`)

- 첫 웨이브: 4초 후
- 이후: WAVE_INTERVAL_MS(10초) 간격
- 웨이브당 1~3개 그룹, 그룹당 min(2+wave/2, 5)명
- 스폰: wx 랜덤(0.5~29.5), wy = ZONE_ENEMY_BOTTOM + 0.2

### TriangulationUI (`src/systems/TriangulationUI.ts`)

**기록 시점:** 적이 발사할 때 `recordShot(eWX, eWY, pWX, pWY)` 호출
- world → screen 변환 후 screen 공간 방향벡터로 저장
- 방향선: player screen pos 에서 enemy 방향으로 화면 끝까지
- 교차점: 최근 2개 방향선 교차 → 원형 추정 마커
- 20초 후 방향선 소멸 (LINE_FADE_MS)
- depth: 56 (방향선), 65 (화살표)

### PhaseManager (`src/systems/PhaseManager.ts`)

```
SCOUT → DUEL: 웨이브 3회 완료 또는 60초 경과
```
(현재 페이즈 전환 시 게임플레이 변화 없음 — 추후 구현 예정)

---

## 10. 렌더링 Depth 레이어 순서

| Depth | 내용 |
|-------|------|
| 0 | 배경 (GameScene.bgGfx, 아이소 타일 그리드) |
| 5 | 지형 (TerrainSystem) |
| 20 + isoDepth | 엔티티 (Infantry, PlayerSPG, EnemySPG) — depth 정렬 |
| 44 | 스플래시 이펙트 (Projectile.splashGfx) |
| 45 | 포탄 비행체 (Projectile.gfx) |
| 50 | 안개 (FogSystem) |
| 55 | 잔향 (EchoSystem) — 안개 위에 보임 |
| 56 | 삼각측량 방향선 (TriangulationUI.linesGfx) |
| 65 | 방향 화살표 (TriangulationUI.arrowGfx) |
| 100 | 게임오버 텍스트 (GameScene) |

---

## 11. HUD 구성 (`src/scenes/HUDScene.ts`)

병렬 씬 (`scene.launch('HUDScene')`), GameScene 이벤트로 통신:
```ts
// GameScene → HUDScene
this.events.emit('updateHUD', data: HUDData)

// HUDData 구조
{
  playerHp, baseHp, ammo,
  playerState,    // PlayerState enum
  phase,          // GamePhase enum
  waveNumber,
  enemyHp,
}
```

표시 요소: 플레이어HP바(좌상단), 기지HP바, 적HP바(우상단), 상태/탄약/페이즈/웨이브 텍스트

---

## 12. 충돌/피격 처리 (`GameScene.applyHit`)

Projectile.onHit 콜백 → GameScene.applyHit(hitWX, hitWY, owner):
- `owner === 'player'`: WaveManager 스플래시 데미지 + 적 SPG 근접 판정
- `owner === 'enemy'`: 플레이어 SPG 근접 판정
- 스플래시 판정: `worldDist(entity, hit) < SPLASH_RADIUS + 0.8`

---

## 13. 구현 완료 현황

### ✅ 완료

- [x] 아이소메트릭 2.5D 렌더링 (IsoUtils.ts 좌표 시스템)
- [x] 3구역 맵 (30×20 셀 다이아몬드 그리드, 구역별 타일 색상)
- [x] 안개 전쟁 (아이소메트릭 폴리곤 레이어)
- [x] PlayerSPG: 아이소 이동 + DEPLOYING/SIEGE/RELOADING 상태 머신
- [x] EnemySPG: 아이소 AI + 3D 박스 렌더링
- [x] Projectile: 아이소 포물선 비행 + 착탄 이펙트
- [x] Infantry: 아이소 이동 + depth 정렬
- [x] EchoSystem: 잔향 3단계 페이드
- [x] TriangulationUI: 방향 화살표 + 방향선 + 교차점 추정
- [x] TerrainSystem: 랜덤 지형 (아이소 3D 박스)
- [x] WaveManager: 랜덤 X 스폰 웨이브
- [x] PhaseManager: Scout/Duel 페이즈 전환
- [x] HUDScene: HP바 + 상태 텍스트 (병렬 씬)
- [x] 게임오버: 적 격파/플레이어 격파/기지 붕괴 + R키 재시작

### ❌ 미구현 (다음 단계)

- [ ] **페이즈 전환 시 게임플레이 변화** (Duel 페이즈에서 적 AI 강화 등)
- [ ] **업그레이드 카드 시스템** (GDD §8, 35종 카드)
- [ ] **스크랩/영구 성장 시스템** (런 간 보존 메타 성장)
- [ ] **보스전** (5웨이브마다 보스 등장)
- [ ] **적 포탄 시각화 개선** (적 구역에서 날아오는 포탄 눈에 띄게)
- [ ] **다중 적 SPG** (현재는 1마리 고정)
- [ ] **지형 차폐 판정** (엄폐물 뒤에 있을 때 피격 감소)
- [ ] **사운드 시스템**
- [ ] **파티클 이펙트** (폭발, 흙먼지)
- [ ] **모바일/터치 지원**

---

## 14. 알려진 이슈 / 주의사항

1. **Phaser.GameObjects.GameObject `state` 충돌**
   → EnemySPG에서 내부 상태를 `enemyState`로 명명 (Phaser base에 `state: number|string` 존재)

2. **`scene.add.existing()` 타입 캐스팅**
   → EnemySPG: `scene.add.existing(this as unknown as Phaser.GameObjects.GameObject)` 필요

3. **아이소메트릭 Depth 정렬**
   → 매 프레임 `gfx.setDepth(20 + isoDepth(wx, wy))` 업데이트 필요 (Infantry, SPGs)

4. **FogSystem은 정적 (1회 그리기)**
   → 안개가 동적으로 변할 필요 있으면 update()에서 draw() 재호출 필요

5. **TerrainSystem 충돌 판정 없음**
   → `readonly obstacles: TerrainRect[]` 공개되어 있으나, 엔티티/포탄 충돌 판정 미구현

6. **포탄 arc 스크린 Y 오프셋만 사용**
   → 아이소 공간에서 진정한 3D 호가 아님 (screen Y만 올림). 시각적으로는 자연스러움

---

## 15. GDD 참조 (Siege Ready v0.1 핵심 기획)

- **게임 루프**: 적 SPG의 잔향 → 삼각측량 → 적 위치 추정 → 포격 → 반격 방어
- **SPG 이동 제약**: 방열 중(SIEGE) 이동 불가, 방열 해제 후 이동
- **잔향 의미**: 발사 거리에 비례한 원형 표시 → 적까지 거리 추정 가능
- **삼각측량**: 방향선 2개 교차 = 적 추정 위치 (안개 속 간접 정보)
- **Scout → Duel**: 정찰 페이즈에서 정보 수집, Duel에서 결정적 포격

---

*이 파일은 다른 컴퓨터에서 작업 재개 시 컨텍스트 복원용으로 작성되었습니다.*
