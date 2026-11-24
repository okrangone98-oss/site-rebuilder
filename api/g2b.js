/** 나라장터 공식 입찰공고정보서비스 API 응답 정규화. 인증키/네트워크 호출은 서버(Worker)에서만 수행한다. */
export const BASE_URL = 'https://apis.data.go.kr/1230000/ad/BidPublicInfoService02';

/** 공고게시일시 기준 업무별 입찰공고목록 조회 */
export const OPERATIONS = Object.freeze({
  용역: 'getBidPblancListInfoServc02',
  물품: 'getBidPblancListInfoThng02',
  공사: 'getBidPblancListInfoCnstwk02',
  외자: 'getBidPblancListInfoFrgcpt02',
});

/** 검색조건(공고명·기관명 등) 기준 업무별 조회. 공고명 키워드는 이 오퍼레이션에서만 지원된다. */
export const SEARCH_OPERATIONS = Object.freeze({
  용역: 'getBidPblancListInfoServcPPSSrch02',
  물품: 'getBidPblancListInfoThngPPSSrch02',
  공사: 'getBidPblancListInfoCnstwkPPSSrch02',
  외자: 'getBidPblancListInfoFrgcptPPSSrch02',
});

export const KINDS = Object.freeze(Object.keys(OPERATIONS));

const pad = (n) => String(n).padStart(2, '0');

export function validateWindow(from, to) {
  if (!/^\d{8}$/.test(from) || !/^\d{8}$/.test(to)) throw Error('날짜는 YYYYMMDD 형식이어야 합니다.');
  const start = Date.UTC(+from.slice(0, 4), +from.slice(4, 6) - 1, +from.slice(6, 8));
  const end = Date.UTC(+to.slice(0, 4), +to.slice(4, 6) - 1, +to.slice(6, 8));
  const roundTrip = (ms) => {
    const d = new Date(ms);
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
  };
  if (!Number.isFinite(start) || !Number.isFinite(end) || roundTrip(start) !== from || roundTrip(end) !== to) {
    throw Error('유효한 날짜를 지정하세요.');
  }
  if (end < start) throw Error('조회 종료일이 시작일보다 빠릅니다.');
  if (end - start > 6 * 86400000) throw Error('유효한 7일 이내 조회기간을 지정하세요.');
  return true;
}

export function buildRequest({ category, from, to, serviceKey, page = 1, pageSize = 100, keyword = '' }) {
  validateWindow(from, to);
  const search = String(keyword || '').trim().slice(0, 100);
  const operations = search ? SEARCH_OPERATIONS : OPERATIONS;
  if (!operations[category]) throw Error('지원하지 않는 업무 구분입니다.');
  if (!serviceKey) throw Error('서버에 공공데이터 API 인증키가 필요합니다.');
  const url = new URL(`${BASE_URL}/${operations[category]}`);
  url.searchParams.set('serviceKey', serviceKey);
  url.searchParams.set('pageNo', String(Math.max(1, Math.min(Number(page) || 1, 100))));
  url.searchParams.set('numOfRows', String(Math.max(1, Math.min(Number(pageSize) || 100, 100))));
  url.searchParams.set('type', 'json');
  url.searchParams.set('inqryDiv', '1');
  url.searchParams.set('inqryBgnDt', `${from}0000`);
  url.searchParams.set('inqryEndDt', `${to}2359`);
  if (search) url.searchParams.set('bidNtceNm', search);
  return url;
}

function date(value) {
  const v = String(value || '');
  const m = v.match(/^(\d{4})-?(\d{2})-?(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

export function normalizeBid(v, category = '기타') {
  return {
    title: String(v.bidNtceNm || '').trim(),
    agency: String(v.dminsttNm || v.ntceInsttNm || ''),
    number: String(v.bidNtceNo || '') + (v.bidNtceOrd ? `-${v.bidNtceOrd}` : ''),
    category,
    postedAt: date(v.bidNtceDt),
    deadline: date(v.bidClseDt),
    url: /^https:\/\//.test(String(v.bidNtceDtlUrl || '')) ? String(v.bidNtceDtlUrl) : '',
    amount: String(v.asignBdgtAmt || v.presmptPrce || ''),
  };
}

export function parseResponse(payload, category) {
  const body = payload?.response?.body;
  if (!body) throw Error('API 응답 형식이 올바르지 않습니다.');
  const result = payload?.response?.header?.resultCode;
  if (result !== undefined && String(result) !== '00') {
    throw Error(`API 오류: ${String(payload.response.header.resultMsg || result)}`);
  }
  const raw = body.items?.item ?? body.items ?? [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list
    .filter((v) => v && typeof v === 'object')
    .map((v) => normalizeBid(v, category))
    .filter((v) => v.title);
}

export function dedupe(records) {
  const seen = new Set();
  return records.filter((r) => {
    const k = r.number || [r.title, r.agency, r.deadline].join('|');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function deadlineDays(deadline, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return null;
  const t = Date.parse(`${deadline}T00:00:00+09:00`);
  if (!Number.isFinite(t)) return null;
  const today = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const target = Date.UTC(+deadline.slice(0, 4), +deadline.slice(5, 7) - 1, +deadline.slice(8, 10));
  return Math.round((target - start) / 86400000);
}
