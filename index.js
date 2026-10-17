const path = require('path');
const express = require('express');
const indexRouter = require('./routes/index');

const app = express();
const port = 3002;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.use(indexRouter);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
