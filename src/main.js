import { parseBankText, csvToQuestions, CSV_TEMPLATE, reconstructPageText, stripHeadersFooters } from './parser.js';
import { SAMPLE_PAPER } from './sample.js';

const LS_PAPERS = 'rrb_papers_v1';
const LS_ATTEMPTS = 'rrb_attempts_v1';
const app = document.getElementById('app');
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const getPapers = () => load(LS_PAPERS, []);
const setPapers = (p) => save(LS_PAPERS, p);
const getAttempts = () => load(LS_ATTEMPTS, []);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

let view = 'home';
let reviewData = null; // {title, questions, settings, extractedText, error}
let exam = null;
let lastResult = null;

// ---------- HOME ----------
function renderHome() {
  view = 'home';
  const papers = getPapers();
  const attempts = getAttempts();
  app.innerHTML = `
  <header class="top"><h1>RRB PO Mock Test</h1><span>RRB PO Prelims • Reasoning 25 min • Quant 20 min • +1 / −0.25</span></header>
  <div class="wrap">
    <div class="card"><h2>Start a test</h2>
      <p class="small">Sample has short timers (Reasoning 10 min, Quant 8 min) and is labelled Sample. Uploaded papers default to full Prelims sectional timers.</p>
      <button id="sampleBtn">▶ Start Sample Paper (20 Q)</button>
      <button class="secondary" id="uploadBtn">+ Upload New Paper</button>
    </div>
    <div class="card"><h2>Saved papers (${papers.length})</h2>
      ${papers.length ? papers.map(p => `<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;border-bottom:1px solid #eee;padding:8px 0">
        <span><b>${esc(p.title)}</b><br><span class="small">${p.questions.length} questions • ${esc(p.settings?.reasoningMinutes ?? 25)} + ${esc(p.settings?.quantMinutes ?? 20)} min</span></span>
        <span><button data-start="${p.id}">Start</button> <button class="danger" data-del="${p.id}">Delete</button></span></div>`).join('') : '<p class="small">No saved papers yet. Upload a CSV, PDF, or paste a paper.</p>'}
    </div>
    <div class="card"><h2>Past attempts (${attempts.length})</h2>
      ${attempts.length ? attempts.slice().reverse().slice(0,10).map(a => `<p><b>${esc(a.title)}</b> — Score ${a.score} / ${a.maxScore} • ${new Date(a.at).toLocaleString()}</p>`).join('') : '<p class="small">No attempts yet.</p>'}
    </div>
  </div>`;
  document.getElementById('sampleBtn').onclick = () => startExam(structuredClone(SAMPLE_PAPER));
  document.getElementById('uploadBtn').onclick = renderUpload;
  app.querySelectorAll('[data-start]').forEach(b => b.onclick = () => { const p = getPapers().find(x => x.id === b.dataset.start); if (p) startExam(structuredClone(p)); });
  app.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if (confirm('Delete this paper?')) { setPapers(getPapers().filter(x => x.id !== b.dataset.del)); renderHome(); } });
}

