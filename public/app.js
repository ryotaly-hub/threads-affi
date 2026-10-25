const CATEGORIES = [
  '美容・コスメ', 'ヘアケア', 'スキンケア', '家電', 'キッチン家電', '生活家電',
  '家具・インテリア', '収納', '日用品', 'ヘルス・ダイエット', 'ファッション', 'ベビー・キッズ',
];
const SCORE_LABELS = ['フック力', '具体性', '逆張り強度', '共感性', 'コメント誘発力'];

const $ = (id) => document.getElementById(id);
let variables = [];
let selectedCategory = '';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function setStatus(el, text, type = '') {
  el.textContent = text;
  el.className = `status ${type}`;
}

function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, 1800);
}

async function copy(text) {
  await navigator.clipboard.writeText(text);
  toast('コピーしました');
}

async function postJson(path, body) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `エラーが発生しました（${res.status}）`);
  return data;
}

// ---- 1. 売れ筋検索 ----

function renderCategories() {
  const wrap = $('categories');
  const all = ['全体', ...CATEGORIES];
  wrap.innerHTML = all.map((c) =>
    `<button type="button" class="chip" role="radio" aria-checked="${c === '全体'}" data-value="${c === '全体' ? '' : escapeHtml(c)}">${escapeHtml(c)}</button>`
  ).join('');
  wrap.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    wrap.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-checked', String(c === chip)));
    selectedCategory = chip.dataset.value;
    $('category-other').value = '';
  });
  $('category-other').addEventListener('input', (e) => {
    if (e.target.value.trim()) wrap.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-checked', 'false'));
  });
}

function renderTrends(data) {
  const candidates = Array.isArray(data.candidates) ? data.candidates : [];
  $('trends-result').innerHTML = `
    ${data.summary ? `<div class="summary"><b>全体の傾向：</b>${escapeHtml(data.summary)}</div>` : ''}
    <div class="candidates">
      ${candidates.map((c, i) => `
        <article class="candidate">
          <div class="candidate-head">
            <span class="tag">${escapeHtml(c.category)}</span>
            <strong>${escapeHtml(c.product)}</strong>
            ${c.price ? `<span class="price">${escapeHtml(c.price)}</span>` : ''}
          </div>
          <p class="reason"><b>今売れている理由：</b>${escapeHtml(c.reason)}</p>
          <p class="target">ターゲット：${escapeHtml(c.target)}</p>
          ${Array.isArray(c.sources) && c.sources.length ? `<p class="sources">根拠：${c.sources
            .filter((u) => /^https?:\/\//.test(u))
            .map((u) => `<a href="${escapeHtml(u)}" target="_blank" rel="noopener">${escapeHtml(new URL(u).hostname)}</a>`).join('')}</p>` : ''}
          <button class="secondary small" data-index="${i}">この商品で投稿を作る</button>
        </article>`).join('')}
    </div>`;
  $('trends-result').querySelectorAll('button[data-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const c = candidates[Number(btn.dataset.index)];
      fillForm({ genre: c.genre || c.category, target: c.target, product: c.product });
      $('step-input').scrollIntoView({ behavior: 'smooth' });
      toast('条件入力に反映しました');
    });
  });
}

