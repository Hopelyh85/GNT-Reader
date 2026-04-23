export const fallbackFixer: Record<string, string> = {
  // 1. Matthew 1 & Gospel Vocabulary
  'γενέσεως': 'γένεσις',
  'Δαυίδ': 'Δαυίδ', 'Δαυὶδ': 'Δαυίδ',
  'Βόες': 'Βόες',
  'αὐτήν': 'αὐτός', 'αὐτὴν': 'αὐτός', 'αὐτῇ': 'αὐτός',
  'σεληνιαζομένους': 'σεληνιάζομαι',
  'πολλοί': 'πολύς', 'πολλά': 'πολύς',
  'παρέδοσαν': 'παραδίδωμι', 'παρέδωκεν': 'παραδίδωμι',
  'Ἰεχονίαν': 'Ἰεχονίας', 'Μανασσῆ': 'Μανασσῆς',
  'μετοικεσίαν': 'μετοικεσία', 'πληρωθῇ': 'πληρόω',

  // 2. Irregular Verbs
  'παθεῖν': 'πάσχω', 'ἔπαθεν': 'πάσχω', 'μαθεῖν': 'μανθάνω', 'ἔμαθον': 'μανθάνω',
  'λαβεῖν': 'λαμβάνω', 'ἔλαβον': 'λαμβάνω', 'ἰδεῖν': 'ὁράω', 'εἶδον': 'ὁράω',
  'ἐλθεῖν': 'ἔρχομαι', 'ἦλθον': 'ἔρχομαι', 'εἰπεῖν': 'λέγω', 'εἶπον': 'λέγω',
  'γέγονεν': 'γίνομαι', 'ἐγένετο': 'γίνομαι', 'ἐβεβαιώθη': 'βεβαιόω',
  'ἐβάπτισεν': 'βαπτίζω', 'ἐντειλάμενος': 'ἐντέλλομαι', 'ἐποιησάμην': 'ποιέω',
  'ἐγέννησεν': 'γεννάω', 'ἐποίησεν': 'ποιέω', 'ἐγίνωσκεν': 'γινώσκω', 'ἔτεκεν': 'τίκτω',

  // 3. Core Terms & Pronouns
  'πατρός': 'πατήρ', 'θεοῦ': 'θεός', 'Χριστοῦ': 'Χριστός', 'πνεύματος': 'πνεῦμα',
  'ἡμέρας': 'ἡμέρα', 'ὕδατι': 'ὕδωρ', 'λόγον': 'λόγος',
  'μου': 'ἐγώ', 'μοι': 'ἐγώ', 'με': 'ἐγώ', 'σου': 'σύ', 'σοί': 'σύ', 'σε': 'σύ',
  'αὕτη': 'οὗτος', 'ταῦτα': 'οὗτος', 'πᾶσαι': 'πᾶς', 'τόν': 'ὁ', 'οὕτως': 'οὕτω',
  "ἀπ'": "ἀπό", "ἀφ'": "ἀπό", "ἐπ'": "ἐπί", "μετ'": "μετά", "δι'": "διά", "ἀλλ'": "ἀλλά",

  // 5. Numbers
  'εἷς': 'εἷς', 'μίαν': 'εἷς', 'ἑνός': 'εἷς', 'ἑνί': 'εἷς',
  'δύο': 'δύο', 'τρεῖς': 'τρεῖς', 'τρία': 'τρεῖς',
  'τέσσαρες': 'τέσσαρες', 'τέσσαρα': 'τέσσαρες',
  'δώδεκα': 'δώδεκα', 'δεκατέσσαρες': 'δεκατέσσαρες',

  // 6. Major Personal Names
  'Ἀβραάμ': 'Ἀβραάμ', 'Ἀβραὰμ': 'Ἀβραάμ',
  'Ἰσαάκ': 'Ἰσαάκ', 'Ἰσαὰκ': 'Ἰσαάκ',
  'Ἰακώβ': 'Ἰακώβ', 'Ἰακὼβ': 'Ἰακώβ',
  'Ἰούδαν': 'Ἰούδας', 'Ἰούδας': 'Ἰούδας',
  'Ἰωσήφ': 'Ἰωσήφ', 'Ἰωσὴφ': 'Ἰωσήφ',
  'Μαρίας': 'Μαρία', 'Μαρίαν': 'Μαρία', 'Μαριάμ': 'Μαριάμ',
  'Ἰησοῦς': 'Ἰησοῦς', 'Ἰησοῦ': 'Ἰησοῦς', 'Ἰησοῦν': 'Ἰησοῦς',
  'Πέτρος': 'Πέτρος', 'Πέτρου': 'Πέτρος', 'Πέτρον': 'Πέτρος',
  'Ἰωάννης': 'Ἰωάννης', 'Ἰωάννου': 'Ἰωάννης', 'Ἰωάννην': 'Ἰωάννης',

  // 7. Major Place Names
  'Ἱεροσόλυμα': 'Ἱεροσόλυμα', 'Ἱεροσολύμοις': 'Ἱεροσόλυμα',
  'Ιερουσαλήμ': 'Ιερουσαλήμ',
  'Γαλιλαίας': 'Γαλιλαία', 'Γαλιλαίαν': 'Γαλιλαία',
  'Ναζαρέτ': 'Ναζαρέτ',

  // 8. Complex Gospel Verbs & Nouns
  'ἀγραυλοῦντες': 'ἀγραυλέω',
  'ἐπεχείρησαν': 'ἐπιχειρέω',
  'ἐγνώρισεν': 'γνωρίζω',
  'γέγραπται': 'γράφω',
  'εἰρημένον': 'λέγω',
  'ἡμέραις': 'ἡμέρα'
};

