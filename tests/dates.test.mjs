import test from 'node:test';
import assert from 'node:assert/strict';
import { dateValue, compareDates } from '../public/lib/dates.js';

const titles = (list) => list.map((r) => r.title);

test('날짜 없음·형식 오류는 null', () => {
  assert.equal(dateValue(''), null);
  assert.equal(dateValue(undefined), null);
  assert.equal(dateValue('미입력'), null);
  assert.equal(typeof dateValue('2026-11-24'), 'number');
});

test('공고일 최신 순에서 날짜 없는 공고는 맨 뒤 (PR #1 P2 회귀)', () => {
  const list = [
    { title: '없음1', postedAt: '' },
    { title: '11-20', postedAt: '2026-11-20' },
    { title: '없음2', postedAt: '미입력' },
    { title: '11-24', postedAt: '2026-11-24' },
  ];
  list.sort((a, b) => compareDates(a.postedAt, b.postedAt, 'desc'));
  assert.deepEqual(titles(list), ['11-24', '11-20', '없음1', '없음2']);
});

test('마감일 빠른 순에서 날짜 없는 공고는 맨 뒤', () => {
  const list = [
    { title: '없음', deadline: '' },
    { title: '12-01', deadline: '2026-12-01' },
    { title: '11-25', deadline: '2026-11-25' },
  ];
  list.sort((a, b) => compareDates(a.deadline, b.deadline, 'asc'));
  assert.deepEqual(titles(list), ['11-25', '12-01', '없음']);
});

test('둘 다 날짜 없으면 순서 유지', () => {
  assert.equal(compareDates('', '', 'desc'), 0);
  assert.equal(compareDates('2026-11-24', '2026-11-24', 'asc'), 0);
});
