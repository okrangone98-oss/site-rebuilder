# API 연동 및 배포

## 1. 구조

하나의 Cloudflare Worker(`site-rebuilder-g2b`)가 프론트엔드와 API를 함께 제공한다.

| 경로 | 처리 |
| --- | --- |
| `/` 및 `public/` 정적 파일 | Workers 정적 자산(`assets.directory = ./public`) |
| `/api/bids` | `worker/index.js` → 나라장터 공식 API 프록시 |
| `/health` | `{ok, configured, version}` |

배포 주소: https://site-rebuilder-g2b.okrangone98.workers.dev/

## 2. 로컬 테스트

```bash
npm test
npm run dev                 # http://localhost:8000
npx wrangler dev            # Worker까지 로컬 실행 (.dev.vars에 G2B_API_KEY)
```

`.dev.vars`는 Git에서 제외된다. 키를 채팅이나 GitHub에 붙여넣지 않는다.

## 3. 배포

Cloudflare Workers Builds가 `main` 브랜치에 연결되어 있어 **main에 push하면 자동 배포**된다.

- Worker 코드·정적 자산·`wrangler.jsonc`(vars 포함)은 push된 커밋 기준으로 배포된다.
- 배포 확인: `GET /health`의 `version` 값이 커밋의 `VERSION`과 같은지 확인한다.
- Secret(`G2B_API_KEY`)은 빌드마다 유지되며 `wrangler.jsonc`에 넣지 않는다.

수동 배포가 필요할 때(대시보드에서):

```bash
npx wrangler deploy
npx wrangler secret put G2B_API_KEY   # Secret은 최초 1회, 이미 등록되어 있음
```

Cloudflare 대시보드 → Workers & Pages → `site-rebuilder-g2b` → Deployments 에서 빌드 로그를 볼 수 있다.

## 4. CORS 제한

`wrangler.jsonc`의 `ALLOWED_ORIGIN`(쉼표 구분, 와일드카드 없음):

```
http://localhost:8000,
http://127.0.0.1:8000,
https://site-rebuilder-g2b.okrangone98.workers.dev,
https://okrangone98-oss.github.io
```

- 같은 주소(workers.dev)에서 앱을 열면 Origin 이슈가 없다.
- 커스텀 도메인을 붙이면 그 origin을 추가해야 한다.
- GitHub Pages는 워크플로 파일을 추가해야 하는데 현재 GitHub 연결 앱에 `workflows` 권한이 없어 쓰지 않는다. 프론트엔드는 Worker 정적 자산으로만 배포한다.

## 5. 실제 조회

```
GET /api/bids?category=용역&from=20261117&to=20261123&q=양양&page=1
```

응답: `{bids: [...], count, category, from, to, keyword, page, totalCount, hasMore, queriedAt, version}`

- 기간은 `from`·`to` 모두 `YYYYMMDD`, 최대 7일.
- `q`가 있으면 공고명 검색 오퍼레이션(`*PPSSrch02`), 없으면 목록 오퍼레이션(`*02`)을 사용한다.
- `numOfRows`는 100 고정, `hasMore`가 true면 `page`를 올려 이어 받는다.

## 6. 주의

- 공공데이터포털 **일반 인증키(Decoding)** 사용. Worker가 URLSearchParams로 인코딩한다.
- Worker는 인증 없는 공개 조회 엔드포인트다. 공개 홍보 전 호출량 제한·캐시 추가를 검토한다.
- 공식 API 응답 필드가 바뀌면 `api/g2b.js`의 `normalizeBid`만 손보면 된다.
