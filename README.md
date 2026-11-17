# RRB PO Mock Test — Standalone (Vercel-ready)

Personal banking-exam mock test app. No backend, no Supabase, no AI tokens/keys.
All data (papers, attempts) is saved in the browser's **localStorage** on the device used.

## Tech
- Vite + vanilla JavaScript (ES modules)
- `pdfjs-dist` for in-browser PDF text extraction (with bundled worker)
- Builds to `dist/` with `npm run build`

## Run / Build
```bash
npm install
npm run dev      # local dev
npm run build    # outputs dist/
npm run preview  # preview the build
npm test         # node parser tests (synthetic Guidely-style paper)
```

## Deploy to Vercel (handled separately — not done by this build step)
1. Import this folder (`rrb-po-vercel/`) as a Vercel project, or run `vercel` in this folder.
2. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
3. No environment variables are required.
Note: because data lives in localStorage, papers saved on one browser/device do not sync to another.

## Features
- **Home:** saved papers, past attempts, sample paper, Upload New Paper.
- **Upload — CSV/Excel:** downloadable CSV template
  (`Question,OptionA,OptionB,OptionC,OptionD,OptionE,Correct,Section,Direction`).
  Fill it in Excel/Google Sheets, save as CSV, upload.
- **Upload — PDF:** column-aware extraction with pdf.js. Each page is split at
  mid-width; the left column is read top-to-bottom, then the right column.
  Guidely-style headers/footers are stripped. Supports 5 options a)–e)
  (inline or vertical), attaches `Directions (x-y):` passages to their
  questions, and parses a separate end answer key headed
  **“Answer with Explanation”** (`1. Answer: C`) mapped by question number.
  Sections by heading / number: Q1–40 Reasoning Ability, Q41–80 Quantitative Aptitude.
  A review/edit screen shows the parsed count before saving; if fewer than
  5 questions parse, the extracted text and a clear error are shown instead of a blank screen.
- **Upload — Paste / Manual:** paste full paper text (same parser) or add questions one by one.
- **Exam (RRB PO Prelims default):** Reasoning 40Q / 25 min, then Quant 40Q / 20 min,
  80Q / 80 marks, +1 / −0.25. **Sectional lock:** section timer, auto-advance on
  expiry or “Finish Section Early”, no going back, no time carry-over.
  For papers with fewer questions, the paper's own settings are used
  (defaults 25/20 min by section; sample uses short timers) — this is stated on the upload and exam screens.
  TCS iON style: one question at a time, A–E options, palette
  (green answered, red not answered, purple marked, purple+green answered & marked, grey not visited),
  Save & Next, Mark for Review & Next, Save & Mark, Clear Response,
  per-question time tracking, auto-submit at the end of the last section.
- **Results:** total score with negative marking, section-wise breakdown
  (score/40-style max, attempted, correct/wrong/skipped, accuracy, time per section),
  slowest questions, full review with correct answers.
- **Sample paper:** built-in original 20-question sample (10 Reasoning + 10 Quant)
  including a seating puzzle set (Directions 1–5, verified arrangement
  T-Q-P-S-R-U-V) using the same sectional flow with short timers, labelled Sample.

## Files
- `index.html` — entry
- `src/main.js` — app UI, exam engine, localStorage, PDF extraction wiring
- `src/parser.js` — pure, testable parsing logic (bank text, answer key, directions, column reconstruction, CSV)
- `src/sample.js` — built-in sample paper
- `src/style.css` — styles (mobile responsive)
- `test/parser.test.mjs` — node tests for the parser
