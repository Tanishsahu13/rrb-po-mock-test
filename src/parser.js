// Pure parser logic — no DOM dependencies, testable in Node.
// Handles Guidely-style banking papers: 2-column reconstructed text,
// 5 options a)-e), Directions (x-y) blocks, separate answer key.

export function stripHeadersFooters(text) {
  const lines = String(text || '').split(/\r?\n/);
  const kept = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (/click here for pdf course subscription/i.test(line)) continue;
    if (/click here to subscribe/i.test(line)) continue;
    if (/support@guidely\.in/i.test(line)) continue;
    if (/click here for bank exam free pdf/i.test(line)) continue;
    if (/click here for .* free pdf/i.test(line)) continue;
    // paper title line repeated on every page
    if (/^RRB PO Prelims \d{4} Memory Based Paper/i.test(line)) continue;
    // standalone page number (1-2 digits alone on a line)
    if (/^\d{1,2}$/.test(line)) continue;
    kept.push(raw);
  }
  return kept.join('\n');
}

export function extractAnswerKey(text) {
  const map = {};
  // lines like "1. Answer: C" or "12. Answer: E (explanation...)"
  const re = /(\d{1,3})\.\s*Answer\s*:\s*([A-E])\b/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    map[parseInt(m[1], 10)] = m[2].toUpperCase();
  }
  return map;
}

export function splitAnswerSection(text) {
  const idx = text.search(/Answer with Explanation/i);
  if (idx === -1) return { body: text, answersText: '' };
  return { body: text.slice(0, idx), answersText: text.slice(idx) };
}

// Extract Directions blocks. Returns [{from,to,text}]
export function extractDirections(body) {
  const dirs = [];
  const re = /Directions\s*\(\s*(\d+)\s*-\s*(\d+)\s*\)\s*:?/gi;
  const matches = [...body.matchAll(re)];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i][0].length;
    // direction text runs until the first question number that starts its range,
    // approximated as: up to the occurrence of "\n<from>. " or next Directions
    const from = parseInt(matches[i][1], 10);
    const to = parseInt(matches[i][2], 10);
    const nextDir = i + 1 < matches.length ? matches[i + 1].index : body.length;
    // Find first question start inside this window
    const qRe = new RegExp(`(^|\\n)\\s*${from}\\.\\s+`);
    const slice = body.slice(start, nextDir);
    const qm = slice.match(qRe);
    const dirText = (qm ? slice.slice(0, qm.index) : slice).replace(/\s+/g, ' ').trim();
    if (dirText) dirs.push({ from, to, text: dirText });
  }
  return dirs;
}

export function sectionForNumber(num, headings, pos) {
  // headings: [{name, pos}] in body order
  if (headings && headings.length && typeof pos === 'number') {
    let current = headings[0].name;
    for (const h of headings) if (pos >= h.pos) current = h.name;
    return current;
  }
  return num <= 40 ? 'Reasoning Ability' : 'Quantitative Aptitude';
}

export function parseBankText(rawText) {
  const cleaned = stripHeadersFooters(rawText);
  const { body, answersText } = splitAnswerSection(cleaned);
  const answers = extractAnswerKey(answersText || cleaned);
  // If answers were embedded at end without heading, also scan whole text as fallback
  // (extractAnswerKey on answersText already covers headed case)

  const directions = extractDirections(body);

  // Section headings positions
  const headings = [];
  const hRe = /(Reasoning Ability|Quantitative Aptitude|Numerical Ability)/gi;
  let hm;
  while ((hm = hRe.exec(body)) !== null) {
    const name = /quant|numerical/i.test(hm[1]) ? 'Quantitative Aptitude' : 'Reasoning Ability';
    if (!headings.length || headings[headings.length - 1].name !== name) headings.push({ name, pos: hm.index });
  }

  // Split into question chunks by leading number "N. "
  const qStartRe = /(^|\n)\s*(\d{1,3})\.\s+/g;
  const starts = [];
  let qm;
  while ((qm = qStartRe.exec(body)) !== null) {
    starts.push({ num: parseInt(qm[2], 10), index: qm.index + qm[1].length, contentStart: qm.index + qm[0].length });
  }
  // Keep only sequential plausible questions: numbers should be increasing, allow restarts filtered
  const filtered = [];
  let last = 0;
  for (const s of starts) {
    // Accept strictly increasing question numbers (allows section jumps, e.g. 40 -> 41,
    // and sparse synthetic sets). False positives are filtered later by splitOptions,
    // which requires at least 4 options starting at A.
    if (s.num > last && s.num <= 200) {
      filtered.push(s); last = s.num;
    }
  }

  const questions = [];
  for (let i = 0; i < filtered.length; i++) {
    const s = filtered[i];
    const end = i + 1 < filtered.length ? filtered[i + 1].index : body.length;
    const chunk = body.slice(s.contentStart, end).trim();
    const parsed = splitOptions(chunk);
    if (!parsed) continue;
    const dir = directions.find(d => s.num >= d.from && s.num <= d.to);
    questions.push({
      number: s.num,
      text: parsed.text,
      options: parsed.options, // {A,B,C,D,E}
      correct: answers[s.num] || parsed.correct || '',
      section: sectionForNumber(s.num, headings, s.index),
      direction: dir ? dir.text : ''
    });
  }
  const matched = questions.filter(q => q.correct).length;
  return { questions, answersMatched: matched, directionsFound: directions.length, extractedText: cleaned };
}