// ---------- UPLOAD ----------
function renderUpload() {
  view = 'upload';
  app.innerHTML = `
  <header class="top"><h1>Upload New Paper</h1><button class="secondary" id="back">← Home</button></header>
  <div class="wrap"><div class="card">
    <label>Paper title</label><input id="title" value="RRB PO Prelims Mock"/>
    <div class="grid">
      <div><label>Reasoning minutes (section 1)</label><input id="rmin" type="number" value="25"/></div>
      <div><label>Quant minutes (section 2)</label><input id="qmin" type="number" value="20"/></div>
      <div><label>Negative per wrong answer</label><input id="neg" type="number" step="0.05" value="0.25"/></div>
    </div>
    <p class="small">Sectional timing: for papers with fewer than 80 questions the same two timers are used as set here (split by section). Reasoning questions are section 1, Quant section 2 — timers are paper settings, documented here and on the exam screen.</p>
    <div class="tabs">
      <button data-tab="csv" class="active">1. CSV / Excel</button>
      <button data-tab="pdf">2. PDF</button>
      <button data-tab="paste">3. Paste Text</button>
      <button data-tab="manual">4. Manual</button>
    </div>
    <div id="tabBody"></div>
  </div></div>`;
  document.getElementById('back').onclick = renderHome;
  const body = document.getElementById('tabBody');
  const settings = () => ({ reasoningMinutes: +document.getElementById('rmin').value || 25, quantMinutes: +document.getElementById('qmin').value || 20, marksPerQuestion: 1, negative: parseFloat(document.getElementById('neg').value) || 0.25 });
  const title = () => document.getElementById('title').value.trim() || 'Untitled Paper';

  function tabCSV() {
    body.innerHTML = `<p class="small">Download the template, fill it in Excel/Google Sheets, save as CSV, then upload. Columns: Question, OptionA–E, Correct (A–E), Section, Direction.</p>
    <button class="secondary" id="dl">⬇ Download CSV Template</button>
    <label>Upload CSV file</label><input type="file" id="file" accept=".csv,text/csv"/>
    <div id="msg"></div>`;
    document.getElementById('dl').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: 'text/csv' })); a.download = 'rrb-po-template.csv'; a.click(); };
    document.getElementById('file').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const text = await f.text();
      const qs = csvToQuestions(text);
      if (qs.length < 1) { document.getElementById('msg').innerHTML = `<div class="error">No questions found in CSV. Check the header row matches the template.</div>`; return; }
      reviewData = { title: title(), questions: qs, settings: settings(), extractedText: '' };
      renderReview();
    };
  }
  function tabPDF() {
    body.innerHTML = `<p class="small">PDF is read in your browser (pdf.js). Two-column papers are read left column first, then right column; single-column papers are read line by line. Questions can be “1.” or “Q.1”, options “a)” or “(a)”. Answer keys headed “Answer with Explanation” (“1. Answer: C”) or an “Answer Key” table (“Q.1 (d)”) are matched by number.</p>
    <label>Upload PDF</label><input type="file" id="file" accept="application/pdf,.pdf"/><div id="msg"></div>`;
    document.getElementById('file').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const msg = document.getElementById('msg'); msg.innerHTML = 'Reading PDF…';
      try {
        const text = await extractPdfText(f);
        const parsed = parseBankText(text);
        reviewData = { title: title(), questions: parsed.questions, settings: settings(), extractedText: parsed.extractedText, error: parsed.questions.length < 5 ? `Only ${parsed.questions.length} question(s) could be auto-split from this PDF (need at least 5). The extracted text is shown below/in review — check the format (numbered questions, a)–e) options), try Paste with cleaned text, or use CSV/Manual. Nothing was saved.` : '' };
        renderReview();
      } catch (err) { msg.innerHTML = `<div class="error">PDF read failed: ${esc(err.message || err)}</div>`; }
    };
  }
  function tabPaste() {
    body.innerHTML = `<label>Paste the full paper text (including Directions and, if present, the Answer with Explanation section)</label>
    <textarea id="paste" placeholder="Directions (1-5): ... 1. Question... a) ... b) ..."></textarea>
    <button id="parseBtn">Parse Pasted Text</button>`;
    document.getElementById('parseBtn').onclick = () => {
      const text = document.getElementById('paste').value;
      const parsed = parseBankText(text);
      reviewData = { title: title(), questions: parsed.questions, settings: settings(), extractedText: parsed.extractedText, error: parsed.questions.length < 5 ? `Only ${parsed.questions.length} question(s) parsed. See extracted text below and fix the format, or add questions manually.` : '' };
      renderReview();
    };
  }
  function tabManual() {
    body.innerHTML = `<p class="small">Add questions one by one, then review.</p><div id="manualList"></div>
    <label>Direction / passage (optional)</label><input id="m_dir"/>
    <label>Question</label><textarea id="m_q" style="min-height:70px"></textarea>
    <div class="grid">${['A','B','C','D','E'].map(l => `<div><label>Option ${l}</label><input id="m_${l}"/></div>`).join('')}</div>
    <label>Correct (A–E)</label><input id="m_correct" maxlength="1" value="A"/>
    <label>Section</label><select id="m_sec"><option>Reasoning Ability</option><option>Quantitative Aptitude</option></select>
    <button id="addQ">Add Question</button> <button class="secondary" id="toReview">Review & Save</button>`;
    const qs = [];
    const list = () => { document.getElementById('manualList').innerHTML = qs.map((q,i)=>`<p>${i+1}. ${esc(q.text)} <b>[${esc(q.correct)}]</b></p>`).join(''); };
    document.getElementById('addQ').onclick = () => {
      const text = document.getElementById('m_q').value.trim(); if (!text) return alert('Enter a question');
      qs.push({ number: qs.length+1, text, options: { A: document.getElementById('m_A').value, B: document.getElementById('m_B').value, C: document.getElementById('m_C').value, D: document.getElementById('m_D').value, E: document.getElementById('m_E').value }, correct: document.getElementById('m_correct').value.toUpperCase(), section: document.getElementById('m_sec').value, direction: document.getElementById('m_dir').value });
      list(); document.getElementById('m_q').value='';
    };
    document.getElementById('toReview').onclick = () => { if (!qs.length) return alert('Add at least 1 question'); reviewData = { title: title(), questions: qs, settings: settings(), extractedText: '' }; renderReview(); };
  }
  const tabs = { csv: tabCSV, pdf: tabPDF, paste: tabPaste, manual: tabManual };
  app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { app.querySelectorAll('[data-tab]').forEach(x=>x.classList.remove('active')); b.classList.add('active'); tabs[b.dataset.tab](); });
  tabCSV();
}

