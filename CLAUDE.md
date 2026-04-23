# セラーノート — Claude専用プロジェクトメモ

## このファイルについて
このファイルはClaude Codeが毎回自動で読み込む「プロジェクト記憶」です。
新しいセッションになっても、ここに書いてあることは必ず把握した状態で開始します。

---

## アプリ概要

**セラーノート** — ECせどり・フリマ出品者向けの在庫・売上管理PWAアプリ

- ユーザー：ECせどり・Amazon/フリマ販売をしている方
- 動作：ブラウザ（ローカルファイル起動）、スマホのホーム画面にも追加可能（PWA）
- 認証：Firebase Auth（メール/パスワード）
- データ：Firebase Firestore（クラウド同期）
- コード規模：app.js 約3200行（フレームワークなし、純粋なJS）

---

## ファイル構成

| ファイル | 役割 |
|---|---|
| `index.html` | UI全体 + Firebase SDK読み込み + ログイン画面 |
| `app.js` | アプリのロジック全て（約3200行） |
| `style.css` | スタイル |
| `manifest.json` | PWA設定 |
| `sw.js` | Service Worker（オフライン対応） |

---

## 機能一覧（実装済み）

### タブ構成
1. **分析**（ホーム） — 売上グラフ、利益サマリー、ランキング、プラットフォーム別集計
2. **売上管理表** — 出品・売上の一覧管理、ステータス管理、CSV出力
3. **商品マスタ** — 仕入れ商品の登録・写真管理・在庫数管理
4. **同期** — データのエクスポート/インポート（端末間同期）
5. **設定** — プラットフォーム管理、送料プリセット、JANコード、データクリア

### データ構造（Firestore）
```
users/{userId}/
  products/{id}          商品マスタ
  products/{id}/photos/  商品写真（サブコレクション）
  listings/{id}          売上・出品記録
  listing_photos/{id}    出品写真
  settings/{key}         設定値
```

### 対応プラットフォーム
メルカリ、メルカリShops、ラクマ、クリーマ、ミンネ、ヤフオク、Amazon、Amazon FBA、PayPayフリマ、BASE、STORES、Shopify、フリル、その他

### 売上ステータス
出品前 → 出品中 → 入金待ち → 発送準備中 → 評価待ち → 取引完了 / キャンセル

---

## Firebase設定

```javascript
projectId: "seller-note-9b1b8"
authDomain: "seller-note-9b1b8.firebaseapp.com"
apiKey: "AIzaSyA3sQ8oKNfUYts3qrxEz3EkTZzsnEFF2AA"
```

---

## コーディングルール

- フレームワーク不使用（Vue/React等は入れない）
- 既存のコードパターンに合わせて書く
- `db.put(store, data)` でFirestoreへ保存
- `db.getAll(store)` で一覧取得
- `toast('メッセージ')` でトースト通知
- `confirmDialog('メッセージ')` で確認ダイアログ
- `_render(view, params, title)` で画面遷移
- UIは既存のclass（`btn`, `btn-primary`, `badge-*` など）を使う

---

## 開発履歴・メモ

- 2026年4月頃から開発開始
- 当初はIndexedDB（ローカル）→ Firebase Firestoreに移行済み
- 写真はFirestoreの1MB制限を回避するためサブコレクションに分けて保存

---

## デプロイ手順（毎回必ずやること）

**本番URL**: `https://blacksoul2026.github.io/seller-note`
**方法**: GitHub Pages（masterブランチから自動配信）

### コード修正後の手順（必須）

1. **バージョンを上げる**（毎回）
   - `version.json` の `v` の数字を +1 する（例：`20260420-10` → `20260420-11`）
   - `index.html` の `app.js?v=` と `style.css?v=` も同じ番号に揃える

2. **GitHubにプッシュ（3ファイル必ずコミットに含める）**
   - `app.js` ← ロジック変更時
   - `index.html` ← バージョン番号・Firebase設定変更時（毎回）
   - `style.css` ← スタイル変更時
   - `version.json` ← 毎回必ず

3. **iPhoneで確認**
   - GitHub Pages反映まで1〜3分かかる
   - Safariでページを引っ張って更新すれば新バージョンが読み込まれる

### 重要注意事項

- **`persistentLocalCache`は絶対使わない** → iOSでFirestoreが「client has already been terminated」エラーになる
- 現在は `memoryLocalCache()` を使用中（これを維持すること）
- バージョンを上げないとiPhoneで古いキャッシュが残り続ける

---

## よく出るエラーのパターン（随時追記）

- **"The client has already been terminated"** → `persistentLocalCache`（IndexedDB）をiOSが強制終了する問題。`memoryLocalCache`に変更済み。再発したら index.html の `initializeFirestore` を確認。
