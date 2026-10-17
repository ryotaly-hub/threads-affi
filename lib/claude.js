// Claude Code（claude -p）の呼び出し（売れ筋調査と投稿文作成）
// Claude API は使わず、このパソコンでログインしている Claude Code の契約の範囲で動かす
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude';
const TIMEOUT_MS = 5 * 60 * 1000;
const TEMPLATE_PATH = path.join(__dirname, '..', 'docs', 'ひな型_スレッド投稿プロンプト.md');

// ひな型の変数（ラベルと、入力欄に最初から書いておく文字）
const VARIABLES = [
  { key: 'genre', label: 'ジャンル', placeholder: '{ジャンル}' },
  { key: 'target', label: 'ターゲット', placeholder: '{ターゲット（具体的な悩みを抱えた層）}' },
  { key: 'product', label: '紹介したい商品・サービス', placeholder: '{商品名／なければ「カテゴリのみ」と記載}' },
  { key: 'tone', label: '口調', placeholder: '{口調（例：女子のタメ口／お姉さん系／オタク系／丁寧系 など）}' },
];

let available;
function isAvailable() {
  if (available === undefined) {
    available = spawnSync(CLAUDE_BIN, ['--version'], { stdio: 'ignore' }).status === 0;
  }
  return available;
}

// ひな型の「## 変数」の部分を入力値で置き換え、口調の {口調} も埋める
function buildPostPrompt(values) {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const filled = VARIABLES.map((v) => `- ${v.label}：${values[v.key]}`).join('\n');
  return template
    .replace(/## 変数\n[\s\S]*?\/\/\n/, () => `## 変数\n${filled}\n`)
    .split('{口調}')
    .join(values.tone);
}

// MCP・スキル・CLAUDE.md を読み込まない最小構成で claude -p を実行し、回答の文章を返す
function run({ system, prompt, tools }) {
  const args = [
    '-p',
    '--output-format', 'json',
    '--no-session-persistence',
    '--strict-mcp-config',
    '--disable-slash-commands',
    '--system-prompt', system,
    '--tools', tools.join(','),
  ];
  if (tools.length) args.push('--allowedTools', tools.join(','));

  // API キーがあると従量課金の API で動いてしまうため、渡さない
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;

  return new Promise((resolve, reject) => {
    const child = spawn(CLAUDE_BIN, args, { cwd: os.tmpdir(), env });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('時間がかかりすぎたため中断しました。もう一度お試しください。'));
    }, TIMEOUT_MS);
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Claude Code を起動できませんでした（${err.message}）`));
    });
    child.on('close', () => {
      clearTimeout(timer);
      let out;
      try {
        out = JSON.parse(stdout);
      } catch {
        return reject(new Error(`Claude Code の実行に失敗しました。${stderr.trim() || stdout.trim()}`));
      }
      if (out.is_error) return reject(new Error(`Claude Code がエラーを返しました：${out.result}`));
      resolve(out.result || '');
    });
    child.stdin.end(prompt);
  });
}

// 文章の中から最初の JSON オブジェクトを取り出す
function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('売れ筋レポートを読み取れませんでした。');
  return JSON.parse(text.slice(start, end + 1));
}

async function searchTrends({ category, season, today }) {
  const scope = category ? `カテゴリ「${category}」` : 'Amazon.co.jp 全体（カテゴリを問わず）';
  const seasonLine = season
    ? `今日は ${today} です。この時期の季節・行事・気候（例：花粉、梅雨、乾燥、新生活、ボーナス、年末年始など）で需要が高まっているものを優先してください。`
    : '季節は考慮せず、通年で売れているものを対象にしてください。';

  const prompt = `${scope}で、いま Amazon.co.jp で売れている・注目されている商品の傾向を Web 検索で調べてください。
${seasonLine}

条件:
- Amazon のページを読み取ることはしない。ニュース、トレンド記事、ランキング紹介記事、SNS の話題など、Amazon 以外の公開情報から推し量る
- Threads でアフィリエイト紹介しやすい（悩み解決型で、価格や手軽さのギャップが出しやすい）商品を優先する
- 候補は5件

回答は次の JSON だけを出力してください（前置き・コードブロック・Sources 一覧は不要。根拠 URL は sources に入れる）:
{
  "summary": "全体の傾向（100字程度）",
  "candidates": [
    {
      "category": "カテゴリ",
      "product": "具体的な商品名（特定できなければ商品ジャンル）",
      "price": "おおよその価格帯",
      "reason": "なぜ今売れているか（季節・イベント・話題など、80字程度）",
      "target": "具体的な悩みを抱えた層",
      "genre": "投稿のジャンル",
      "sources": ["根拠にした記事の URL"]
    }
  ]
}`;

  const text = await run({
    system: 'あなたは日本の EC トレンドに詳しいリサーチャーです。事実と推測を区別し、根拠のある情報だけを使います。',
    prompt,
    tools: ['WebSearch'],
  });
  return extractJson(text);
}

async function generatePosts(values) {
  return run({
    system: 'あなたは Threads の投稿を作る SNS ライターです。ユーザーのプロンプトの出力形式どおりに、投稿だけを出力します。',
    prompt: buildPostPrompt(values),
    tools: [],
  });
}

module.exports = { VARIABLES, isAvailable, buildPostPrompt, searchTrends, generatePosts };
