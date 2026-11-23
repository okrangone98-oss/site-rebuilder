# 입찰 레이더 MVP

독립적인 나라장터 입찰 공고 탐색 프런트엔드. 원본 참고 사이트: https://radar.rimikimi.com/ (접속 및 REA 런타임 분석 미완료).

## 실행

정적 파일이므로 로컬 HTTP 서버에서 index.html을 엽니다.

```bash
python -m http.server 8000
```

http://localhost:8000 접속. 별도 패키지·DB·API 키가 필요 없습니다.

## 구현 범위

- CSV/JSON 가져오기, 검색, 업무 유형 필터, 정렬, 관심 공고(브라우저 localStorage)
- 데이터 파일은 서버로 전송하지 않음. 새로고침 시 불러온 자료는 사라지며 관심 공고 키만 저장됨.
- 공식 나라장터 링크는 사용자가 불러온 HTTPS URL에만 표시
- 실제 입찰 공고 수집, API 연동, 알림, 원본 사이트의 화면/동작 복원은 **미구현**

## REA 후속 분석

REA 공식 프로젝트: https://github.com/morluto/rea

1. Node 및 Chrome 준비 후 공식 문서의 `npx rea-agents@latest setup` 실행.
2. 접근 권한이 있는 공개 화면에 한해 대상 사이트의 레이아웃·사용자 흐름·네트워크 동작을 분석.
3. 관찰 근거와 추정 사항을 구분하고, 고유 자산/비공개 API/인증 우회는 복제하지 않음.
4. 나라장터 공식 데이터 API 이용 가능 여부와 호출 한도 확인 후 백엔드 연동.

## CSV 열

`title,agency,number,category,postedAt,deadline,url,amount`

필수 열은 title. 날짜 YYYY-MM-DD, category는 용역/물품/공사/기타 권장.
