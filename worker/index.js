import { buildRequest, parseResponse, dedupe } from '../api/g2b.js';

const VERSION = '0.3.0';
const PAGE_SIZE = 100;

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });

const validDate = (v) => /^\d{8}$/.test(v);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return json({ ok: true, configured: Boolean(env.G2B_API_KEY), version: VERSION });
    }
    if (url.pathname !== '/api/bids') return json({ error: 'Not found' }, 404);
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

    const origin = request.headers.get('origin');
    const allowed = (env.ALLOWED_ORIGIN || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    if (origin && !allowed.includes(origin)) {
      return json({ error: '허용되지 않은 사이트 주소입니다.' }, 403);
    }
    const cors = origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {};

    const category = url.searchParams.get('category') || '용역';
    const from = url.searchParams.get('from') || '';
    const to = url.searchParams.get('to') || '';
    const keyword = (url.searchParams.get('q') || '').trim();
    const page = Math.max(1, Math.min(Number(url.searchParams.get('page')) || 1, 100));

    if (!validDate(from) || !validDate(to)) {
      return json({ error: 'from/to는 YYYYMMDD 형식이어야 합니다.' }, 400, cors);
    }
    if (!env.G2B_API_KEY) {
      return json({ error: 'API 인증키가 설정되지 않았습니다.' }, 503, cors);
    }

    let upstream;
    try {
      upstream = buildRequest({ category, from, to, serviceKey: env.G2B_API_KEY, page, pageSize: PAGE_SIZE, keyword });
    } catch (e) {
      return json({ error: e.message }, 400, cors);
    }

    try {
      const response = await fetch(upstream.toString(), {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) {
        return json({ error: '조달청 API 요청에 실패했습니다.', status: response.status }, 502, cors);
      }
      const payload = await response.json();
      const items = parseResponse(payload, category);
      const bids = dedupe(items);
      const totalCount = Number(payload?.response?.body?.totalCount || 0);
      return json(
        {
          bids,
          count: bids.length,
          category,
          from,
          to,
          keyword,
          page,
          totalCount,
          hasMore: totalCount > (page - 1) * PAGE_SIZE + items.length,
          queriedAt: new Date().toISOString(),
          version: VERSION,
        },
        200,
        cors,
      );
    } catch (e) {
      return json({ error: '공식 API 응답을 처리할 수 없습니다.' }, 502, cors);
    }
  },
};
