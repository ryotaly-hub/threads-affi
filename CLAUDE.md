# CLAUDE.md

このファイルは、このリポジトリで作業する Claude Code (claude.ai/code) への指針を提供する。

## プロジェクト概要

Amazonアソシエイト用のThreads投稿内容を作成するアプリ

- 種類: Express（Node.js）の Web アプリ／API
- デプロイ先: GitHub Pages（画面だけ。https://ryotaly-hub.github.io/threads-affi/ ）。AI は Mac のサーバーが行う

`build-app` という個人ワークスペース内の1プロジェクトとして管理されているが、それ自体は独立した git リポジトリ。ワークスペース横断の共通事項は親フォルダの `CLAUDE.md` を参照。

## コマンド

- **起動**: `npm start` → http://localhost:3002/
- **テスト**: `npm test`（= `bash test.sh`）。サーバーを自動で起動し、curl でエンドポイントを叩いて期待値と比較する。`curl` と `jq` が必要。
  - **注意**: `test.sh` は最初にポート 3002 のプロセスを `kill -9` する。
  - 新しいエンドポイントを追加したら、`test.sh` に `assert_eq` を追加する。

## ディレクトリ構造

```
index.js              Express 本体（public/ と assets/ を配信。APP_PASSWORD があるときだけ 0.0.0.0 で待ち受け）
lib/auth.js           パスワード保護（Basic 認証。avatar-maker と同じ仕組み）
lib/cors.js           GitHub Pages の画面からの呼び出しを許可（ALLOWED_ORIGINS。パスワード確認より前）
.github/workflows/pages.yml  public/ とロゴを GitHub Pages に公開
routes/index.js       API（/api/config, /api/trends, /api/prompt, /api/posts）
lib/claude.js         Claude Code（claude -p）呼び出し（売れ筋の Web 検索・投稿文の作成）
public/               画面（index.html / style.css / app.js）
public/icons/         アプリアイコン（apple-touch-icon・192/512・favicon）。パスワード無しで配信する
assets/icon-source.png  アイコンの元画像（generate-illustration で logo.png から作成）
test.sh               curl ベースの API テスト
intent-interview.md   intent.md（作業の意図）を作るインタビューの指示
intent.md             作業の意図（5つの項目）
docs/                 仕様・メモ・参考資料（投稿のひな型プロンプトもここ）
assets/               画像などの素材
```

## このプロジェクトで使うスキル

- `scaffold-express-server` — 最小構成の Express.js Web サーバーの雛形を作る
- `graphify` — コード・資料・画像・動画などを、関係を保存した知識グラフに変換する
- `generate-illustration` — テキストの指示から画像を新しく作る、または既存の画像を編集・変換する
  - 画像・アイコン・イラストはこのスキルで作る。手描き・SVG での代替はしない。

## 資料の保存場所

- `docs/` — 仕様・メモ・参考資料
- `assets/` — 画像などの素材

## 秘密情報

- `APP_PASSWORD`（アプリのパスワード）。`.env.example` を `.env` にコピーして値を入れる。`npm start` が `.env` を読み込む。
- AI は、このパソコンでログイン済みの Claude Code を `claude -p` で呼んで使う。Claude API のキーは使わない。

## 作業の意図（intent.md）

- `intent.md` があれば、作業の前に読み、出来上がったらその5つの項目と見比べて合っているかを確かめてから報告する。
- `intent.md` が無いときに作りたいものの話を始められたら、`intent-interview.md` の手順でインタビューして `intent.md` を作る。

## 注意事項

- 投稿文は `docs/ひな型_スレッド投稿プロンプト.md` をそのまま使って作る。ひな型を直したら、画面の読み取り（`public/app.js` の `parsePatterns`）が出力形式に合っているか確かめる。
- AI は Claude API ではなく Claude Code（`claude -p`）を子プロセスで呼ぶ。MCP・スキル・CLAUDE.md を読み込まない最小構成で呼ぶこと（読み込むと1回で数十万トークン消費する）。環境変数 `ANTHROPIC_API_KEY` は渡さない（渡すと従量課金の API で動くため）。
- 売れ筋は Claude Code の WebSearch で調べる。Amazon のページのスクレイピングはしない（規約のため）。
- `test.sh` は `CLAUDE_BIN=/nonexistent/claude` でサーバーを起動するため、AI は呼ばない。パスワードのテストは別ポート 3012 で行う。
- 画面は GitHub Pages に置き、売れ筋検索・投稿作成は画面から Mac のサーバーを呼ぶ。Mac のサーバーは `tailscale serve --bg 3002` で `https://<Mac>.ts.net` として Tailscale の中だけに出す（Funnel で一般公開しない。Render などにも公開しない）。パスワード無しで 0.0.0.0 に待ち受けないこと。
- 画面のパスは相対パスにする（Pages では `/threads-affi/` の下に置かれるため）。
- Pages から開いたときは、接続先 URL とパスワードを画面で入れ、その端末の localStorage に保存する（Mac から直接開いたときは使わない）。接続先の URL はリポジトリ（公開）に書かない。
- 新しい依存関係の追加や、依頼範囲外のリファクタリングは避ける。
- テストが実行できなかった場合は、その理由を明記する。
