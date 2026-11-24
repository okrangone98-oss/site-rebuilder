# site-rebuilder · 입찰 레이더

나라장터(조달청) 입찰 공고를 빠르게 찾고 정리하는 개인용 웹앱.

**앱 주소: https://site-rebuilder-g2b.okrangone98.workers.dev/**

- 업무 구분(용역·물품·공사·외자), 기간(오늘·3일·7일), 공고명 키워드로 실제 공고 조회
- CSV/JSON 가져오기, 검색·정렬, 관심 공고 보관, 마감 D-day, 공고 원문 링크
- 인증키는 Cloudflare Worker Secret(`G2B_API_KEY`)에만 저장되며 브라우저·저장소에 남지 않음

## 구성

| 경로 | 설명 |
| --- | --- |
| `public/` | 프론트엔드 (정적 자산으로 같은 Worker에서 서빙) |
| `worker/index.js` | `/api/bids`, `/health` — 공식 API 프록시, CORS·입력 검증 |
| `api/g2b.js` | 나라장터 입찰공고정보서비스 요청 구성·응답 정규화 |
| `tests/` | 날짜 정렬 회귀 테스트 |

## 개발

```bash
npm test     # 단위 테스트
npm run dev  # http://localhost:8000 (public/)
```

`main`에 push하면 Cloudflare Workers Builds가 자동 배포합니다.
자세한 내용은 [README-MVP.md](README-MVP.md), [docs/DEPLOY.md](docs/DEPLOY.md), [docs/API-INTEGRATION.md](docs/API-INTEGRATION.md)를 참고하세요.