async function extractPdfText(file) {
  const pdfjs = await import('pdfjs-dist');
  // Worker from CDN matching installed version approach: use bundled worker via ?url if available, fallback CDN
  try {
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  } catch { pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.mjs'; }
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  let all = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const items = tc.items.map(it => ({ str: it.str, x: it.transform[4], y: it.transform[5], width: it.width }));
    all += reconstructPageText(items, viewport.width) + '\n';
  }
  return stripHeadersFooters(all);
}

// ---------- REVIEW ----------
function renderReview() {
  view = 'review';
  const d = reviewData;
  app.innerHTML = `<header class="top"><h1>Review Paper</h1><button class="secondary" id="back">← Upload</button></header>
  <div class="wrap"><div class="card">
    <h2>${esc(d.title)}</h2>
    <p><b>${d.questions.length}</b> questions parsed • Answers matched: <b>${d.questions.filter(q=>q.correct).length}</b> • Reasoning: ${d.questions.filter(q=>/Reason/i.test(q.section)).length} • Quant: ${d.questions.filter(q=>/Quant/i.test(q.section)).length}</p>
    ${d.error ? `<div class="error">${esc(d.error)}</div>` : ''}
    ${d.extractedText ? `<details><summary>Extracted text (first part)</summary><pre class="extracted">${esc(d.extractedText.slice(0,6000))}</pre></details>` : ''}
    <label>Title</label><input id="rtitle" value="${esc(d.title)}"/>
    <div style="max-height:420px;overflow:auto">
    ${d.questions.map((q,i)=>`<div style="border-bottom:1px solid #eee;padding:8px 0">
      <b>Q${i+1} [${esc(q.section)}] Ans: ${esc(q.correct||'—')}</b>
      ${q.direction?`<div class="small">${esc(q.direction.slice(0,180))}…</div>`:''}
      <textarea data-qtext="${i}" style="min-height:50px">${esc(q.text)}</textarea>
      <div class="grid">${['A','B','C','D','E'].map(l=>`<input data-opt="${i}:${l}" value="${esc(q.options?.[l]||'')}"/>`).join('')}
      <select data-correct="${i}">${['','A','B','C','D','E'].map(l=>`<option ${q.correct===l?'selected':''} value="${l}">${l||'No answer'}</option>`).join('')}</select></div>
    </div>`).join('')}
    </div>
    <button id="savePaper" ${d.questions.length<1?'disabled':''}>Save Paper</button>
    <button class="secondary" id="startNow" ${d.questions.length<1?'disabled':''}>Save & Start Now</button>
  </div></div>`;
  document.getElementById('back').onclick = renderUpload;
  const collect = () => {
    d.title = document.getElementById('rtitle').value.trim() || d.title;
    d.questions.forEach((q,i)=>{
      q.text = app.querySelector(`[data-qtext="${i}"]`).value;
      ['A','B','C','D','E'].forEach(l=> q.options[l] = app.querySelector(`[data-opt="${i}:${l}"]`).value);
      q.correct = app.querySelector(`[data-correct="${i}"]`).value;
      q.number = i+1;
    });
  };
  document.getElementById('savePaper').onclick = () => { collect(); const paper = { id: uid(), title: d.title, questions: d.questions, settings: d.settings }; setPapers([...getPapers(), paper]); renderHome(); };
  document.getElementById('startNow').onclick = () => { collect(); const paper = { id: uid(), title: d.title, questions: d.questions, settings: d.settings }; setPapers([...getPapers(), paper]); startExam(structuredClone(paper)); };
}