async function searchTrends() {
  const btn = $('search-btn');
  const status = $('trends-status');
  const category = $('category-other').value.trim() || selectedCategory;
  btn.disabled = true;
  $('trends-result').innerHTML = '';
  setStatus(status, `${category || '全体'}の売れ筋を Web で調べています…`, 'loading');
  try {
    const data = await postJson('api/trends', { category, season: $('season').checked });
    setStatus(status, '');
    renderTrends(data);
  } catch (err) {
    setStatus(status, err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

// ---- 2. 条件入力 ----

// 選択肢のある項目（口調）はプルダウンにし、選んだパターンのペルソナとトーンを下に出す
function fieldHtml(v) {
  if (!v.options) {
    return `<input type="text" id="f-${v.key}" name="${v.key}" placeholder="${escapeHtml(v.placeholder)}">`;
  }
  return `
    <select id="f-${v.key}" name="${v.key}">
      <option value="">${escapeHtml(v.placeholder)}</option>
      ${v.options.map((o) => `<option value="${escapeHtml(o.id)}">${escapeHtml(`${o.id}. ${o.name}（${o.target}）`)}</option>`).join('')}
    </select>
    <p class="option-desc" id="d-${v.key}" hidden></p>`;
}

function renderForm() {
  $('post-form').innerHTML = variables.map((v) => `
    <div class="field">
      <label for="f-${v.key}">${escapeHtml(v.label)}</label>
      ${fieldHtml(v)}
    </div>`).join('');
  for (const v of variables.filter((x) => x.options)) {
    $(`f-${v.key}`).addEventListener('change', (e) => {
      const o = v.options.find((x) => x.id === e.target.value);
      const desc = $(`d-${v.key}`);
      desc.hidden = !o;
      desc.innerHTML = o ? `<b>ペルソナ：</b>${escapeHtml(o.persona)}<br><b>トーン：</b>${escapeHtml(o.tone)}` : '';
    });
  }
}

function fillForm(values) {
  for (const [key, value] of Object.entries(values)) {
    const input = $(`f-${key}`);
    if (input && value) input.value = value;
  }
}

function formValues() {
  return Object.fromEntries(variables.map((v) => [v.key, $(`f-${v.key}`).value.trim()]));
}

async function copyPrompt() {
  const status = $('posts-status');
  try {
    const { prompt } = await postJson('api/prompt', formValues());
    await copy(prompt);
    setStatus(status, '');
  } catch (err) {
    setStatus(status, err.message, 'error');
  }
}

// ---- 3. パターン表示 ----

// ひな型の出力形式（━━━ で区切られたブロック）を読み取る
function parsePatterns(text) {
  const blocks = text.split(/^━{5,}\s*$/m).map((b) => b.trim()).filter(Boolean);
  const patterns = [];
  let recommend = '';
  for (const block of blocks) {
    const title = block.match(/【(パターン[^】]*)】/);
    if (title && /伸びる確率/.test(block)) {
      const rate = block.match(/伸びる確率[：:]\s*(\d+)/);
      const lines = block.split('\n');
      const rateIdx = lines.findIndex((l) => /伸びる確率/.test(l));
      const scoreIdx = lines.findIndex((l) => /採点内訳/.test(l));
      const body = lines.slice(rateIdx + 1, scoreIdx === -1 ? undefined : scoreIdx).join('\n').trim();
      const scores = SCORE_LABELS.map((label) => {
        const m = block.match(new RegExp(`${label}[：:]\\s*(\\d+)`));
        return { label, value: m ? Number(m[1]) : null };
      });
      patterns.push({ title: title[1], letter: (title[1].match(/パターン\s*([A-CＡ-Ｃ])/) || [])[1], rate: rate ? Number(rate[1]) : null, body, scores });
    } else if (/総合おすすめ/.test(block)) {
      recommend = block;
    }
  }
  return { patterns, recommend };
}

function renderPatterns(text) {
  const { patterns, recommend } = parsePatterns(text);
  const wrap = $('patterns');
  if (!patterns.length) {
    wrap.innerHTML = `<div class="raw">${escapeHtml(text)}</div>`;
    return;
  }
  const best = patterns.reduce((a, b) => ((b.rate ?? -1) > (a.rate ?? -1) ? b : a));
  wrap.innerHTML = patterns.map((p, i) => {
    const length = [...p.body.replace(/\n/g, '')].length;
    return `
      <article class="pattern ${p === best ? 'best' : ''}">
        <div class="pattern-head">
          <span class="pattern-title">${escapeHtml(p.title)} ${p === best ? '<span class="badge">おすすめ</span>' : ''}</span>
          <span class="rate"><small>伸びる確率</small>${p.rate ?? '—'}%</span>
        </div>
        <div class="post-body">${escapeHtml(p.body)}</div>
        <div class="post-meta">
          <span class="count ${length > 200 ? 'over' : ''}">${length}文字（目安 160〜200）</span>
          <button class="primary small" data-copy="${i}">本文をコピー</button>
        </div>
        <div class="scores">
          ${p.scores.map((s) => `<div>${s.label}：${s.value ?? '—'}/20
            <div class="score-bar"><span style="width:${((s.value ?? 0) / 20) * 100}%"></span></div></div>`).join('')}
        </div>
      </article>`;
  }).join('') + (recommend ? `<div class="recommend">${escapeHtml(recommend)}</div>` : '');
  wrap.querySelectorAll('button[data-copy]').forEach((btn) => {
    btn.addEventListener('click', () => copy(patterns[Number(btn.dataset.copy)].body));
  });
}

async function generatePosts(e) {
  e.preventDefault();
  const btn = $('generate-btn');
  const status = $('posts-status');
  btn.disabled = true;
  setStatus(status, '投稿を作っています…', 'loading');
  try {
    const { text } = await postJson('api/posts', formValues());
    setStatus(status, '');
    renderPatterns(text);
    $('step-patterns').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    setStatus(status, err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

// ---- 初期化 ----

async function init() {
  const config = await fetch('api/config').then((r) => r.json());
  variables = config.variables;
  $('key-warning').hidden = config.available;
  renderCategories();
  renderForm();
  $('search-btn').addEventListener('click', searchTrends);
  $('post-form').addEventListener('submit', generatePosts);
  $('prompt-btn').addEventListener('click', copyPrompt);
}

init();
