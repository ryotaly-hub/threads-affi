# threads-affi

Amazonアソシエイト用のThreads投稿内容を作成するアプリ

## 構成

- 種類: Express（Node.js）の Web アプリ／API
- デプロイ先: なし

## 使い方

画面の流れ：売れ筋検索（カテゴリ・季節を選ぶ）→ 候補を選んで条件入力 → 投稿3パターンと伸びる確率を表示 → 本文をコピーして自分で投稿。


- **起動**: `npm start` → http://localhost:3002/
- **テスト**: `npm test`（= `bash test.sh`）。サーバーを自動で起動し、curl でエンドポイントを叩いて期待値と比較する。`curl` と `jq` が必要。
  - **注意**: `test.sh` は最初にポート 3002 のプロセスを `kill -9` する。
  - 新しいエンドポイントを追加したら、`test.sh` に `assert_eq` を追加する。

## GitHub Pages から使う

https://ryotaly-hub.github.io/threads-affi/ で画面を開ける。売れ筋検索と投稿作成は、画面から Mac のサーバーを Tailscale 経由で呼んで行う。

1. Tailscale の管理画面（DNS）で「HTTPS Certificates」を有効にする（初回だけ）
2. Mac で `npm start` と `tailscale serve --bg 3002` を実行する（serve は一度設定すれば残る）
3. Tailscale をオンにした端末で Pages を開き、接続先 `https://<Mac の名前>.ts.net` とパスワードを入れる（端末に保存される）
   - Chrome では最初に「ローカル ネットワークへのアクセス」の許可を求められるので、許可する（拒否したら、アドレスバー左のアイコンから許可し直す）

## スマホなど外から使う（Tailscale）

1. Mac とスマホの両方に Tailscale を入れ、同じアカウントでログインする
2. `.env` に `APP_PASSWORD` を入れて `npm start`（パスワードがあるときだけ、ほかの端末からの接続を受け付ける）
3. スマホで `http://<Mac の Tailscale の IP>:3002/` を開き、パスワードを入れる（ユーザー名は何でもよい）

Mac が起動していて、アプリが動いているときだけ使える。

## 資料の保存場所

- `docs/` — 仕様・メモ・参考資料
- `assets/` — 画像などの素材

## 秘密情報

- `APP_PASSWORD`（アプリのパスワード）。`.env.example` を `.env` にコピーして値を入れる。`npm start` が `.env` を読み込む。
- AI は、このパソコンでログイン済みの Claude Code を `claude -p` で呼んで使う。Claude API のキーは使わない。

## 作り始める前に

- Claude Code に「`intent-interview.md` を読んで、そのとおりに進めて」と頼み、インタビューに答えて `intent.md`（何に困っているか・どうなったら嬉しいか・誰に関係するか・守る条件・未決事項）を作る。
