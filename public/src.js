import { compareDates } from './lib/dates.js';

const $ = (id) => document.getElementById(id);
const DEFAULT_WORKER = 'https://site-rebuilder-g2b.okrangone98.workers.dev';
const FAVORITES_KEY = 'bid-radar-favorites';
const WORKER_KEY = 'bid-radar-worker';
const pad = (n) => String(n).padStart(2, '0');

let records = [];
let favorites = new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'));
let workerBase = localStorage.getItem(WORKER_KEY) || DEFAULT_WORKER;
let liveQuery = null;

/* ---------- 데이터 정리 ---------- */

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);

  const headers = (rows.shift() || []).map((x) => x.trim().replace(/^\uFEFF/, ''));
  if (!headers.includes('title')) throw Error('title 열이 필요합니다.');
  return rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] || ''])));
}

function normalize(v) {
  return {
    title: String(v.title || '').trim(),
    agency: String(v.agency || ''),
    number: String(v.number || ''),
    category: String(v.category || '기타'),
    postedAt: String(v.postedAt || ''),
    deadline: String(v.deadline || ''),
    url: String(v.url || ''),
    amount: String(v.amount || ''),
  };
}

const key = (v) => v.number || [v.title, v.agency, v.deadline].join('|');

function mergeRecords(base, incoming) {
  const map = new Map(base.map((r) => [key(r), r]));
  for (const r of incoming) map.set(key(r), r);
  return [...map.values()];
}

/* ---------- 표시 도우미 ---------- */

function money(value) {
  const s = String(value || '').replace(/[^\d]/g, '');
  if (!s) return '';
  return `${Number(s).toLocaleString('ko-KR')}원`;
}

/** 기기 시간대와 무관하게 한국 시간 기준 YYYY-MM-DD */
function kstDate(offsetDays = 0) {
  const d = new Date(Date.now() + 9 * 3600 * 1000 - offsetDays * 86400000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function dday(deadline) {
  const m = String(deadline || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  const today = kstDate(0).split('-');
  const days = Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(+today[0], +today[1] - 1, +today[2])) / 86400000);
  if (days === 0) return ' · D-day';
  if (days < 0) return ' · 마감됨';
  return ` · D-${days}`;
}

function setStatus(text, { busy = false, error = false } = {}) {
  const el = $('status');
  el.textContent = text;
  el.classList.toggle('busy', busy);
  el.classList.toggle('error', error);
}

/* ---------- 목록 그리기 ---------- */

function render() {
  const q = $('query').value.toLocaleLowerCase().trim();
  const kind = $('kind').value;
  const direction = $('sort').value === 'recent' ? 'desc' : 'asc';
  const sortKey = direction === 'desc' ? 'postedAt' : 'deadline';

  const list = records.filter(
    (r) =>
      (!kind || r.category === kind) &&
      (!q || [r.title, r.agency, r.number].join(' ').toLocaleLowerCase().includes(q)) &&
      (!$('onlySaved').checked || favorites.has(key(r))),
  );
  list.sort((a, b) => compareDates(a[sortKey], b[sortKey], direction));

  $('total').textContent = records.length;
  $('matched').textContent = list.length;
  $('savedCount').textContent = records.filter((r) => favorites.has(key(r))).length;

  const root = $('results');
  root.replaceChildren();
  if (!list.length) {
    const el = document.createElement('div');
    el.className = 'empty';
    el.textContent = records.length
      ? '검색 조건에 맞는 공고가 없습니다.'
      : '공고 데이터가 없습니다. 위에서 실시간 공고를 불러오거나 CSV·JSON을 올려 주세요.';
    root.append(el);
    return;
  }

  for (const r of list) {
    const article = document.createElement('article');
    article.className = 'item';
    const content = document.createElement('div');
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = r.category;
    const h = document.createElement('h3');
    h.textContent = r.title;
    const agency = document.createElement('p');
    agency.textContent = [r.agency, r.number].filter(Boolean).join(' · ');
    const meta = document.createElement('p');
    meta.className = 'meta';
    meta.textContent =
      `공고일 ${r.postedAt || '미입력'} · 마감일 ${r.deadline || '미입력'}${dday(r.deadline)}` +
      (money(r.amount) ? ` · 금액 ${money(r.amount)}` : '');
    content.append(tag, h, agency, meta);

    if (/^https:\/\//i.test(r.url)) {
      const a = document.createElement('a');
      a.href = r.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = '공고 원문 보기 ↗';
      content.append(a);
    }

    const star = document.createElement('button');
    const saved = favorites.has(key(r));
    star.className = 'star';
    star.textContent = saved ? '★ 관심' : '☆ 관심';
    star.setAttribute('aria-pressed', String(saved));
    star.addEventListener('click', () => {
      const k = key(r);
      favorites.has(k) ? favorites.delete(k) : favorites.add(k);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
      render();
    });

    article.append(content, star);
    root.append(article);
  }
}

/* ---------- 나라장터 실시간 조회 ---------- */

const workerUrl = () => workerBase.trim().replace(/\/+$/, '');

async function callJson(path) {
  const res = await fetch(`${workerUrl()}${path}`, { headers: { accept: 'application/json' }, cache: 'no-store' });
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  return { ok: res.ok, status: res.status, data };
}

async function loadLive(page = 1, { append = false } = {}) {
  const category = $('apiKind').value;
  const term = Math.min(Math.max(Number($('apiTerm').value) || 7, 1), 7);
  const keyword = $('apiQuery').value.trim();
  const from = kstDate(term - 1).replaceAll('-', '');
  const to = kstDate(0).replaceAll('-', '');
  const params = new URLSearchParams({ category, from, to, page: String(page) });
  if (keyword) params.set('q', keyword);

  $('fetch').disabled = true;
  $('more').disabled = true;
  setStatus(`${category} 공고를 불러오는 중…`, { busy: true });
  try {
    const { ok, status, data } = await callJson(`/api/bids?${params}`);
    if (!ok) {
      const tail =
        status === 403
          ? ' 이 사이트 주소가 Worker의 ALLOWED_ORIGIN에 없습니다.'
          : status === 503
            ? ' Worker에 G2B_API_KEY(Decoding 키)를 Secret으로 등록해야 합니다.'
            : '';
      throw Error(`${data.error || `요청 실패 (${status})`}${tail}`);
    }
    const bids = (data.bids || []).map(normalize).filter((r) => r.title);
    records = append ? mergeRecords(records, bids) : bids;
    liveQuery = { category, from, to, keyword, page, hasMore: Boolean(data.hasMore) };
    $('more').hidden = !data.hasMore;

    const total = Number(data.totalCount);
    const totalText = total ? ` · 전체 ${total.toLocaleString('ko-KR')}건 중 ${records.length}건 표시` : '';
    const moreText = data.hasMore ? ' · 다음 100건도 불러올 수 있습니다.' : '';
    setStatus(
      `${category} · ${from}~${to}${keyword ? ` · '${keyword}'` : ''} · ${new Date().toLocaleTimeString('ko-KR')} 조회${totalText}${moreText}`,
    );
    render();
    return true;
  } catch (err) {
    const message = err instanceof TypeError ? 'Worker에 연결할 수 없습니다. 연결 설정에서 주소를 확인하세요.' : err.message;
    setStatus(`불러오기 실패: ${message}`, { error: true });
    return false;
  } finally {
    $('fetch').disabled = false;
    $('more').disabled = false;
  }
}

async function checkHealth() {
  const el = $('health');
  if (!el) return;
  el.textContent = '연결 확인 중…';
  try {
    const { ok, data } = await callJson('/health');
    if (!ok) throw Error('no');
    el.textContent = data.configured
      ? `연결됨 · v${data.version || '?'} · 인증키 등록됨`
      : '연결됨 · 인증키가 아직 없습니다.';
    el.classList.toggle('ok', Boolean(data.configured));
  } catch {
    el.textContent = '연결 실패 · 주소를 확인하세요.';
    el.classList.remove('ok');
  }
}

/* ---------- 설정 ---------- */

function syncSettings() {
  $('workerUrl').value = workerBase;
}

/* ---------- 이벤트 ---------- */

$('file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 10 * 1024 * 1024) throw Error('파일은 10MB 이하만 지원합니다.');
    const text = await file.text();
    const data = file.name.toLowerCase().endsWith('.json') ? JSON.parse(text) : parseCSV(text);
    if (!Array.isArray(data)) throw Error('JSON은 객체 배열이어야 합니다.');
    records = data.map(normalize).filter((r) => r.title).slice(0, 10000);
    liveQuery = null;
    $('more').hidden = true;
    setStatus(`${file.name} · ${records.length}건을 불러왔습니다.`);
    render();
  } catch (err) {
    setStatus(`불러오기 실패: ${err.message}`, { error: true });
  }
  e.target.value = '';
});

