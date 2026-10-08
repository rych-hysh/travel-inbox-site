(function () {
  var store = window.TOTTOKI_STORE || {};
  var APP_STORE_LIVE = store.live === true && /^\d+$/.test(store.appId);
  var APP_STORE_URL = 'https://apps.apple.com/jp/app/id' + store.appId;

  // ?backend=dev は dev の Supabase で作ったリンクを確かめるときだけ。
  // どちらも公開の URL で、隠す必要はない。
  var FUNCTIONS = {
    prod: 'https://avoiknphqnhcsiqjcppp.supabase.co/functions/v1/share-web',
    dev: 'https://ofaqtlhohzhgfcshvieb.supabase.co/functions/v1/share-web',
  };
  var backend = /(?:^|[?&])backend=dev(?:&|$)/.test(location.search)
    ? FUNCTIONS.dev
    : FUNCTIONS.prod;

  var CATEGORIES = {
    restaurant: 'レストラン',
    cafe: 'カフェ',
    sightseeing: '観光',
    nature: '自然',
    shopping: 'ショッピング',
    hotel: '宿泊',
    museum: '美術館・博物館',
    activity: 'アクティビティ',
    other: 'その他',
  };
  var SOURCE_LINKS = {
    instagram: 'Instagram の投稿を見る',
    tiktok: 'TikTok の投稿を見る',
    x: 'X の投稿を見る',
    google_maps: 'Google マップで見る',
  };

  var $ = function (selector) {
    return document.querySelector(selector);
  };
  var show = function (selector, visible) {
    var node = $(selector);
    if (node) node.hidden = !visible;
  };
  var text = function (selector, value) {
    $(selector).textContent = value;
  };
  var ua = navigator.userAgent;
  var isApple = /iPhone|iPad|iPod|Macintosh/.test(ua);
  var isAndroid = /Android/.test(ua);

  // ページ内移動で、共有トークンを入れたフラグメントを書き換えない。
  document
    .querySelectorAll('.skip-link, [data-itinerary-jump]')
    .forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        var target = $(link.getAttribute('href'));
        if (target) {
          target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
          target.scrollIntoView();
        }
      });
    });

  var icon = function (name) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'share-icon');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#icon-' + name);
    svg.appendChild(use);
    return svg;
  };

  var setMessage = function (title, body) {
    text('[data-message-title]', title);
    text('[data-message-body]', body);
    show('[data-view="message"]', true);
    show('[data-view="item"]', false);
    show('[data-view="invite"]', false);
    $('[data-content]').setAttribute('aria-busy', 'false');
  };

  // 「保存すると何ができるか」とストアのボタン（§6.1）。kind が無いときは一般の案内。
  var setInstall = function (kind) {
    if (kind) {
      if (!isAndroid) show('[data-open-dock]', true);
      text(
        '[data-dock-caption]',
        kind === 'invite'
          ? 'この旅を、一緒に。'
          : 'この「行きたい」を、とっとく。',
      );
      text(
        '[data-install-title]',
        kind === 'invite'
          ? 'Tottoki でできること'
          : '「行きたい」を、忘れない。',
      );
      show('[data-benefits]', true);
      text(
        '[data-open-title]',
        kind === 'invite'
          ? 'この旅行の計画に、参加しませんか'
          : '次のおでかけに、つなげよう。',
      );
      text(
        '[data-open-description]',
        kind === 'invite'
          ? '参加すると、みんなの「行きたい」を日ごとの行程にまとめられます。'
          : '届いた場所を保存して、地図や旅行の行程で見返せます。',
      );
      text(
        '[data-open-label]',
        kind === 'invite' ? 'アプリで旅行を見る' : 'アプリで場所を見る',
      );
    }
    if (isAndroid) {
      text(
        '[data-install-note]',
        'いまは iPhone 版だけです。共有された内容や地図のリンクは、このページでご覧いただけます。',
      );
      text('[data-release-label]', 'iPhone アプリ');
      show('[data-has-token]', false);
      return;
    }
    if (APP_STORE_LIVE) {
      var link = $('[data-store-link]');
      link.href = APP_STORE_URL;
      link.textContent =
        kind === 'invite'
          ? 'App Store で入手して参加する'
          : kind === 'item'
            ? 'App Store で入手して保存する'
            : 'App Store で入手';
      show('[data-store]', true);
      $('[data-header-store]').href = APP_STORE_URL;
      show('[data-header-store]', true);
      show('[data-header-caption]', false);
      show('[data-release-label]', false);
      text(
        '[data-install-note]',
        'アプリを入れて登録したら、もう一度このリンクを開いてください。',
      );
    }
  };

  var day = function (date, withYear) {
    return date.toLocaleDateString(
      'ja-JP',
      withYear
        ? { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }
        : { month: 'long', day: 'numeric', weekday: 'short' },
    );
  };
  // 「10月10日(金) 〜 11月24日(月)」。今年でなければ年も付ける。
  var period = function (start, end) {
    if (!start) return '';
    var thisYear = new Date().getFullYear();
    var withYear =
      start.getFullYear() !== thisYear ||
      Boolean(end && end.getFullYear() !== thisYear);
    if (!end || start.toDateString() === end.toDateString())
      return day(start, withYear);
    return day(start, withYear) + ' 〜 ' + day(end, withYear);
  };
  var parseInstant = function (value) {
    var date = value ? new Date(value) : null;
    return date && !isNaN(date.getTime()) ? date : null;
  };
  // 旅行の日程は「2026-10-10」の形の現地の日付。
  var parseDay = function (value) {
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    return match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      : null;
  };
  var until = function (value) {
    var date = parseInstant(value);
    return date
      ? 'このリンクは' +
          date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' }) +
          'まで有効です。'
      : '';
  };
  var fact = function (list, value, label, symbol) {
    if (!value) return;
    var li = document.createElement('li');
    li.appendChild(icon(symbol || 'pin'));
    var copy = document.createElement('div');
    var caption = document.createElement('span');
    caption.className = 'share-fact-label';
    caption.textContent = label || '場所';
    var detail = document.createElement('span');
    detail.className = 'share-fact-value';
    detail.textContent = value;
    copy.appendChild(caption);
    copy.appendChild(detail);
    li.appendChild(copy);
    list.appendChild(li);
  };
  var action = function (list, label, href) {
    if (!/^https?:\/\//.test(href)) return;
    var a = document.createElement('a');
    a.className = 'share-action';
    a.href = href;
    a.rel = 'noopener noreferrer';
    var copy = document.createElement('span');
    copy.textContent = label;
    a.appendChild(copy);
    a.appendChild(icon('external'));
    list.appendChild(a);
  };

  // 地図アプリと元のページへのリンク（§5.1・§10.1）。Places の座標は返って
  // こないので、返ってきた座標は使ってよい。place ID は Google マップの URL
  // にだけ使う。
  var mapLinks = function (list, item, withSource) {
    var isEvent = item.type === 'event';
    var name = (isEvent ? item.venue : item.place_name) || item.title || '';
    var hasPin =
      typeof item.latitude === 'number' && typeof item.longitude === 'number';
    var pin = hasPin ? item.latitude + ',' + item.longitude : '';
    var words = [name, item.address].filter(Boolean).join(' ');
    var fromGoogleMaps = item.source === 'google_maps' && item.source_url;
    if (fromGoogleMaps && !withSource) {
      action(list, 'Google マップで開く', item.source_url);
    } else if (!fromGoogleMaps && (item.google_place_id || pin || words)) {
      var google =
        'https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent(item.google_place_id ? words : pin || words) +
        (item.google_place_id
          ? '&query_place_id=' + encodeURIComponent(item.google_place_id)
          : '');
      action(list, 'Google マップで開く', google);
    }
    if (isApple && (pin || words)) {
      var apple =
        'https://maps.apple.com/?q=' +
        encodeURIComponent(name || words) +
        (pin
          ? '&ll=' + pin
          : item.address
            ? '&address=' + encodeURIComponent(item.address)
            : '');
      action(list, 'Apple マップで開く', apple);
    }
    if (withSource && item.source_url) {
      action(
        list,
        SOURCE_LINKS[item.source] || '元のページを見る',
        item.source_url,
      );
    }
  };

  var renderItem = function (data) {
    var item = data.item || {};
    var isEvent = item.type === 'event';
    var sender = data.sender_name;
    var what = isEvent ? '「行きたいイベント」' : '「行きたい場所」';
    text(
      '[data-item-lead]',
      (sender ? sender + 'さんから' : '') + what + 'が届きました',
    );
    text(
      '[data-item-kind]',
      isEvent ? 'イベント' : CATEGORIES[item.category] || '場所',
    );
    $('[data-item-icon]').setAttribute(
      'href',
      isEvent ? '#icon-calendar' : '#icon-pin',
    );
    text('[data-item-title]', item.title || '');
    document.title = (item.title || '共有されたリンク') + ' — Tottoki';

    var facts = $('[data-item-facts]');
    if (isEvent) {
      fact(
        facts,
        period(
          parseInstant(item.event_start_at),
          parseInstant(item.event_end_at),
        ),
        '開催期間',
        'calendar',
      );
      if (item.venue) fact(facts, item.venue, '会場');
    }
    fact(
      facts,
      item.address || [item.prefecture, item.city].filter(Boolean).join(''),
      '所在地',
    );

    if (item.memo) {
      text(
        '[data-item-memo-title]',
        (sender ? sender + 'さん' : '送った人') + 'のメモ',
      );
      text('[data-item-memo-body]', item.memo);
      show('[data-item-memo]', true);
    }

    mapLinks($('[data-item-actions]'), item, true);
    show('[data-item-map]', $('[data-item-actions]').childNodes.length > 0);

    text('[data-view="item"] [data-expires]', until(data.expires_at));
    show('[data-view="message"]', false);
    show('[data-view="item"]', true);
    $('[data-content]').setAttribute('aria-busy', 'false');
  };

  // 行程（§5.2）。日ごとに、時刻・名前・種類・住所と地図のリンク。日が
  // 決まっていない場所は最後に「未定」としてまとめる。
  var renderItinerary = function (root, entries, start) {
    var header = document.createElement('div');
    header.className = 'share-itinerary-header';
    var heading = document.createElement('h2');
    heading.textContent = '旅の行程';
    header.appendChild(heading);
    var count = document.createElement('span');
    count.className = 'share-itinerary-count';
    count.textContent = entries.length + '件の行きたい';
    header.appendChild(count);
    root.appendChild(header);
    if (entries.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'share-empty-itinerary';
      empty.textContent =
        '行程はこれから。みんなの「行きたい」を集めましょう。';
      root.appendChild(empty);
      return;
    }

    var groups = [];
    entries.forEach(function (entry) {
      var key = typeof entry.day_index === 'number' ? entry.day_index : null;
      var group = groups.find(function (candidate) {
        return candidate.key === key;
      });
      if (!group) groups.push((group = { key: key, entries: [] }));
      group.entries.push(entry);
    });
    groups.sort(function (a, b) {
      if (a.key === null) return 1;
      if (b.key === null) return -1;
      return a.key - b.key;
    });

    groups.forEach(function (group) {
      var section = document.createElement('section');
      section.className = 'share-day';
      var dayTitle = document.createElement('h3');
      var badge = document.createElement('span');
      badge.className = 'share-day-number';
      if (group.key === null) {
        badge.textContent = '未定';
        dayTitle.appendChild(badge);
        dayTitle.appendChild(document.createTextNode('これから決める場所'));
      } else {
        badge.appendChild(document.createTextNode('DAY'));
        var number = document.createElement('strong');
        number.textContent = String(group.key).padStart(2, '0');
        badge.appendChild(number);
        dayTitle.appendChild(badge);
        if (start) {
          var date = new Date(
            start.getFullYear(),
            start.getMonth(),
            start.getDate() + group.key - 1,
          );
          dayTitle.appendChild(
            document.createTextNode(
              day(date, date.getFullYear() !== new Date().getFullYear()),
            ),
          );
        } else {
          dayTitle.appendChild(document.createTextNode(group.key + '日目'));
        }
      }
      section.appendChild(dayTitle);

      var list = document.createElement('ol');
      list.className = 'share-stops';
      group.entries.forEach(function (entry) {
        var item = entry.item || {};
        var li = document.createElement('li');
        if (entry.planned_time) {
          var time = document.createElement('p');
          time.className = 'share-stop-time';
          time.textContent = entry.planned_time;
          li.appendChild(time);
        }
        var head = document.createElement('h4');
        head.className = 'share-stop-title';
        head.textContent = item.title || '名前のない場所';
        li.appendChild(head);

        var category =
          item.type === 'event' ? 'イベント' : CATEGORIES[item.category];
        if (category) {
          var kind = document.createElement('span');
          kind.className = 'share-stop-category';
          kind.textContent = category;
          li.appendChild(kind);
        }

        var meta = [
          item.type === 'event'
            ? period(
                parseInstant(item.event_start_at),
                parseInstant(item.event_end_at),
              )
            : null,
          item.type === 'event' && item.venue ? '会場: ' + item.venue : null,
          item.address ||
            [item.prefecture, item.city].filter(Boolean).join('') ||
            null,
        ].filter(Boolean);
        meta.forEach(function (value) {
          var line = document.createElement('p');
          line.className = 'share-stop-meta';
          line.textContent = value;
          li.appendChild(line);
        });

        var links = document.createElement('div');
        links.className = 'share-stop-links';
        mapLinks(links, item, false);
        if (links.childNodes.length > 0) li.appendChild(links);
        list.appendChild(li);
      });
      section.appendChild(list);
      root.appendChild(section);
    });
  };

  var renderInvite = function (data) {
    var trip = data.trip || {};
    text(
      '[data-invite-lead]',
      (trip.owner_name ? trip.owner_name + 'さんから' : '') +
        '旅行に招待されています',
    );
    text('[data-invite-title]', trip.title || '');
    document.title = '旅行「' + (trip.title || '') + '」への招待 — Tottoki';

    var facts = $('[data-invite-facts]');
    if (trip.destination_name && trip.destination_name !== trip.title) {
      fact(facts, trip.destination_name, '行き先');
    }
    var start = parseDay(trip.start_date);
    var end = parseDay(trip.end_date);
    if (start) {
      var days = end ? Math.round((end - start) / 86400000) + 1 : 1;
      fact(
        facts,
        period(start, end) + (days > 1 ? ' · ' + days + '日間' : ''),
        '日程',
        'calendar',
      );
    }
    fact(
      facts,
      (trip.member_count || 1) + '人でつくる旅',
      'メンバー',
      'people',
    );
    show('[data-invite-full]', (trip.member_count || 0) >= 10);
    renderItinerary($('[data-invite-itinerary]'), trip.items || [], start);
    show('[data-itinerary-jump]', (trip.items || []).length > 0);

    text('[data-view="invite"] [data-expires]', until(data.expires_at));
    show('[data-view="message"]', false);
    show('[data-view="invite"]', true);
    $('[data-content]').setAttribute('aria-busy', 'false');
  };

  // アプリの src/utils/share-links.ts と同じ形のトークンだけを受け付ける。
  var token = '';
  try {
    token = decodeURIComponent(location.hash.replace(/^#/, ''));
  } catch (e) {
    token = '';
  }
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(token)) {
    setMessage(
      'リンクが途中で切れているようです',
      '送ってくれた人に、もう一度送ってもらってください。',
    );
    setInstall(null);
    return;
  }

  $('[data-open-app]').href = 'tottoki://i/' + token;
  $('[data-dock-open]').href = 'tottoki://i/' + token;
  show('[data-has-token]', true);
  setMessage('読み込んでいます…', '');
  $('[data-content]').setAttribute('aria-busy', 'true');
  setInstall(null);

  fetch(backend, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: token }),
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    cache: 'no-store',
  })
    .then(function (response) {
      if (!response.ok) throw new Error('status ' + response.status);
      return response.json();
    })
    .then(function (data) {
      if (data.state === 'ok' && data.kind === 'item') {
        renderItem(data);
        setInstall('item');
      } else if (data.state === 'ok' && data.kind === 'invite') {
        renderInvite(data);
        setInstall('invite');
      } else if (data.state === 'expired') {
        setMessage(
          'このリンクは有効期限が切れています',
          '送った人に新しいリンクを頼んでください。',
        );
        show('[data-has-token]', false);
      } else {
        setMessage(
          'このリンクは使えなくなっています',
          '送った人が止めたか、送った項目や旅行が削除された可能性があります。',
        );
        show('[data-has-token]', false);
      }
    })
    .catch(function () {
      setMessage(
        '通信できませんでした',
        '電波の良いところで、ページを読み込み直してください。',
      );
    });
})();
