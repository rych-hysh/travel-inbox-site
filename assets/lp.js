// Travel Inbox — ランディングページの小さな振る舞い。
// どれも JS がなくても内容は読めるようにしてあり、ここでは体験を足すだけ。
(() => {
  'use strict';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* --- アプリ画面のカレンダー（2026年4月。1日は水曜） ------------------ */
  const DOW = ['日', '月', '火', '水', '木', '金', '土'];
  const EVENTS = new Set([4, 12, 18, 19, 25, 29]);
  $$('[data-cal]').forEach((grid) => {
    const range = (grid.dataset.range || '').split(',').filter(Boolean).map(Number);
    const cells = DOW.map((d, i) => `<span class="dow${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}">${d}</span>`);
    for (let i = 0; i < 3; i++) cells.push('<span></span>');
    for (let day = 1; day <= 30; day++) {
      const dow = (day + 2) % 7;
      const cls = [];
      if (dow === 0) cls.push('sun');
      if (dow === 6) cls.push('sat');
      if (range.length) {
        if (day >= range[0] && day <= range[range.length - 1]) {
          cls.push('rng');
          if (day === range[0]) cls.push('rng-s');
          if (day === range[range.length - 1]) cls.push('rng-e');
        }
      } else {
        if (EVENTS.has(day)) cls.push('has');
        if (day === 12) cls.push('sel');
      }
      cells.push(`<span class="${cls.join(' ')}">${day}</span>`);
    }
    grid.innerHTML = cells.join('');
  });

  /* --- ヘッダー：スクロールしたら地を敷く ------------------------------ */
  const header = $('[data-header]');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* --- モバイルメニュー ------------------------------------------------ */
  const toggle = $('[data-menu-toggle]');
  const nav = $('#global-nav');
  const label = $('[data-menu-label]');
  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    label.textContent = open ? 'メニューを閉じる' : 'メニューを開く';
    $('use', toggle).setAttribute('href', open ? '#i-close' : '#i-menu');
  };
  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      setMenu(false);
      toggle.focus();
    }
  });
  window.matchMedia('(min-width: 768px)').addEventListener('change', () => setMenu(false));

  /* --- 事前登録CTA：フォームまで移動して入力欄にフォーカス ------------- */
  const email = $('#signup-email');
  $$('[data-focus-signup]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      $('#register').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' });
      history.replaceState(null, '', '#register');
      email.focus({ preventScroll: true });
    })
  );

  /* --- スクロールで静かに現れる --------------------------------------- */
  const reveals = $$('.reveal');
  // 同じ親の中では少しずつ遅らせる
  reveals.forEach((el) => {
    const siblings = Array.from(el.parentElement.children).filter((c) => c.classList.contains('reveal'));
    el.style.setProperty('--i', String(Math.min(siblings.indexOf(el), 5)));
  });
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-visible'));
  }

  /* --- Inspiration の前後ボタン --------------------------------------- */
  const track = $('#insp-track');
  const buttons = $$('[data-scroll]');
  const updateButtons = () => {
    const max = track.scrollWidth - track.clientWidth - 2;
    buttons[0].disabled = track.scrollLeft <= 2;
    buttons[1].disabled = track.scrollLeft >= max;
  };
  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      const card = $('.insp-card', track).getBoundingClientRect().width + 20;
      track.scrollBy({ left: Number(b.dataset.scroll) * card * 2, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    })
  );
  track.addEventListener('scroll', updateButtons, { passive: true });
  window.addEventListener('resize', updateButtons);
  updateButtons();

  /* --- 事前登録フォーム ------------------------------------------------ */
  // data-endpoint が設定されていれば JSON で POST する。
  // 未設定のあいだは、運営宛ての事前登録メールをメールアプリで作成する。
  const form = $('#signup');
  const status = $('#signup-status');
  const setStatus = (msg, isError = false) => {
    status.textContent = msg;
    status.classList.toggle('is-error', isError);
    form.classList.toggle('is-invalid', isError);
  };
  email.addEventListener('input', () => form.classList.contains('is-invalid') && setStatus(''));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = email.value.trim();
    if (!value || !email.checkValidity()) {
      setStatus('メールアドレスの形式をご確認ください。', true);
      email.setAttribute('aria-invalid', 'true');
      email.focus();
      return;
    }
    email.removeAttribute('aria-invalid');

    const endpoint = form.dataset.endpoint;
    if (endpoint) {
      const button = $('button[type="submit"]', form);
      button.disabled = true;
      setStatus('送信しています…');
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: value }),
        });
        if (!res.ok) throw new Error(String(res.status));
        form.reset();
        setStatus('ご登録ありがとうございます。リリースの際にお知らせします。');
      } catch {
        setStatus('送信できませんでした。時間をおいて、もう一度お試しください。', true);
      } finally {
        button.disabled = false;
      }
      return;
    }

    const subject = 'Travel Inbox 事前登録';
    const body = `Travel Inbox のリリースのお知らせを希望します。\n\nお知らせ先：${value}\n`;
    window.location.href =
      'mailto:travel.inbox.support@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    setStatus('メールアプリが開きます。そのまま送信すると事前登録が完了します。');
  });
})();
