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

  /* --- App Store への導線 --------------------------------------------- */
  // 公開前は data-app-store-pending を付けておき、押されたら準備中であることを伝える。
  const storeStatus = $('[data-store-status]');
  $$('[data-app-store-pending]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      storeStatus.textContent = 'App Store での公開準備中です。もうしばらくお待ちください。';
    })
  );
})();
