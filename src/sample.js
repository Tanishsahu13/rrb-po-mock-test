// Original sample paper — 10 Reasoning + 10 Quant, written for this app.
const DIR = 'Directions (1-5): Seven people — P, Q, R, S, T, U and V — sit in a row facing north. Q sits second from the left end. Only two persons sit between Q and R. S sits immediately to the left of R. T sits at the extreme left end. P sits immediately to the right of Q. U sits immediately to the left of V.';
export const SAMPLE_PAPER = {
  id: 'sample-rrb-po',
  title: 'Sample — RRB PO Prelims (20 Questions)',
  isSample: true,
  settings: { reasoningMinutes: 10, quantMinutes: 8, marksPerQuestion: 1, negative: 0.25 },
  questions: [
    { number: 1, direction: DIR, text: 'Who sits at the extreme right end of the row?', options: { A: 'P', B: 'V', C: 'R', D: 'S', E: 'U' }, correct: 'B', section: 'Reasoning Ability' },
    { number: 2, direction: DIR, text: 'How many people sit between R and U?', options: { A: 'None', B: 'One', C: 'Two', D: 'Three', E: 'Four' }, correct: 'A', section: 'Reasoning Ability' },
    { number: 3, direction: DIR, text: 'Who sits immediately to the left of R?', options: { A: 'Q', B: 'S', C: 'P', D: 'T', E: 'V' }, correct: 'B', section: 'Reasoning Ability' },
    { number: 4, direction: DIR, text: 'What is the position of P from the right end?', options: { A: 'First', B: 'Second', C: 'Third', D: 'Fourth', E: 'Fifth' }, correct: 'E', section: 'Reasoning Ability' },
    { number: 5, direction: DIR, text: 'Who sits exactly in the middle of the row?', options: { A: 'Q', B: 'R', C: 'S', D: 'U', E: 'V' }, correct: 'C', section: 'Reasoning Ability' },
    { number: 6, direction: '', text: 'Statements: All pens are books. Some books are chairs. Conclusions: I. Some pens are chairs. II. Some chairs are books.', options: { A: 'Only I follows', B: 'Only II follows', C: 'Both follow', D: 'Neither follows', E: 'Either follows' }, correct: 'B', section: 'Reasoning Ability' },
    { number: 7, direction: '', text: 'If in a certain code, CAT is written as 3120, how is DOG written? (A=1, B=2, ...)', options: { A: '4157', B: '4158', C: '5147', D: '4167', E: '4156' }, correct: 'A', section: 'Reasoning Ability' },
    { number: 8, direction: '', text: 'Point A is 5 m north of point B. Point C is 5 m east of B. How far is A from C?', options: { A: '5 m', B: '10 m', C: '5√2 m', D: '7 m', E: '25 m' }, correct: 'C', section: 'Reasoning Ability' },
    { number: 9, direction: '', text: 'Which of the following expressions will be true if A > B ≥ C = D < E is given?', options: { A: 'A < C', B: 'D < A', C: 'E < B', D: 'C > E', E: 'A = D' }, correct: 'B', section: 'Reasoning Ability' },
    { number: 10, direction: '', text: 'Rahul is the brother of Priya. Priya is the daughter of Meena. How is Rahul related to Meena?', options: { A: 'Father', B: 'Son', C: 'Brother', D: 'Uncle', E: 'Nephew' }, correct: 'B', section: 'Reasoning Ability' },
    { number: 11, direction: '', text: 'What value should come in place of ?: 7, 14, 28, 56, ?', options: { A: '84', B: '96', C: '112', D: '120', E: '108' }, correct: 'C', section: 'Quantitative Aptitude' },
    { number: 12, direction: '', text: 'Simplify: 45% of 600 + 120 = ?', options: { A: '370', B: '390', C: '360', D: '380', E: '400' }, correct: 'B', section: 'Quantitative Aptitude' },
    { number: 13, direction: '', text: 'The average of 5 numbers is 24. If one number is removed, the average becomes 22. What is the removed number?', options: { A: '28', B: '30', C: '32', D: '34', E: '26' }, correct: 'C', section: 'Quantitative Aptitude' },
    { number: 14, direction: '', text: 'A train running at 60 km/h crosses a pole in 18 seconds. What is the length of the train?', options: { A: '250 m', B: '300 m', C: '350 m', D: '280 m', E: '320 m' }, correct: 'B', section: 'Quantitative Aptitude' },
    { number: 15, direction: '', text: 'If x² - 9x + 20 = 0 and y² - 7y + 12 = 0, what is the relation between x and y (taking maximum roots)?', options: { A: 'x > y', B: 'x < y', C: 'x = y', D: 'x ≥ y', E: 'Cannot be determined' }, correct: 'A', section: 'Quantitative Aptitude' },
    { number: 16, direction: '', text: 'A shopkeeper sells an article for ₹840 at a profit of 20%. What is its cost price?', options: { A: '₹672', B: '₹700', C: '₹720', D: '₹750', E: '₹680' }, correct: 'B', section: 'Quantitative Aptitude' },
    { number: 17, direction: '', text: 'Simple interest on ₹5,000 at 8% per annum for 3 years is:', options: { A: '₹1,000', B: '₹1,100', C: '₹1,200', D: '₹1,300', E: '₹1,400' }, correct: 'C', section: 'Quantitative Aptitude' },
    { number: 18, direction: '', text: 'What is  (3/5) of 250 + (2/5) of 250 ?', options: { A: '200', B: '225', C: '250', D: '275', E: '150' }, correct: 'C', section: 'Quantitative Aptitude' },
    { number: 19, direction: '', text: 'A and B together can finish a work in 12 days. A alone can finish it in 20 days. In how many days can B alone finish it?', options: { A: '25 days', B: '28 days', C: '30 days', D: '32 days', E: '36 days' }, correct: 'C', section: 'Quantitative Aptitude' },
    { number: 20, direction: '', text: 'Approximate value: 49.98% of 399.9 + 10.02 = ?', options: { A: '190', B: '200', C: '210', D: '220', E: '230' }, correct: 'C', section: 'Quantitative Aptitude' }
  ]
};
