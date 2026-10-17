# threads-affi

Amazonアソシエイト用のThreads投稿内容を作成するアプリ

## 構成

- 種類: Express（Node.js）の Web アプリ／API
- デプロイ先: なし

## 使い方

- **起動**: `npm start` → http://localhost:3002/
- **テスト**: `npm test`（= `bash test.sh`）。サーバーを自動で起動し、curl でエンドポイントを叩いて期待値と比較する。`curl` と `jq` が必要。
  - **注意**: `test.sh` は最初にポート 3002 のプロセスを `kill -9` する。
  - 新しいエンドポイントを追加したら、`test.sh` に `assert_eq` を追加する。

## 資料の保存場所

- `docs/` — 仕様・メモ・参考資料
- `assets/` — 画像などの素材

## 秘密情報

- なし

## 作り始める前に

- Claude Code に「`intent-interview.md` を読んで、そのとおりに進めて」と頼み、インタビューに答えて `intent.md`（何に困っているか・どうなったら嬉しいか・誰に関係するか・守る条件・未決事項）を作る。
