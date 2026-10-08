/* 2026-10-08 に App Store で公開（v1.0.0）。配信を止めるときは live を false に戻す。 */
window.TOTTOKI_STORE = Object.freeze({ live: true, appId: '6818862412' });

// head 内で同期実行し、Safari の Smart App Banner を公開設定と連動させる。
// 共有トークンは app-argument に含めず、Apple へ渡さない。
if (window.TOTTOKI_STORE.live && /^\d+$/.test(window.TOTTOKI_STORE.appId)) {
  var smartBanner = document.createElement('meta');
  smartBanner.name = 'apple-itunes-app';
  smartBanner.content = 'app-id=' + window.TOTTOKI_STORE.appId;
  document.head.appendChild(smartBanner);
}
