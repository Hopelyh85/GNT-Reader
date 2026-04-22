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
  'μέν': 'μέν', 'Ἰσραηλίτης': 'Ἰσραηλίτης'
};

export function getSmartLemma(text: string): string {
  // Clean Greek symbols but preserve apostrophes for elision
  let d = text.replace(/[.,;··⸀⸁⸂⸃⸄⸅\(\)\[\]\{\}\s\-0-9]/g, "").trim();
  const dLower = d.toLowerCase();

  if (fallbackFixer[d]) return fallbackFixer[d];
  if (fallbackFixer[dLower]) return fallbackFixer[dLower];

  // Core suffix rules
  if (d.endsWith('ους') || d.endsWith('οις') || d.endsWith('ου') || d.endsWith('ον')) {
    return d.replace(/(ους|οις|ου|ον)$/, 'ος');
  }
  if (d.endsWith('ων')) return d.slice(0, -2) + 'ω';

  return d;
}

// Helper function to clean symbols before lookup
export const cleanSymbols = (text: string): string => {
  // AGGRESSIVE cleaning - remove ALL non-Greek alphabetic characters except accents and apostrophes (for elision)
  return text.replace(/[.,;··⸀⸁⸂⸃⸄⸅\(\)\[\]\{\}\s\-0-9]/g, '').trim();
};

// Comprehensive lexicon lookup with fallback chain
export const getWordDefinition = (
  lexicon: Record<string, any>,
  lemma: string,
  surfaceForm: string
): { entry: any | null; cleanedLemma: string; searchKey: string } => {
  // 1. Clean symbols (preserve apostrophes for elision)
  const cleanedLemma = cleanSymbols(lemma);
  const cleanedSurface = cleanSymbols(surfaceForm);

  // 2. Check fallbackFixer with cleaned text (case-insensitive)
  const surfaceLower = cleanedSurface.toLowerCase();
  const lemmaLower = cleanedLemma.toLowerCase();
  const searchKey =
    fallbackFixer[cleanedSurface] ||
    fallbackFixer[cleanedLemma] ||
    fallbackFixer[surfaceLower] ||
    fallbackFixer[lemmaLower] ||
    cleanedLemma ||
    cleanedSurface;

  // 3. Try accent-stripped as last resort
  const stripped = cleanedSurface
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  // 4. Lookup chain
  const entry =
    lexicon[searchKey] ||
    lexicon[cleanedSurface] ||
    lexicon[stripped] ||
    null;

  return { entry, cleanedLemma: entry?.lemma || searchKey, searchKey };
};

export default fallbackFixer;
