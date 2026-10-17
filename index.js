const path = require('path');
const express = require('express');
const { passwordGate } = require('./lib/auth');
const indexRouter = require('./routes/index');

const app = express();
const port = Number(process.env.PORT) || 3002;
const password = process.env.APP_PASSWORD;
// パスワードがあるときだけ、ほかの端末（Tailscale 経由のスマホなど）からの接続を受け付ける。
// 無いときはこのパソコンからしか開けないようにする
const host = password ? '0.0.0.0' : '127.0.0.1';

// ほかの処理より先にパスワードを確認する
app.use(passwordGate(password));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.use(indexRouter);

app.listen(port, host, () => {
  console.log(`Server is running at http://localhost:${port}`);
  console.log(password ? 'パスワード保護あり（ほかの端末からも接続可）' : 'パスワード未設定のため、このパソコンからだけ開けます');
});