export function getSmartLemma(text: string): string {
  let d = text.replace(/[.,;··⸀⸁⸂⸃⸄⸅\(\)\[\]\{\}\s\-0-9]/g, "").trim();
  const dLower = d.toLowerCase();
  if (fallbackFixer[d]) return fallbackFixer[d];
  if (fallbackFixer[dLower]) return fallbackFixer[dLower];

  // Logic for standard endings
  if (d.endsWith('ματος') || d.endsWith('ματι')) return d.replace(/(ματος|ματι)$/, 'μα');
  if (d.endsWith('ου') || d.endsWith('ῳ') || d.endsWith('ον') || d.endsWith('οις') || d.endsWith('ους') || d.endsWith('ων') || d.endsWith('ην') || d.endsWith('την') || d.endsWith('αις')) {
    return d.replace(/(ου|ῳ|ον|οις|ους|ων|ην|την|αις)$/, 'os').replace('os', 'ος');
  }
  return d;
}

// Supabase Database Query Function for Lemma Lookup
// This queries the greek_morphology table for more accurate results
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient && supabaseUrl && supabaseKey) {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}

// Helper function to remove Greek accents for accent-insensitive search
function removeGreekAccents(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Remove combining diacritics
    .replace(/[᾿῾]/g, '')              // Remove breathing marks
    .normalize('NFC');
}

