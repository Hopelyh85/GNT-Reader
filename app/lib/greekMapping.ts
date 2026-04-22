export const fallbackFixer: Record<string, string> = {
  // 1. Critical Irregular Verbs (Suppletion & 2nd Aorist)
  'παθεῖν': 'πάσχω', 'ἔπαθεν': 'πάσχω', 'παθών': 'πάσχω',
  'μαθεῖν': 'μανθάνω', 'ἔμαθον': 'μανθάνω',
  'λαβεῖν': 'λαμβάνω', 'ἔλαβον': 'λαμβάνω', 'λαβών': 'λαμβάνω',
  'ἰδεῖν': 'ὁράω', 'εἶδον': 'ὁράω', 'ἰδών': 'ὁράω',
  'ἐλθεῖν': 'ἔρχομαι', 'ἦλθον': 'ἔρχομαι', 'ἐλθών': 'ἔρχομαι',
  'εἶπον': 'λέγω', 'εἰπεῖν': 'λέγω', 'εἰπών': 'λέγω',
  'ἤνεγκον': 'φέρω', 'ἐνέγκαι': 'φέρω', 'οἴσω': 'φέρω',
  'ἀγαγεῖν': 'ἄγω', 'ἤγαγον': 'ἄγω',
  'φαγεῖν': 'ἐσθίω', 'ἔφαγον': 'ἐσθίω',
  'ἤλθαμεν': 'ἔρχομαι', 'εἴδαν': 'ὁράω',

  // 2. Crasis & Elision (Mixed words)
  'κἀγώ': 'καὶ ἐγώ', 'κἀμέ': 'καὶ ἐγώ', 'κἀμοί': 'καὶ ἐγώ',
  'τοὐναντίον': 'τὸ ἐναντίον', 'τἀνδρός': 'τοῦ ἀνδρός',
  "ἀπ'": "ἀπό", "ἀφ'": "ἀπό", "ἐπ'": "ἐπί", "ἐφ'": "ἐπί",
  "μετ'": "μετά", "μεθ'": "μετά", "δι'": "διά", "ἀλλ'": "ἀλλά",

  // 3. Irregular Pronouns & Quantifiers
  'μου': 'ἐγώ', 'μοι': 'ἐγώ', 'με': 'ἐγώ', 'ἡμᾶς': 'ἐγώ',
  'σου': 'σύ', 'σοι': 'σύ', 'σε': 'σύ', 'ὑμῶν': 'σύ', 'ὑμῖν': 'σύ',
  'αὕτη': 'οὗτος', 'ταῦτα': 'οὗτος', 'τούτους': 'οὗτος',
  'τίνος': 'τίς', 'τίνι': 'τίς', 'τινός': 'τις',
  'πᾶσα': 'πᾶς', 'πάντα': 'πᾶς', 'πολλοί': 'πολύς',

  // 4. Proper Names & Specific SBLGNT Corrections
  'Ἰεχονίαν': 'Ἰεχονίας', 'Μανασσῆ': 'Μανασσῆς', 'βασιλέα': 'βασιλεύς',
  'βοός': 'βοῦς', 'βόες': 'βοῦς', 'βόας': 'βοῦς',
  'λόγον': 'λόγος', 'ἀποστόλοις': 'ἀπόστολος', 'ἀδελφοὺς': 'ἀδελφός',
  'μέν': 'μέν', 'Ἰσραηλίτης': 'Ἰσραηλίτης',

  // 5. Basic Noun & Verb Inflections (Director's critical additions)
  'ἡμέρας': 'ἡμέρα',        // day (gen. sing)
  'ἐντειλάμενος': 'ἐντέλλομαι', // commanded (participle)
  'ἐποιησάμην': 'ποιέω',     // I made (aorist middle)
  'πνεύματος': 'πνεῦμα',      // spirit (gen. sing)
  'πνεύματι': 'πνεῦμα',       // spirit (dat. sing)
  'ὕδατι': 'ὕδωρ',           // water (dat. sing)
  'ἐβάπτισεν': 'βαπτίζω',     // baptized (3rd sing aorist)
  'ἐβάπτισε': 'βαπτίζω',      // baptized (3rd sing aorist variant)
  'ἐβάπτισα': 'βαπτίζω',      // I baptized
  'ἐβαπτίσθην': 'βαπτίζω',    // I was baptized (passive)
  'ποιήσω': 'ποιέω',          // I will make
  'ποιήσεις': 'ποιέω',        // you will make
  'ποιήσει': 'ποιέω',         // he/she will make
};

export function getSmartLemma(text: string): string {
  let d = text.replace(/[.,;··⸀⸁⸂⸃⸄⸅\(\)\[\]\{\}\s\-0-9]/g, "").trim();
  const dLower = d.toLowerCase();
  if (fallbackFixer[d]) return fallbackFixer[d];
  if (fallbackFixer[dLower]) return fallbackFixer[dLower];

  // 3rd declension neuter nouns: -ματος/-ματι -> -μα (πνεῦμα pattern)
  if (d.endsWith('ματος')) return d.slice(0, -5) + 'μα'; // πνεύματος -> πνεῦμα
  if (d.endsWith('ματι')) return d.slice(0, -4) + 'μα';  // πνεύματι -> πνεῦμα
  if (d.endsWith('ματα')) return d.slice(0, -4) + 'μα';  // πνεύματα -> πνεῦμα
  if (d.endsWith('ματων')) return d.slice(0, -5) + 'μα'; // πνευμάτων -> πνεῦμα
  if (d.endsWith('μασι')) return d.slice(0, -4) + 'μα';   // πνεύμασι -> πνεῦμα
  if (d.endsWith('μασιν')) return d.slice(0, -5) + 'μα'; // πνεύμασιν -> πνεῦμα

  // 3rd declension neuter in -ος/-ους: ὕδωρ pattern
  if (d.endsWith('δατος')) return d.slice(0, -5) + 'δωρ';  // ὕδατος -> ὕδωρ
  if (d.endsWith('δατι')) return d.slice(0, -4) + 'δωρ';   // ὕδατι -> ὕδωρ
  if (d.endsWith('δατα')) return d.slice(0, -4) + 'δωρ';   // ὕδατα -> ὕδωρ

  // 2nd declension patterns
  if (d.endsWith('ους') || d.endsWith('οις') || d.endsWith('ου') || d.endsWith('ον')) {
    return d.replace(/(ους|οις|ου|ον)$/, 'ος');
  }
  if (d.endsWith('ων')) return d.slice(0, -2) + 'ω';
  return d;
}
