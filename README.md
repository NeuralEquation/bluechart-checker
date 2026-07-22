# BlueChart Check

青チャートの例題カタログを端末内へ読み込み、評価・要復習・メモ・履歴を管理する個人用PWAです。例題JSONと学習データは外部へ送信せず、ブラウザーのIndexedDBだけへ保存します。

## ローカル起動

```powershell
npm install
npm run dev
```

表示された `http://localhost:5173/` をブラウザーで開いてください。HTMLファイルを直接開く方式には対応していません。

## 入力データ

初回画面で抽出済みJSONを複数選択します。JSONをプロジェクトフォルダーへコピーする必要はありません。同じ例題IDを再インポートするとカタログだけが更新され、進捗は維持されます。

実データ、進捗バックアップ、完全バックアップは `.gitignore` で除外しています。実データをfixture、README、スクリーンショット、`public/`、`src/`へ置かないでください。

## テストとビルド

```powershell
npm run test
npm run build
npm run preview
```

本番ビルドは `dist/` に生成されます。PWAの更新は次回の読み込み時に通知され、作業中に自動リロードしません。

## Cloudflareへデプロイ

1. Cloudflareへログインします。
2. `wrangler.jsonc` の `name` を必要に応じて変更します。
3. 次を実行します。

```powershell
npx wrangler login
npm run deploy
```

このプロジェクトはWorkers Static Assetsのassets-only SPAです。Worker API、D1、Firebaseは使用しません。

## Cloudflare Access（手動設定）

Cloudflare Zero TrustでデプロイURLをSelf-hosted applicationとして追加し、本人のメールアドレスまたは本人のIdentity ProviderアカウントだけをAllowにします。それ以外は拒否してください。本番URLに加え、利用するプレビューURLも保護します。

Access用の秘密、Cloudflare APIトークン、メールアドレスをコードやコミットへ含めないでください。アプリ内の簡易パスワードは本当のアクセス制御にならないため実装していません。

## データ移行

設定画面から次を利用できます。

- 進捗のみ書き出し: 進捗、履歴、設定を保存
- 完全バックアップ: 上記にカタログを追加（取り扱い注意）
- バックアップ復元: 置換または更新日時の新しい進捗を優先するマージ

機種変更前には完全バックアップを安全な個人ストレージへ保存し、新端末で復元してください。

## 既知の制限

- 端末間の自動同期はありません。
- 動画URLは保持していないため、動画項目名とcontentIdのみ表示します。
- アイコンは単一のmaskable SVGです。ストア配布用のPNGが必要な場合は、同じ図柄から192pxと512pxを追加してください。
