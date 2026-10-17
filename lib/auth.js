const crypto = require('crypto');

// APP_PASSWORD が設定されているときだけ、全ページを Basic 認証で守る（ユーザー名は何でもよい）。
// 未設定なら何もしない（このパソコンだけで使うとき・テスト用）。
function passwordGate(password) {
  if (!password) return (req, res, next) => next();
  const expected = hash(password);

  return (req, res, next) => {
    const [scheme, encoded] = (req.headers.authorization || '').split(' ');
    if (scheme === 'Basic' && encoded) {
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      const given = decoded.slice(decoded.indexOf(':') + 1);
      // 長さの違いや比較の時間から推測されないよう、ハッシュどうしを一定時間で比べる
      if (crypto.timingSafeEqual(hash(given), expected)) return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="VANG SELECT Post draft", charset="UTF-8"');
    res.status(401).send('パスワードが必要です');
  };
}

function hash(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest();
}

module.exports = { passwordGate };
