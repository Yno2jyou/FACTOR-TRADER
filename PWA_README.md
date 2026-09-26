# FACTOR/TRADER — PWA セットアップ

## 含まれるファイル

| ファイル | 役割 |
|---------|------|
| `index.html` | 本体（マニフェスト連携・SW 登録済み） |
| `manifest.webmanifest` | インストール用 Web App Manifest |
| `sw.js` | Service Worker（オフライン用シェル＋CDN キャッシュ） |
| `icon-192.png` / `icon-512.png` | インストール必須アイコン |
| `favicon-*.png` / `apple-touch-icon.png` | ブラウザ・iOS 用アイコン |

## インストール可能条件

ブラウザ（Chrome / Edge / Android など）が「アプリとしてインストール」を出すには次が必要です。

1. **HTTPS** で配信する（`localhost` は例外で可）
2. 有効な **manifest**（`name` / `icons` 192+512 / `start_url` / `display`）
3. **Service Worker** が登録されていること

## デプロイ例

同じディレクトリに上記ファイルをまとめて置き、静的ホスティングにアップロードします。

```bash
# 例: 簡易ローカル確認（HTTPS ではないため、インストール UI は出ない場合あり）
cd /path/to/artifacts
python3 -m http.server 8080
# → http://localhost:8080/
```

本番では Netlify / Vercel / GitHub Pages / Cloudflare Pages など **HTTPS** の静的ホストを推奨します。

### 注意

- `index.html` と `sw.js` / `manifest.webmanifest` / アイコンは **同一オリジン・同一パス階層** に置いてください。
- メインのゲームファイル名を `FACTOR_TRADER.html` のまま使う場合は、`manifest.webmanifest` の `start_url` を `./FACTOR_TRADER.html` に変更し、`sw.js` の `SHELL_URLS` も合わせてください（推奨は `index.html`）。
- iOS Safari は「ホーム画面に追加」でスタンドアロン表示になります（Chrome のようなインストールプロンプトは出ません）。
- アイコンはプレースホルダです。本番用に差し替える場合は 192×192 / 512×512 の PNG を同名で上書きしてください。

## 動作確認

1. HTTPS でページを開く
2. DevTools → Application → Manifest / Service Workers を確認
3. Chrome のアドレスバー右のインストールアイコン、またはメニューの「アプリをインストール」
