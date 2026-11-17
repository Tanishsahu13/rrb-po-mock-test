import { parseBankText, reconstructPageText, csvToQuestions } from '../src/parser.js';
import assert from 'node:assert';

// Synthetic Guidely-style text AFTER column reconstruction (left column then right column per page),
// including headers/footers, a Directions block, 5 options inline + vertical, and end answer key.
const synthetic = `
RRB PO Prelims 2025 Memory Based Paper (Based on 22nd Nov 2025)
Click Here for PDF Course Subscription Click Here to Subscribe Our Yearly Mock Test Package
If there are any suggestions / errors in this PDF contact us via this email: support@guidely.in 1
Reasoning Ability
Directions (1-2): Study the following information carefully and answer the below questions. Five persons A, B, C, D and E sit in a row. A sits at the left end. B sits next to A.
1. Who sits at the left end?
a) A b) B c) C d) D e) E
2. Who sits next to A?
a) E
b) D
c) B
d) C
e) None of these
3. Statements: All cats are animals. Conclusions: I. Some animals are cats.
a) Only I follows b) Only II follows c) Both follow d) Neither follows e) Either follows
Quantitative Aptitude
41. What is 25% of 400?
a) 50 b) 75 c) 100 d) 125 e) 150
42. What is the next number: 2, 4, 8, 16, ?
a) 20 b) 24 c) 28 d) 32 e) 36

Answer with Explanation
1. Answer: A
2. Answer: C
3. Answer: A
41. Answer: C
42. Answer: D
`;

const result = parseBankText(synthetic);
console.log('Parsed questions:', result.questions.length);
console.log('Answers matched:', result.answersMatched);
console.log('Directions found:', result.directionsFound);
for (const q of result.questions) console.log(` Q${q.number} [${q.section}] correct=${q.correct} opts=${Object.values(q.options).filter(Boolean).length} dir=${q.direction ? 'yes' : 'no'} :: ${q.text.slice(0,50)}`);

assert.strictEqual(result.questions.length, 5, 'expected 5 questions');
assert.strictEqual(result.answersMatched, 5, 'expected 5 answers matched');
assert.ok(result.questions.every(q => q.options.E), 'every question should have option E');
assert.strictEqual(result.questions[0].correct, 'A');
assert.strictEqual(result.questions[1].correct, 'C');
assert.strictEqual(result.questions[3].section, 'Quantitative Aptitude');
assert.strictEqual(result.questions[3].correct, 'C');
assert.ok(result.questions[0].direction.includes('Five persons'), 'direction attached to Q1');
assert.ok(result.questions[1].direction.includes('Five persons'), 'direction attached to Q2');

// Column reconstruction test: items with x/y — left column items x<mid, right x>=mid.
// pdf.js coords: y increases upward, so higher y = earlier line.
const items = [
  { str: 'Right1', x: 320, y: 700 }, { str: 'Left1', x: 20, y: 700 },
  { str: 'Right2', x: 320, y: 680 }, { str: 'Left2', x: 20, y: 680 }
];
const rec = reconstructPageText(items, 595);
console.log('Reconstructed page text:\n' + rec);
assert.ok(rec.indexOf('Left1') < rec.indexOf('Left2'), 'left column top-to-bottom');
assert.ok(rec.indexOf('Left2') < rec.indexOf('Right1'), 'left column fully before right column');

// CSV test
const csvQs = csvToQuestions('Question,OptionA,OptionB,OptionC,OptionD,OptionE,Correct,Section,Direction\n"2+2=?",1,2,3,4,5,D,Quantitative Aptitude,\n');
assert.strictEqual(csvQs.length, 1); assert.strictEqual(csvQs[0].correct, 'D'); assert.strictEqual(csvQs[0].options.E, '5');
console.log('CSV parsed:', csvQs.length);

console.log('ALL PARSER TESTS PASSED');
