# 달새김사주

> 오늘의 운을 읽고, 나의 시간을 새기다. — 운(運)새김

사주를 중심으로 고민을 찾아주고(내 고민의 길), AI 친구가 설명하고(AI 사주친구), 실제 선택과 사건이 기록되어(달새김 기록·인생 타임라인) 시간이 지날수록 나에게 맞춰지는 재방문형 사주 서비스.

## 구성
| 폴더 | 내용 |
|---|---|
| `packages/engine` | 만세력 엔진(사주팔자·대운·절기·음력) |
| `packages/content` | 오늘의 운세 · 돈의 흐름(재물·사업·투자·부동산) · 행운번호 · 사주지도 · 사주×MBTI · 고민의 길 · 신년 미리보기 계산과 문구 DB(AI 없음) |
| `server` | Fastify + PostgreSQL(drizzle). 결제(PayApp) · 간편 로그인 · 유료 풀이 생성 · AI 사주친구 · 기록·타임라인 · 시장 노트 · 관리자 API |
| `web` | React + Vite 모바일 웹, 관리자 화면 `/admin` |

## 로컬 실행
```bash
npm ci
cp .env.example .env          # 필요한 값만 채우기(비워도 MOCK 으로 동작)
npm run dev                   # 서버 8791 + 웹 5391
npm test                      # 단위·통합 테스트
npm run check:independence    # 다른 서비스 흔적 검사
```

## 배포 (Railway)
- 서비스 2개: `api`(Dockerfile 경로 `server/Dockerfile`, 헬스체크 `/health`, 포트 8791) · `web`(`web/Dockerfile`, 헬스체크 `/`, 포트 8080) + PostgreSQL(같은 지역)
- 필요한 변수는 `.env.example` 참고. 웹은 `API_ORIGIN`·`PUBLIC_WEB_ORIGIN` 이 빌드 때 들어간다.
- 오픈 순서: 도메인 연결 → PayApp 연동값 → `MOCK_MODE=false` → AI 키 + `READING_AI=live` → 실결제·환불 1건 확인

## 문서
- `docs/설계.md` — 화면 구조·돈의 흐름·기록 순환·데이터 구조·지표
- `docs/결정기록.md` — 정한 것과 이유
- `내할일.md` — 사람이 해야 하는 일(링크 포함)
