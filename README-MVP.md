# 입찰 레이더 MVP

독립적인 나라장터 입찰 공고 탐색 웹앱. 원본 참고 사이트: https://radar.rimikimi.com/

## 접속 주소

- 앱(프론트엔드): https://site-rebuilder-g2b.okrangone98.workers.dev/
- API(Worker): `https://site-rebuilder-g2b.okrangone98.workers.dev/api/bids?category=용역&from=20261117&to=20261123`
- 상태 확인: `/health` → `{ok, configured, version}`

프론트엔드와 Worker API는 같은 Cloudflare Worker(`site-rebuilder-g2b`)에서 함께 배포된다.
`public/` 폴더가 정적 자산으로, `worker/index.js`가 `/api/bids`·`/health`를 처리한다.

## 구현 범위

- **실시간 공고 조회**: 업무 구분(용역·물품·공사·외자), 조회 기간(오늘·최근 3일·최근 7일), 공고명 키워드
- **CSV/JSON 가져오기**: `title,agency,number,category,postedAt,deadline,url,amount`
- 검색(사업명·기관명·공고번호), 업무 필터, 정렬(마감일 빠른 순 / 공고일 최신 순), 관심 공고(localStorage)
- 공고 원문 링크, 마감 D-day 표시, 100건 단위 다음 페이지 불러오기
- 인증키는 Cloudflare Worker Secret(`G2B_API_KEY`)에만 존재하며 브라우저로 전달되지 않는다.

## 로컬 실행

```bash
npm run dev      # http://localhost:8000 (public/ 폴더)
npm test         # 단위 테스트
```

Worker까지 로컬에서 붙일 때는 `.dev.vars`에 `G2B_API_KEY=Decoding키`를 넣고 `npx wrangler dev`를 실행한다. `.dev.vars`는 Git에서 제외된다.

## 구조

```
public/            프론트엔드 정적 자산 (index.html, src.js, style.css, lib/dates.js)
worker/index.js    Cloudflare Worker: /api/bids, /health, CORS, 입력 검증
api/g2b.js         나라장터 공식 API 요청 구성·응답 정규화 (Worker에서만 import)
api/g2b.test.mjs   API 어댑터 테스트
tests/dates.test.mjs  날짜 정렬 테스트
```

## API 제약

- 조회 기간은 최대 7일(2026-11-10 변경), 초과 시 400.
- 공고명 키워드 검색은 검색조건 오퍼레이션(`*PPSSrch02`)을 사용하며, 키워드가 없으면 목록 오퍼레이션(`*02`)을 쓴다.
- 응답은 100건 단위이며 `hasMore`가 true면 `page`를 올려 이어서 받는다.
- 공공데이터포털 개발계정 호출 한도는 하루 1,000건이다.
