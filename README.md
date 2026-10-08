# Tottoki Web

共有ページは `i/index.html`、表示処理は `assets/share.js`、専用デザインは `assets/share.css`。
既存の共有 API の返却項目だけを表示します。画像の取得・表示は今回の変更に含みません。

## App Store へのリンク

2026-10-08 に App Store で公開しました（v1.0.0・<https://apps.apple.com/jp/app/id6818862412>）。

- 共有ページ（`i/`）: `assets/store-config.js` の `live: true` と `appId`（App Store Connect の Apple ID `6818862412`）で決まる。配信を止めるときは `live: false` に戻す。
- LP（`index.html`）とサポート（`support.html`）: App Store の URL と Smart App Banner の `apple-itunes-app` を HTML に直接書いている。URL を変えるときはこの2つと `store-config.js` を揃える。

共有ページでは `store-config.js` の1か所で、Safari の `apple-itunes-app` メタタグと、ページ上部・本文の App Store リンクが有効になります。
Safari のバナーはブラウザ側が制御します。非対応端末・公開対象外の地域などでは表示されないため、ページ内リンクも用意しています。Android ではストアリンクを表示しません。
共有トークンは `app-argument` に渡しません。登録後は元の共有リンクを再度開いてください。
仕様: [Apple — Smart App Banners](https://developer.apple.com/documentation/webkit/promoting-apps-with-smart-app-banners)

## ローカルプレビュー

Node.js で `node scripts/preview.mjs` を実行し、下記を開きます。架空データをローカルサーバーで注入するため、本番 API への問い合わせはありません。

- 旅行: `http://127.0.0.1:4173/i/?preview=invite&ua=iphone#demo_token`
- 場所: `http://127.0.0.1:4173/i/?preview=item&ua=iphone#demo_token`
- `preview` を `event`, `empty`, `sparse`, `full`, `long`, `expired`, `unavailable`, `error`, `loading` に変えると各状態を確認できます。
- `&store=live` で公開後のストア案内、`&theme=dark` で暗い配色、`&ua=android` で Android 向け案内を確認できます。

`preview` のない URL は通常のページです。プレビュースクリプトは公開ページから読み込みません。
共有データは `textContent` で表示し、リンクは HTTP(S) のみ。トークンはフラグメントと POST 本文にだけ置きます。
