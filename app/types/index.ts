// MorphGNT Enhanced SBLGNT Data Types
// Each verse is an array of word objects: {text, lemma, morph}
export interface GreekWord {
  text: string;   // surface form (e.g., Χριστοῦ)
  lemma: string;  // lexical form (e.g., Χριστός)
  morph: string;  // morphology code (e.g., "N----NSF-")
}

export interface BibleBook {
  abbrev: string;
  book: string;  // Greek name like "ΚΑΤΑ ΜΑΘΘΑΙΟΝ"
  korean_name: string;
  chapters: GreekWord[][][];  // chapters[chapterIndex][verseIndex][wordIndex]
}

export interface SBLGNTData {
  books: BibleBook[];
}

// UI-facing interfaces (converted from BibleBook structure)
export interface Verse {
  number: number;
  words: GreekWord[];  // Array of word objects {text, lemma, morph}
}

export interface Chapter {
  number: number;
  verses: GreekWord[][];  // Array of verses, each verse is array of words
}

export interface Book {
  name: string;
  abbrev: string;
  chapters: Chapter[];
}

// Verse Reference Type
export interface VerseRef {
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
}

// Supabase Database Types
export interface StudyNote {
  id: string;
  user_nickname: string;
  verse_ref: string;
  book: string;
  chapter: number;
  verse: number;
  ministry_note: string;
  commentary: string;
  created_at: string;
  updated_at: string;
}

export interface Reflection {
  id: string;
  user_nickname: string;
  verse_ref: string;
  book: string;
  chapter: number;
  verse: number;
  content: string;
  created_at: string;
}

// UI State Types
export interface SelectedVerse extends VerseRef {
  text: string;
  translation?: string;  // Korean translation (KRV)
  krv?: string;  // Alternative field name for Korean translation
}

// Selected word for dictionary lookup
export interface SelectedWord {
  word: GreekWord;
  bookName: string;
  book: string;
  chapter: number;
  verse: number;
}
