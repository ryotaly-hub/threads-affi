// GitHub Pages に置いた画面から、この Mac のサーバー（Tailscale の https URL）を呼べるようにする。
// 許可するのは ALLOWED_ORIGINS（カンマ区切り）にある送り元だけ。パスワードの確認より先に置く
// （ブラウザの事前確認 OPTIONS はパスワードを付けずに来るため。401 にも許可の印が要る）
const DEFAULT_ORIGINS = 'https://ryotaly-hub.github.io';

function cors(origins = process.env.ALLOWED_ORIGINS || DEFAULT_ORIGINS) {
  const allowed = origins.split(',').map((o) => o.trim()).filter(Boolean);

  return (req, res, next) => {
    const origin = req.headers.origin;
    if (!origin || !allowed.includes(origin)) return next();
    res.set({ 'Access-Control-Allow-Origin': origin, Vary: 'Origin' });
    if (req.method !== 'OPTIONS') return next();
    res.set({
      'Access-Control-Allow-Methods': 'GET, POST',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Private-Network': 'true',
      'Access-Control-Max-Age': '600',
    });
    res.sendStatus(204);
  };
}

module.exports = { cors };
