# CLAUDE.md

このファイルは、このリポジトリで作業する Claude Code (claude.ai/code) への指針を提供する。

## プロジェクト概要

Amazonアソシエイト用のThreads投稿内容を作成するアプリ

- 種類: Express（Node.js）の Web アプリ／API
- デプロイ先: なし（この Mac の http://localhost:3002 だけで使う）

`build-app` という個人ワークスペース内の1プロジェクトとして管理されているが、それ自体は独立した git リポジトリ。ワークスペース横断の共通事項は親フォルダの `CLAUDE.md` を参照。

## コマンド

- **起動**: `npm start` → http://localhost:3002/
- **Mac のアプリとして使う**: `bash scripts/install-app.sh` で `~/Applications/VS-PostDraft.app` を作る（Mac のアプリ名は VS-PostDraft。画面のタイトル「VANG SELECT Post draft」は Threads アカウント名に合わせたもので、そのまま）。開くと、サーバーが止まっていれば裏で起動し（ログは `~/Library/Logs/vang-select-post-draft.log`）、Chrome のアプリウィンドウで開く。フォルダを移動したら、またはアイコンを差し替えたら再実行する。
- **テスト**: `npm test`（= `bash test.sh`）。サーバーを自動で起動し、curl でエンドポイントを叩いて期待値と比較する。`curl` と `jq` が必要。
  - **注意**: `test.sh` は最初にポート 3002 のプロセスを `kill -9` する。
  - 新しいエンドポイントを追加したら、`test.sh` に `assert_eq` を追加する。

## ディレクトリ構造

```
index.js              Express 本体（public/ と assets/ を配信。127.0.0.1 だけで待ち受け）
routes/index.js       API（/api/config, /api/trends, /api/prompt, /api/posts）
lib/claude.js         Claude Code（claude -p）呼び出し（売れ筋の Web 検索・投稿文の作成）
lib/tones.js          口調の10パターン（条件入力のプルダウンと、プロンプトに足す口調指定・文脈構成）
public/               画面（index.html / style.css / app.js）
public/icons/         アプリアイコン（apple-touch-icon・192/512・favicon）
assets/icon-source.png  アイコンの元画像（generate-illustration で logo.png から作成）
scripts/install-app.sh  ~/Applications/VS-PostDraft.app を作る（project-kickoff と同じ仕組み）
test.sh               curl ベースの API テスト
intent-interview.md   intent.md（作業の意図）を作るインタビューの指示
intent.md             作業の意図（5つの項目）
docs/                 仕様・メモ・参考資料（投稿のひな型プロンプト・口調パターンもここ）
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

- なし。AI は、このパソコンでログイン済みの Claude Code を `claude -p` で呼んで使う。Claude API のキーは使わない。

## 作業の意図（intent.md）

- `intent.md` があれば、作業の前に読み、出来上がったらその5つの項目と見比べて合っているかを確かめてから報告する。
- `intent.md` が無いときに作りたいものの話を始められたら、`intent-interview.md` の手順でインタビューして `intent.md` を作る。

## 注意事項

- 口調は `lib/tones.js` の10パターンから選ぶ（`docs/口調パターン.md` と同じ内容。片方を直したらもう片方も直す）。選んだパターンの口調指定と文脈構成（6段階）を「## 出力形式」の前に足す。文字数（160〜200字）と改行ルールはひな型どおり守り、6段階は目安にする（4文の型には厳密に合わせない）。
- 投稿文は `docs/ひな型_スレッド投稿プロンプト.md` をそのまま使って作る。ひな型を直したら、画面の読み取り（`public/app.js` の `parsePatterns`）が出力形式に合っているか確かめる。
- AI は Claude API ではなく Claude Code（`claude -p`）を子プロセスで呼ぶ。MCP・スキル・CLAUDE.md を読み込まない最小構成で呼ぶこと（読み込むと1回で数十万トークン消費する）。環境変数 `ANTHROPIC_API_KEY` は渡さない（渡すと従量課金の API で動くため）。
- 売れ筋は Claude Code の WebSearch で調べる。Amazon のページのスクレイピングはしない（規約のため）。
- `test.sh` は `CLAUDE_BIN=/nonexistent/claude` でサーバーを起動するため、AI は呼ばない。
- この Mac だけで使う。サーバーは 127.0.0.1 で待ち受け、パスワード・Tailscale・GitHub Pages は使わない（以前は使っていたが、2026-10 にローカル専用に戻した）。ほかの端末から開けるようにするときは、パスワード保護を先に入れること。
- 新しい依存関係の追加や、依頼範囲外のリファクタリングは避ける。
- テストが実行できなかった場合は、その理由を明記する。
