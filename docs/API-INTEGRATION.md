# 나라장터 공식 API 연동

공식 출처: https://www.data.go.kr/data/15129394/openapi.do
서비스: `BidPublicInfoService02` (2026-11-10 이후 조회기간 최대 7일)

## 현 단계 (연결 완료)

- `api/g2b.js`: 기간(7일) 검증, 오퍼레이션 선택, 요청 URL 구성, 응답 정규화, 중복 제거, 마감일 계산
- `worker/index.js`: `GET /api/bids` — CORS 검사, 입력 검증, 12초 타임아웃, 오류 코드 구분(400/403/502/503)
- `public/`: 업무 구분·기간·키워드 입력, 100건 페이지 이어 받기, 결과 표시
- 인증키는 Worker Secret `G2B_API_KEY`(Decoding 키)에만 있고 브라우저·Git 저장소에 없다

## 오퍼레이션 구분

| 조건 | 오퍼레이션 | 설명 |
| --- | --- | --- |
| 키워드 없음 | `getBidPblancListInfo{Servc|Thng|Cnstwk|Frgcpt}02` | 공고게시일시 기준 목록 |
| 키워드 있음 | `getBidPblancListInfo{Servc|Thng|Cnstwk|Frgcpt}PPSSrch02` | 검색조건 기준, `bidNtceNm` 지원 |

`*02`(목록) 오퍼레이션은 `bidNtceNm`을 받지 않으므로, 공고명 검색은 반드시 `*PPSSrch02`로 보낸다.
이름이 다른 `getBidPblancListInfoServcPPSSrch`(서비스 버전 접미사 없음)는 `BidPublicInfoService02`에 존재하지 않는다(NO_OPENAPI_SERVICE_ERROR).

## 요청 파라미터

`serviceKey`, `pageNo`, `numOfRows`(≤100), `type=json`, `inqryDiv=1`(공고게시일시), `inqryBgnDt=YYYYMMDD0000`, `inqryEndDt=YYYYMMDD2359`, (키워드 시) `bidNtceNm`

## 응답 정규화

`normalizeBid`: `bidNtceNm`→title, `dminsttNm`/`ntceInsttNm`→agency, `bidNtceNo`+`bidNtceOrd`→number, `bidNtceDt`→postedAt, `bidClseDt`→deadline, `bidNtceDtlUrl`→url(https만), `asignBdgtAmt`/`presmptPrce`→amount

## 알려진 한계

- 응답은 100건 단위, 전체 건수는 `totalCount`로만 알 수 있다(앱은 `hasMore`로 다음 페이지 제공).
- 날짜 컬럼에 2037년 같은 미래 값이 섞일 수 있어 최신성은 공고일 기준으로만 판단한다.
- 개발계정 하루 1,000회 호출 한도. 프론트는 사용자가 버튼을 누를 때만 호출한다.
