const path = require('path');
const express = require('express');
const indexRouter = require('./routes/index');

const app = express();
const port = Number(process.env.PORT) || 3002;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.use(indexRouter);

// この Mac からだけ開けるように、127.0.0.1 で待ち受ける（ほかの端末からはつながらない）
app.listen(port, '127.0.0.1', () => {
  console.log(`Server is running at http://localhost:${port}`);
});