// ---------- EXAM ----------
function sectionsOf(paper) {
  const secs = [];
  const r = paper.questions.filter(q => /reason/i.test(q.section));
  const q = paper.questions.filter(q => /quant/i.test(q.section));
  const other = paper.questions.filter(q => !/reason|quant/i.test(q.section));
  if (r.length) secs.push({ name: 'Reasoning Ability', minutes: paper.settings?.reasoningMinutes ?? 25, questions: r });
  if (q.length) secs.push({ name: 'Quantitative Aptitude', minutes: paper.settings?.quantMinutes ?? 20, questions: q });
  if (other.length) secs.push({ name: secs.length ? 'Other' : 'Full Paper', minutes: paper.settings?.reasoningMinutes ?? 25, questions: other });
  return secs;
}

function startExam(paper) {
  const secs = sectionsOf(paper);
  exam = {
    paper, secs, secIdx: 0,
    // global question index across sections in order
    flat: secs.flatMap((s, si) => s.questions.map(q => ({ q, si }))),
    answers: {}, // flatIdx -> letter
    state: {}, // flatIdx -> 'answered'|'notanswered'|'marked'|'ansmarked'|'notvisited'
    timeSpent: {}, // flatIdx -> seconds
    current: 0, // flatIdx within current section start
    sectionEndsAt: Date.now() + secs[0].minutes * 60 * 1000,
    sectionStartedAt: Date.now(),
    lastTick: Date.now(),
    timerId: null, finished: false
  };
  exam.flat.forEach((_, i) => { exam.state[i] = 'notvisited'; exam.timeSpent[i] = 0; });
  // current = first question of section 0
  exam.current = 0;
  renderExam();
  exam.timerId = setInterval(tick, 500);
}
function sectionRange(secIdx) {
  let start = 0; for (let i = 0; i < secIdx; i++) start += exam.secs[i].questions.length;
  return { start, end: start + exam.secs[secIdx].questions.length - 1 };
}
function tick() {
  if (!exam || exam.finished) return;
  const now = Date.now();
  const elapsed = (now - exam.lastTick) / 1000; exam.lastTick = now;
  exam.timeSpent[exam.current] = (exam.timeSpent[exam.current] || 0) + elapsed;
  const remain = exam.sectionEndsAt - now;
  const el = document.getElementById('timer');
  if (el) { const s = Math.max(0, Math.floor(remain/1000)); el.textContent = `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
  if (remain <= 0) nextSectionOrSubmit(true);
}
function markVisited(i) { if (exam.state[i] === 'notvisited') exam.state[i] = 'notanswered'; }
function renderExam() {
  const { start, end } = sectionRange(exam.secIdx);
  if (exam.current < start || exam.current > end) exam.current = start;
  markVisited(exam.current);
  const item = exam.flat[exam.current]; const q = item.q;
  const sec = exam.secs[exam.secIdx];
  app.innerHTML = `
  <header class="top"><h1>${esc(exam.paper.title)} ${exam.paper.isSample ? '• SAMPLE' : ''}</h1><span>Section timer: <span class="timer" id="timer">--:--</span></span></header>
  <div class="wrap">
    <p class="small"><b>Current section:</b> ${esc(sec.name)} (${sec.minutes} min, locked — no going back to previous sections, no time carry-over) • Other sections are locked/upcoming in the palette.</p>
    <div class="tabs">${exam.secs.map((s,i)=>`<button class="${i===exam.secIdx?'active':''}" disabled>${esc(s.name)} ${i<exam.secIdx?'🔒 locked':i>exam.secIdx?'• upcoming':''}</button>`).join('')}</div>
    <div class="exam-layout">
      <div class="card">
        ${q.direction ? `<div class="dir">${esc(q.direction)}</div>` : ''}
        <h3>Q${exam.current+1}. ${esc(q.text)}</h3>
        ${['A','B','C','D','E'].filter(l=> (q.options?.[l] ?? '') !== '' || l!=='E').map(l=>`<label class="opt"><input type="radio" name="opt" value="${l}" ${exam.answers[exam.current]===l?'checked':''}/> <b>${l})</b> ${esc(q.options?.[l]||'')}</label>`).join('')}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
          <button id="saveNext">Save & Next</button>
          <button class="warn" id="markNext">Mark for Review & Next</button>
          <button class="warn" id="saveMark">Save & Mark for Review</button>
          <button class="ghost" id="clear">Clear Response</button>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          ${exam.secIdx < exam.secs.length-1 ? `<button class="secondary" id="finishSec">Finish Section Early → Lock & Move Next</button>` : `<button class="danger" id="submitBtn">Submit Test</button>`}
        </div>
      </div>
      <div class="card">
        <h3>Question Palette</h3>
        <div class="legend">
          <span><span class="dot" style="background:#16a34a"></span>Answered</span>
          <span><span class="dot" style="background:#dc2626"></span>Not Answered</span>
          <span><span class="dot" style="background:#7c3aed"></span>Marked for Review</span>
          <span><span class="dot" style="background:#7c3aed;box-shadow:inset 0 -5px 0 #16a34a"></span>Answered & Marked</span>
          <span><span class="dot" style="background:#e5e7eb"></span>Not Visited</span>
        </div>
        <hr/>
        ${exam.secs.map((s, si) => { const r = sectionRange(si); return `<p class="small"><b>${esc(s.name)}</b></p><div class="palette">${Array.from({length: s.questions.length}, (_,k)=>{ const idx=r.start+k; const st=exam.state[idx]; const cls = st==='answered'?'p-answered':st==='notanswered'?'p-notanswered':st==='marked'?'p-marked':st==='ansmarked'?'p-ansmarked':'p-notvisited'; return `<button class="${cls} ${idx===exam.current?'current':''}" data-jump="${idx}" ${si!==exam.secIdx?'disabled':''}>${idx+1}</button>`; }).join('')}</div>`; }).join('')}
      </div>
    </div>
  </div>`;
  const selected = () => app.querySelector('input[name="opt"]:checked')?.value || '';
  const goNext = () => { const { end } = sectionRange(exam.secIdx); if (exam.current < end) { exam.current++; } renderExam(); };
  document.getElementById('saveNext').onclick = () => { const v = selected(); if (v) { exam.answers[exam.current]=v; exam.state[exam.current]='answered'; } else { delete exam.answers[exam.current]; if (exam.state[exam.current]==='answered') exam.state[exam.current]='notanswered'; } goNext(); };
  document.getElementById('markNext').onclick = () => { const v = selected(); if (v) { exam.answers[exam.current]=v; exam.state[exam.current]='ansmarked'; } else exam.state[exam.current]='marked'; goNext(); };
  document.getElementById('saveMark').onclick = () => { const v = selected(); if (v) { exam.answers[exam.current]=v; exam.state[exam.current]='ansmarked'; } else exam.state[exam.current]='marked'; renderExam(); };
  document.getElementById('clear').onclick = () => { delete exam.answers[exam.current]; exam.state[exam.current]='notanswered'; renderExam(); };
  app.querySelectorAll('[data-jump]').forEach(b => b.onclick = () => { exam.current = +b.dataset.jump; renderExam(); });
  const fs = document.getElementById('finishSec'); if (fs) fs.onclick = () => { if (confirm('Lock this section? You cannot go back and unused time will NOT carry over.')) nextSectionOrSubmit(false); };
  const sb = document.getElementById('submitBtn'); if (sb) sb.onclick = () => { if (confirm('Submit the test?')) submitExam(); };
}
function nextSectionOrSubmit(auto) {
  if (exam.secIdx < exam.secs.length - 1) {
    exam.secIdx++;
    exam.sectionEndsAt = Date.now() + exam.secs[exam.secIdx].minutes * 60 * 1000;
    exam.lastTick = Date.now();
    const { start } = sectionRange(exam.secIdx); exam.current = start;
    renderExam();
  } else submitExam();
}
function submitExam() {
  if (exam.finished) return; exam.finished = true; clearInterval(exam.timerId);
  const neg = exam.paper.settings?.negative ?? 0.25; const mpq = exam.paper.settings?.marksPerQuestion ?? 1;
  let score = 0; const perSec = {};
  const rows = exam.flat.map((item, i) => {
    const q = item.q; const ans = exam.answers[i] || '';
    const isCorrect = ans && q.correct && ans === q.correct;
    const isWrong = ans && q.correct && ans !== q.correct;
    if (isCorrect) score += mpq; else if (isWrong) score -= neg;
    const sname = q.section || exam.secs[item.si].name;
    perSec[sname] ??= { attempted: 0, correct: 0, wrong: 0, skipped: 0, score: 0, max: 0, time: 0 };
    perSec[sname].max += mpq; perSec[sname].time += exam.timeSpent[i] || 0;
    if (!ans) perSec[sname].skipped++; else { perSec[sname].attempted++; if (isCorrect) { perSec[sname].correct++; perSec[sname].score += mpq; } else if (isWrong) { perSec[sname].wrong++; perSec[sname].score -= neg; } }
    return { i, q, ans, isCorrect, isWrong, time: exam.timeSpent[i] || 0 };
  });
  const maxScore = exam.flat.length * mpq;
  lastResult = { title: exam.paper.title, score: Math.round(score*100)/100, maxScore, perSec, rows, at: Date.now() };
  const attempts = getAttempts(); attempts.push({ title: lastResult.title, score: lastResult.score, maxScore, at: lastResult.at }); save(LS_ATTEMPTS, attempts);
  renderResult();
}
function renderResult() {
  const r = lastResult;
  const slowest = [...r.rows].sort((a,b)=>b.time-a.time).slice(0,5);
  app.innerHTML = `<header class="top"><h1>Result — ${esc(r.title)}</h1><button class="secondary" id="homeBtn">← Home</button></header>
  <div class="wrap">
    <div class="card"><h2>Score: ${r.score} / ${r.maxScore}</h2></div>
    <div class="card"><h3>Section-wise Breakdown — RRB PO Prelims</h3>
      <table><tr><th>Section</th><th>Score</th><th>Attempted</th><th>Correct</th><th>Wrong</th><th>Skipped</th><th>Accuracy</th><th>Time</th></tr>
      ${Object.entries(r.perSec).map(([name,s])=>`<tr><td>${esc(name)}</td><td>${Math.round(s.score*100)/100} / ${s.max}</td><td>${s.attempted}</td><td>${s.correct}</td><td>${s.wrong}</td><td>${s.skipped}</td><td>${s.attempted?Math.round(s.correct/s.attempted*100):0}%</td><td>${Math.round(s.time)}s</td></tr>`).join('')}</table></div>
    <div class="card"><h3>Slowest Questions</h3>${slowest.map(x=>`<p>Q${x.i+1}: ${Math.round(x.time)}s — ${esc(x.q.text.slice(0,90))}…</p>`).join('')}</div>
    <div class="card"><h3>Full Review</h3>${r.rows.map(x=>`<div style="border-bottom:1px solid #eee;padding:8px 0"><b>Q${x.i+1} [${esc(x.q.section)}]</b> ${x.isCorrect?'✅ Correct':x.isWrong?'❌ Wrong':'⚪ Skipped'} • Your ans: ${esc(x.ans||'—')} • Correct: ${esc(x.q.correct||'—')} • ${Math.round(x.time)}s<br/>${esc(x.q.text)}<br/><span class="small">${['A','B','C','D','E'].map(l=>`${l}) ${esc(x.q.options?.[l]||'')}`).join(' &nbsp; ')}</span></div>`).join('')}</div>
  </div>`;
  document.getElementById('homeBtn').onclick = renderHome;
}

renderHome();
