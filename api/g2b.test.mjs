import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWindow, buildRequest, parseResponse, dedupe, deadlineDays, OPERATIONS, SEARCH_OPERATIONS } from './g2b.js';

test('7일 범위 허용', () => assert.equal(validateWindow('20261117', '20261123'), true));
test('8일 범위 거부', () => assert.throws(() => validateWindow('20261116', '20261123')));
test('유효하지 않은 날짜 거부', () => assert.throws(() => validateWindow('20260230', '20260301')));
test('API 키 없으면 요청 거부', () => assert.throws(() => buildRequest({ category: '용역', from: '20261117', to: '20261123' })));

test('용역 API 요청 경로 및 기간', () => {
  const u = buildRequest({ category: '용역', from: '20261117', to: '20261123', serviceKey: 'test' });
  assert.match(u.pathname, /getBidPblancListInfoServc02$/);
  assert.equal(u.searchParams.get('inqryBgnDt'), '202611170000');
  assert.equal(u.searchParams.get('inqryEndDt'), '202611232359');
  assert.equal(u.searchParams.get('bidNtceNm'), null);
});

test('업무 구분별 오퍼레이션', () => {
  for (const [category, op] of Object.entries(OPERATIONS)) {
    const u = buildRequest({ category, from: '20261117', to: '20261123', serviceKey: 'test' });
    assert.equal(u.pathname.split('/').pop(), op);
  }
  assert.throws(() => buildRequest({ category: '기타', from: '20261117', to: '20261123', serviceKey: 'test' }));
});

test('키워드는 검색조건 오퍼레이션과 bidNtceNm으로 전달', () => {
  const u = buildRequest({ category: '용역', from: '20261117', to: '20261123', serviceKey: 'test', keyword: ' 양양 ' });
  assert.equal(u.pathname.split('/').pop(), SEARCH_OPERATIONS['용역']);
  assert.equal(u.searchParams.get('bidNtceNm'), '양양');
});

test('공백 키워드는 목록 오퍼레이션 유지', () => {
  const u = buildRequest({ category: '물품', from: '20261117', to: '20261123', serviceKey: 'test', keyword: '   ' });
  assert.equal(u.pathname.split('/').pop(), OPERATIONS['물품']);
  assert.equal(u.searchParams.get('bidNtceNm'), null);
});

test('업무 4종 모두 검색조건 오퍼레이션 존재', () => {
  for (const category of ['용역', '물품', '공사', '외자']) {
    const u = buildRequest({ category, from: '20261117', to: '20261123', serviceKey: 'test', keyword: '교육' });
    assert.equal(u.pathname.split('/').pop(), SEARCH_OPERATIONS[category]);
  }
});

test('페이지 지정', () => {
  const u = buildRequest({ category: '용역', from: '20261117', to: '20261123', serviceKey: 'test', page: 3 });
  assert.equal(u.searchParams.get('pageNo'), '3');
});

test('응답 정규화', () => {
  const x = parseResponse(
    { response: { header: { resultCode: '00' }, body: { items: { item: [{ bidNtceNm: '교육 용역', bidNtceNo: '123', bidClseDt: '2026-11-30' }] } } } },
    '용역',
  );
  assert.equal(x[0].title, '교육 용역');
  assert.equal(x[0].deadline, '2026-11-30');
});

test('빈 응답은 빈 배열', () => {
  assert.deepEqual(parseResponse({ response: { header: { resultCode: '00' }, body: { items: '', totalCount: 0 } } }, '용역'), []);
});

test('API 오류 코드는 예외', () => {
  assert.throws(() => parseResponse({ response: { header: { resultCode: '30', resultMsg: '등록되지 않은 서비스키' } } }, '용역'));
});

test('중복 제거', () => assert.equal(dedupe([{ number: '1' }, { number: '1' }, { number: '2' }]).length, 2));

test('마감일 날짜 차이', () => assert.equal(deadlineDays('2026-11-24', new Date('2026-11-23T12:00:00+09:00')), 1));
