// ローカル限定の架空データ。公開用 HTML / JS にプレビュー分岐を入れない。
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const place = {
  type: 'place',
  title: '喫茶 こもれび',
  category: 'cafe',
  address: '京都府京都市左京区岡崎北御所町 24',
  source: 'instagram',
  source_url: 'https://www.instagram.com/',
  place_name: '喫茶 こもれび',
};
const event = {
  type: 'event',
  title: '秋の庭園と、夜の美術館',
  venue: '京都市京セラ美術館',
  address: '京都府京都市左京区岡崎円勝寺町 124',
  event_start_at: '2026-11-20T09:00:00+09:00',
  event_end_at: '2026-11-22T21:00:00+09:00',
  source_url: 'https://kyotocity-kyocera.museum/',
};
const fixtures = {
  item: {
    state: 'ok',
    kind: 'item',
    sender_name: 'はるか',
    expires_at: '2026-11-19T12:00:00+09:00',
    item: {
      ...place,
      memo: '窓際の席で、ゆっくりひと休み。\n次の京都で一緒に行きたいお店です。',
    },
  },
  event: {
    state: 'ok',
    kind: 'item',
    sender_name: 'はるか',
    item: { ...event, memo: '夕方の光がきれいな時間に行こう。' },
  },
  invite: {
    state: 'ok',
    kind: 'invite',
    expires_at: '2026-11-19T12:00:00+09:00',
    trip: {
      title: '秋の京都、よりみちの旅',
      destination_name: '京都',
      owner_name: 'はるか',
      start_date: '2026-11-20',
      end_date: '2026-11-22',
      member_count: 3,
      items: [
        {
          day_index: 1,
          planned_time: '10:00',
          item: {
            type: 'place',
            title: '南禅寺の水路閣',
            category: 'sightseeing',
            address: '京都府京都市左京区南禅寺福地町',
          },
        },
        { day_index: 1, planned_time: '12:30', item: place },
        { day_index: 2, planned_time: '17:00', item: event },
        {
          day_index: null,
          item: {
            type: 'place',
            title: '鴨川沿いを、のんびり散歩',
            category: 'nature',
            prefecture: '京都府',
            city: '京都市',
          },
        },
      ],
    },
  },
  list: {
    state: 'ok',
    kind: 'list',
    list: {
      title: '次の旅行先の候補',
      description: '来年の夏までに、どこか1つ。',
      owner_name: 'はるか',
      items: [
        {
          type: 'place',
          title: '兼六園',
          category: 'sightseeing',
          address: '石川県金沢市兼六町1',
          latitude: 36.5621,
          longitude: 136.6625,
        },
        { ...event, title: '金沢21世紀美術館の企画展', venue: '金沢21世紀美術館' },
        { ...place },
        {
          type: 'place',
          title: '九份',
          category: 'sightseeing',
          prefecture: '新北市',
        },
      ],
    },
  },
  sparse: {
    state: 'ok',
    kind: 'item',
    item: { type: 'place', title: 'いつか行きたい場所' },
  },
  expired: { state: 'expired' },
  unavailable: { state: 'unavailable' },
};
fixtures.empty = {
  ...fixtures.invite,
  trip: { title: 'これからの旅', member_count: 1, items: [] },
};
fixtures.listEmpty = {
  ...fixtures.list,
  list: { title: 'これから集めるリスト', owner_name: 'はるか', items: [] },
};
fixtures.full = {
  ...fixtures.invite,
  trip: { ...fixtures.invite.trip, member_count: 10 },
};
fixtures.long = {
  ...fixtures.item,
  sender_name: '旅が好きな友人'.repeat(10),
  item: {
    ...place,
    title: 'とても長い名前のカフェと旅先で出会ったお気に入りの場所'.repeat(4),
    address: '住所が長い場合の確認'.repeat(15),
    memo: '<img src=x onerror=alert(1)>\n' + 'メモの長い文章。'.repeat(100),
    source_url: 'javascript:alert(1)',
  },
};

const types = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  try {
    let relative = decodeURIComponent(url.pathname);
    if (relative.endsWith('/')) relative += 'index.html';
    const path = resolve(root, '.' + relative);
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep))
      throw new Error('outside root');
    let body = await readFile(path);
    if (relative === '/i/index.html' && url.searchParams.has('preview')) {
      const name = url.searchParams.get('preview');
      const fixture = fixtures[name] || fixtures.invite;
      let script =
        name === 'loading'
          ? 'window.fetch = () => new Promise(() => {});'
          : name === 'error'
            ? 'window.fetch = () => Promise.reject(new Error("Preview offline"));'
            : 'window.fetch = () => Promise.resolve(new Response(JSON.stringify(' +
              JSON.stringify(fixture) +
              '), {status: 200}));';
      if (url.searchParams.get('ua') === 'iphone')
        script +=
          'Object.defineProperty(navigator, "userAgent", {value: "iPhone"});';
      if (url.searchParams.get('ua') === 'android')
        script +=
          'Object.defineProperty(navigator, "userAgent", {value: "Android"});';
      let html = body
        .toString()
        .replace(
          '<script src="../assets/share.js" defer></script>',
          '<script>' +
            script +
            '</script><script src="../assets/share.js" defer></script>',
        );
      if (url.searchParams.get('store') === 'live')
        html = html.replace('store-config.js', 'store-config.js?live=1');
      if (url.searchParams.has('theme'))
        html = html.replace(
          '../styles.css',
          '../styles.css?theme=' + url.searchParams.get('theme'),
        );
      body = Buffer.from(html);
    }
    if (
      relative === '/assets/store-config.js' &&
      url.searchParams.get('live') === '1'
    )
      body = Buffer.from(body.toString().replace('live: false', 'live: true'));
    if (relative === '/styles.css' && url.searchParams.get('theme') === 'dark')
      body = Buffer.from(
        body
          .toString()
          .replace('@media (prefers-color-scheme: dark)', '@media all'),
      );
    if (relative === '/styles.css' && url.searchParams.get('theme') === 'light')
      body = Buffer.from(
        body
          .toString()
          .replace('@media (prefers-color-scheme: dark)', '@media not all'),
      );
    res.writeHead(200, {
      'Content-Type':
        (types[extname(path)] || 'application/octet-stream') +
        '; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});
server.listen(4173, '127.0.0.1', () =>
  console.log(
    'Preview: http://127.0.0.1:4173/i/?preview=invite&ua=iphone#demo_token',
  ),
);
