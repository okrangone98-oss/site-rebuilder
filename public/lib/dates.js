const DATE = /^\d{4}-\d{2}-\d{2}/;

/** 날짜 문자열을 비교용 타임스탬프로 바꾼다. 비어 있거나 형식이 틀리면 null(값 없음). */
export function dateValue(value) {
  const s = String(value || '').trim();
  if (!DATE.test(s)) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

/**
 * 날짜 비교자. 값이 없는 항목은 정렬 방향과 관계없이 항상 맨 뒤로 보낸다.
 * (예전에는 공고일이 빈 공고가 '공고일 최신 순' 맨 위로 올라왔다.)
 */
export function compareDates(a, b, direction = 'asc') {
  const x = dateValue(a);
  const y = dateValue(b);
  if (x === null && y === null) return 0;
  if (x === null) return 1;
  if (y === null) return -1;
  return direction === 'desc' ? y - x : x - y;
}