export function splitOptions(chunk) {
  // Find option markers a) b) c) d) e)
  const optRe = /(^|\s)([a-e])\)\s*/g;
  const marks = [];
  let m;
  while ((m = optRe.exec(chunk)) !== null) {
    marks.push({ letter: m[2].toUpperCase(), index: m.index + m[1].length, contentStart: m.index + m[0].length });
  }
  // Need at least 4 distinct sequential options starting at A
  const letters = marks.map(x => x.letter);
  if (marks.length < 4 || letters[0] !== 'A') return null;
  // Dedupe keep first occurrence sequence A..E in order
  const ordered = [];
  let expect = 'A';
  for (const mk of marks) {
    if (mk.letter === expect) { ordered.push(mk); expect = String.fromCharCode(expect.charCodeAt(0) + 1); if (expect > 'E') break; }
  }
  if (ordered.length < 4) return null;
  const text = chunk.slice(0, ordered[0].index).replace(/\s+/g, ' ').trim();
  if (!text) return null;
  const options = { A: '', B: '', C: '', D: '', E: '' };
  for (let i = 0; i < ordered.length; i++) {
    const st = ordered[i].contentStart;
    const en = i + 1 < ordered.length ? ordered[i + 1].index : chunk.length;
    options[ordered[i].letter] = chunk.slice(st, en).replace(/\s+/g, ' ').trim();
  }
  return { text, options, correct: '' };
}

// ---- Column-aware reconstruction from pdf.js text items ----
// items: [{str, x, y, width}] per page, pageWidth number.
// Returns text reading left column top-to-bottom, then right column.
// pdf.js y origin is bottom; we sort by y descending within column, grouping by line (y tolerance).
export function reconstructPageText(items, pageWidth) {
  const mid = pageWidth / 2;
  const left = items.filter(it => it.x < mid);
  const right = items.filter(it => it.x >= mid);
  const colText = (col) => {
    // group by line: round y to nearest 3
    const sorted = [...col].sort((a, b) => (b.y - a.y) || (a.x - b.x));
    const lines = [];
    let cur = null;
    for (const it of sorted) {
      if (!cur || Math.abs(cur.y - it.y) > 3) { cur = { y: it.y, parts: [] }; lines.push(cur); }
      cur.parts.push(it);
    }
    return lines.map(l => l.parts.sort((a,b)=>a.x-b.x).map(p=>p.str).join(' ').trim()).filter(Boolean).join('\n');
  };
  return [colText(left), colText(right)].filter(Boolean).join('\n');
}

// ---- CSV ----
export function parseCSV(text) {
  const rows = [];
  let row = [], cur = '', inQ = false;
  const s = String(text || '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === '"') { if (s[i+1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(cell => String(cell).trim() !== ''));
}

export function csvToQuestions(text) {
  const rows = parseCSV(text);
  if (!rows.length) return [];
  const header = rows[0].map(h => h.trim().toLowerCase());
  const idx = (name) => header.indexOf(name);
  const qi = idx('question'), ai = idx('optiona'), bi = idx('optionb'), ci = idx('optionc'), di = idx('optiond'), ei = idx('optione'), corr = idx('correct'), sec = idx('section'), dir = idx('direction');
  const out = [];
  rows.slice(1).forEach((r, i) => {
    const q = (r[qi] || '').trim(); if (!q) return;
    let correct = corr >= 0 ? String(r[corr] || '').trim().toUpperCase() : '';
    if (/^[1-5]$/.test(correct)) correct = 'ABCDE'[parseInt(correct,10)-1];
    out.push({
      number: i + 1,
      text: q,
      options: { A: (r[ai]||'').trim(), B: (r[bi]||'').trim(), C: (r[ci]||'').trim(), D: (r[di]||'').trim(), E: ei>=0 ? (r[ei]||'').trim() : '' },
      correct,
      section: sec >= 0 && r[sec] ? r[sec].trim() : (i < 40 ? 'Reasoning Ability' : 'Quantitative Aptitude'),
      direction: dir >= 0 ? (r[dir]||'').trim() : ''
    });
  });
  return out;
}

export const CSV_TEMPLATE = 'Question,OptionA,OptionB,OptionC,OptionD,OptionE,Correct,Section,Direction\n"Example: What is 12 + 8?",15,18,20,22,25,C,Quantitative Aptitude,\n"Example: If A is brother of B, how is A related to B?",Sister,Brother,Mother,Father,Uncle,B,Reasoning Ability,\n';