$('fetch').addEventListener('click', () => loadLive(1));
$('more').addEventListener('click', () => liveQuery && loadLive(liveQuery.page + 1, { append: true }));
$('apiQuery').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loadLive(1);
});
$('apiKind').addEventListener('change', () => {
  $('kind').value = $('apiKind').value;
  render();
});
['query', 'kind', 'sort', 'onlySaved'].forEach((id) =>
  $(id).addEventListener(id === 'query' ? 'input' : 'change', render),
);
$('clear').addEventListener('click', () => {
  records = [];
  liveQuery = null;
  $('more').hidden = true;
  setStatus('불러온 자료를 비웠습니다.');
  render();
});
$('sample').addEventListener('click', () => $('help').showModal());
$('closeHelp').addEventListener('click', () => $('help').close());

$('toggleSettings').addEventListener('click', () => {
  const box = $('settings');
  box.hidden = !box.hidden;
  if (!box.hidden) {
    syncSettings();
    checkHealth();
  }
});
$('saveSettings').addEventListener('click', () => {
  const value = $('workerUrl').value.trim() || DEFAULT_WORKER;
  workerBase = value;
  if (value === DEFAULT_WORKER) localStorage.removeItem(WORKER_KEY);
  else localStorage.setItem(WORKER_KEY, value);
  setStatus('Worker 주소를 저장했습니다.');
  checkHealth();
});
$('resetSettings').addEventListener('click', () => {
  workerBase = DEFAULT_WORKER;
  localStorage.removeItem(WORKER_KEY);
  syncSettings();
  setStatus('Worker 주소를 기본값으로 되돌렸습니다.');
  checkHealth();
});

syncSettings();
render();
checkHealth();
