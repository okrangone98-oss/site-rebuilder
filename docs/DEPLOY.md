# API 연동 및 배포

## 1. 로컬 테스트

```bash
npm test
npx wrangler dev
```

로컬 전용 `.dev.vars`에 `G2B_API_KEY=발급받은키`를 넣습니다. 이 파일은 Git에서 제외됩니다. 키를 채팅이나 GitHub에 붙여넣지 마세요.

## 2. Cloudflare Worker 배포

실제 배포는 별도 승인 후 진행합니다. Cloudflare 계정에서 Worker 생성/배포 권한이 필요합니다.

```bash
npx wrangler deploy
npx wrangler secret put G2B_API_KEY
```

주의: `wrangler secret put` 명령은 Worker 버전을 생성해 즉시 배포할 수 있습니다. 운영 승인 전에 실행하지 마세요.

Cloudflare 대시보드 → Workers & Pages → Worker → Settings → Variables and Secrets에서 `G2B_API_KEY`를 **Secret**으로 등록할 수도 있습니다.

## 3. CORS 제한

`wrangler.jsonc`의 `ALLOWED_ORIGIN`은 기본적으로 `http://localhost:8000`입니다. 운영 사이트를 공개할 때에는 실제 사이트 origin으로 교체해야 합니다. 쉼표로 여러 origin을 지정할 수 있습니다. 와일드카드는 사용하지 않습니다.

## 4. 실제 조회

`GET /api/bids?category=용역&from=20261117&to=20261123`

응답: `{bids: [...], count, queriedAt, hasMore}`. 현재 첫 100건만 조회하며 `hasMore`가 참이면 일부 결과가 누락됩니다. 공식 API의 응답 필드와 인증키 형식은 실데이터로 검증해야 합니다.

## 5. 주의

- 공공데이터포털 **일반 인증키(Decoding)** 사용 권장. 인코딩된 키를 다시 URLSearchParams에 넣으면 이중 인코딩 문제가 생길 수 있습니다.
- 공식 API의 정확한 엔드포인트/파라미터는 승인된 서비스 명세에서 최종 확인해야 합니다.
- Worker는 현재 인증 없는 공개 조회 엔드포인트이므로, 운영 전 호출량 제한과 캐시를 추가해야 합니다.
