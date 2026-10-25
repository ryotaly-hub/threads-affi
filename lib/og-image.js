// ページの代表画像（og:image / twitter:image）の URL を取り出す
// Amazon のページは規約のため読みに行かない
const TIMEOUT_MS = 8000;
const MAX_BYTES = 512 * 1024;

function isAmazon(url) {
  return /(^|\.)(amazon\.[a-z.]+|amzn\.(to|asia)|media-amazon\.com)$/i.test(url.hostname);
}

// <head> だけ読めれば足りるので、先頭の MAX_BYTES まで読んで打ち切る
async function readHead(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let html = '';
  while (html.length < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    html += decoder.decode(value, { stream: true });
    if (html.includes('</head>')) break;
  }
  reader.cancel().catch(() => {});
  return html;
}

function metaContent(html, names) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const name = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (!names.includes(name)) continue;
    const content = tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1];
    if (content) return content.replace(/&amp;/g, '&');
  }
  return '';
}

async function findOgImage(pageUrl) {
  let url;
  try {
    url = new URL(pageUrl);
  } catch {
    return '';
  }
  if (!/^https?:$/.test(url.protocol) || isAmazon(url)) return '';
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh) VANG-SELECT-Post-draft', Accept: 'text/html' },
    });
    if (!res.ok || !/html/i.test(res.headers.get('content-type') || '')) return '';
    const content = metaContent(await readHead(res), ['og:image', 'og:image:url', 'og:image:secure_url', 'twitter:image']);
    if (!content) return '';
    const image = new URL(content, res.url);
    return /^https?:$/.test(image.protocol) && !isAmazon(image) ? image.href : '';
  } catch {
    return '';
  }
}

// 候補の URL を順に試し、最初に見つかった画像を返す（見つからなければ空文字）
async function findImage(urls) {
  for (const u of urls) {
    if (typeof u !== 'string') continue;
    const image = await findOgImage(u);
    if (image) return image;
  }
  return '';
}

module.exports = { findImage };
