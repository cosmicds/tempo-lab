// list of stop words to not upper case
const STOP_WORDS = [
  'A', 'An', 'The', 
  'And', 'But', 'Or', 'Nor', 
  'For', 'So', 'Yet', 
  'At', 'By', 'In', 'Of', 'On', 'To', 'Up',
];

export function pascalToSnake(s: string): string {
  if (s.length == 0) return s;
  let out = s[0].toUpperCase();
  for (const c of s.slice(1)) {
    out += (!isNaN(+c) || c == c.toLowerCase()) ? c : ` ${c}`;
  }
  // un-capitalize stop words
  out = out.replace(/\b\w+\b/g, (word) => {
    if (STOP_WORDS.includes(word)) {
      return word.toLowerCase();
    }
    return word;
  });
  return out;
}