export async function getLemmaFromDatabase(text: string): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) {
    console.warn('Supabase client not initialized, falling back to local mapping');
    return null;
  }

  // ENHANCED: More thorough cleaning - remove ALL punctuation and critical symbols
  let d = text
    .replace(/[.,;··⸀⸁⸂⸃⸄⸅\(\)\[\]\{\}\s\-—–0-9]/g, "")  // punctuation, spaces, numbers
    .replace(/[\u00AD\u200B-\u200F\uFEFF]/g, "")  // invisible chars (soft hyphen, zero-width, BOM)
    .trim();
  
  const dNoAccent = removeGreekAccents(d);
  const dLower = d.toLowerCase();

  // DEBUG: Log search start
  console.log(`[LemmaSearch] Searching for: "${text}" -> cleaned: "${d}" -> noAccent: "${dNoAccent}"`);

  try {
    // 1. Query exact word match
    console.log(`[LemmaSearch] Step 1: Exact word match for "${d}"`);
    const { data, error } = await client
      .from('greek_morphology')
      .select('lemma')
      .eq('word', d)
      .limit(1);

    if (error) {
      console.error('[LemmaSearch] Step 1 Error:', error);
    } else if (data && data.length > 0 && data[0]) {
      const foundLemma = (data[0] as { lemma: string }).lemma;
      console.log(`[LemmaSearch] ✅ Step 1 SUCCESS: lemma = "${foundLemma}"`);
      return foundLemma;
    } else {
      console.log(`[LemmaSearch] Step 1: No exact match`);
    }

    // 2. Try normalized form if exact word not found
    console.log(`[LemmaSearch] Step 2: Normalized match for "${d}"`);
    const { data: normalizedData, error: normalizedError } = await client
      .from('greek_morphology')
      .select('lemma')
      .eq('normalized', d)
      .limit(1);

    if (!normalizedError && normalizedData && normalizedData.length > 0 && normalizedData[0]) {
      const foundLemma = (normalizedData[0] as { lemma: string }).lemma;
      console.log(`[LemmaSearch] ✅ Step 2 SUCCESS: lemma = "${foundLemma}"`);
      return foundLemma;
    } else {
      console.log(`[LemmaSearch] Step 2: No normalized match`);
    }

    // 3. Accent-insensitive search on word (using ilike with accent-stripped text)
    console.log(`[LemmaSearch] Step 3: Accent-insensitive word match for "${dNoAccent}"`);
    const { data: accentData, error: accentError } = await client
      .from('greek_morphology')
      .select('lemma, word')
      .ilike('word', dNoAccent)
      .limit(1);

    if (!accentError && accentData && accentData.length > 0 && accentData[0]) {
      const foundLemma = (accentData[0] as { lemma: string }).lemma;
      console.log(`[LemmaSearch] ✅ Step 3 SUCCESS: lemma = "${foundLemma}" (matched word: "${(accentData[0] as { word: string }).word}")`);
      return foundLemma;
    } else {
      console.log(`[LemmaSearch] Step 3: No accent-insensitive match`);
    }

    // 4. Accent-insensitive search on normalized
    console.log(`[LemmaSearch] Step 4: Accent-insensitive normalized match for "${dNoAccent}"`);
    const { data: accentNormData, error: accentNormError } = await client
      .from('greek_morphology')
      .select('lemma, normalized')
      .ilike('normalized', dNoAccent)
      .limit(1);

    if (!accentNormError && accentNormData && accentNormData.length > 0 && accentNormData[0]) {
      const foundLemma = (accentNormData[0] as { lemma: string }).lemma;
      console.log(`[LemmaSearch] ✅ Step 4 SUCCESS: lemma = "${foundLemma}"`);
      return foundLemma;
    } else {
      console.log(`[LemmaSearch] Step 4: No accent-insensitive normalized match`);
    }

    // 5. Try lowercase search (sometimes helps with proper nouns)
    console.log(`[LemmaSearch] Step 5: Lowercase match for "${dLower}"`);
    const { data: lowerData, error: lowerError } = await client
      .from('greek_morphology')
      .select('lemma')
      .eq('word', dLower)
      .limit(1);

    if (!lowerError && lowerData && lowerData.length > 0 && lowerData[0]) {
      const foundLemma = (lowerData[0] as { lemma: string }).lemma;
      console.log(`[LemmaSearch] ✅ Step 5 SUCCESS: lemma = "${foundLemma}"`);
      return foundLemma;
    } else {
      console.log(`[LemmaSearch] Step 5: No lowercase match`);
    }

    // 6. FINAL FALLBACK: Try searching the 'lemma' column itself (for cases where word appears as lemma)
    console.log(`[LemmaSearch] Step 6: Direct lemma match for "${d}"`);
    const { data: lemmaData, error: lemmaError } = await client
      .from('greek_morphology')
      .select('lemma')
      .eq('lemma', d)
      .limit(1);

    if (!lemmaError && lemmaData && lemmaData.length > 0 && lemmaData[0]) {
      const foundLemma = (lemmaData[0] as { lemma: string }).lemma;
      console.log(`[LemmaSearch] ✅ Step 6 SUCCESS: lemma = "${foundLemma}"`);
      return foundLemma;
    } else {
      console.log(`[LemmaSearch] Step 6: No direct lemma match`);
    }

    console.log(`[LemmaSearch] ❌ ALL STEPS FAILED for "${text}" -> "${d}"`);
    return null;
  } catch (err) {
    console.error('[LemmaSearch] Unexpected error:', err);
    return null;
  }
}

// Combined function: tries database first, falls back to local mapping
export async function getSmartLemmaWithDatabase(text: string): Promise<string> {
  // First try database
  const dbLemma = await getLemmaFromDatabase(text);
  if (dbLemma) {
    return dbLemma;
  }

  // Fall back to local algorithm
  return getSmartLemma(text);
}
