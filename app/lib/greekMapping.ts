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

export async function getLemmaFromDatabase(text: string): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) {
    console.warn('Supabase client not initialized, falling back to local mapping');
    return null;
  }

  // Clean the text same way as getSmartLemma
  let d = text.replace(/[.,;··⸀⸁⸂⸃⸄⸅\(\)\[\]\{\}\s\-0-9]/g, "").trim();

  try {
    // Query the greek_morphology table for lemma
    const { data, error } = await client
      .from('greek_morphology')
      .select('lemma')
      .eq('word', d)
      .limit(1);

    if (error) {
      console.error('Error querying greek_morphology:', error);
      return null;
    }

    if (data && data.length > 0 && data[0]) {
      return (data[0] as { lemma: string }).lemma;
    }

    // Try normalized form if exact word not found
    const { data: normalizedData, error: normalizedError } = await client
      .from('greek_morphology')
      .select('lemma')
      .eq('normalized', d)
      .limit(1);

    if (normalizedError) {
      console.error('Error querying normalized form:', normalizedError);
      return null;
    }

    if (normalizedData && normalizedData.length > 0 && normalizedData[0]) {
      return (normalizedData[0] as { lemma: string | null }).lemma ?? null;
    }

    return null;
  } catch (err) {
    console.error('Unexpected error in getLemmaFromDatabase:', err);
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
