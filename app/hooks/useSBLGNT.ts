'use client';

import { useState, useEffect, useCallback } from 'react';
import { BibleBook, Book, Chapter, Verse, VerseRef, SBLGNTData, GreekWord } from '@/app/types';

const SBLGNT_URL = '/data/sblgnt.json';

// Raw JSON data format (t/l/m) - before transformation
interface RawGreekWord {
  t: string;  // text
  l: string;  // lemma
  m: string;  // morph
}

interface RawBibleBook {
  abbrev: string;
  book: string;
  korean_name: string;
  chapters: RawGreekWord[][][];
}

interface RawSBLGNTData {
  books: RawBibleBook[];
}

// Korean book names mapping (Protestant tradition)
const BOOK_NAMES_KO: Record<string, string> = {
  'MAT': '마태복음',
  'MRK': '마가복음',
  'LUK': '누가복음',
  'JHN': '요한복음',
  'ACT': '사도행전',
  'ROM': '로마서',
  '1CO': '고린도전서',
  '2CO': '고린도후서',
  'GAL': '갈라디아서',
  'EPH': '에베소서',
  'PHP': '빌립보서',
  'COL': '골로새서',
  '1TH': '데살로니가전서',
  '2TH': '데살로니가후서',
  '1TM': '디모데전서',
  '2TM': '디모데후서',
  'TIT': '디도서',
  'PHM': '빌레몬서',
  'HEB': '히브리서',
  'JAS': '야고보서',
  '1PE': '베드로전서',
  '2PE': '베드로후서',
  '1JN': '요한일서',
  '2JN': '요한이서',
  '3JN': '요한삼서',
  'JUD': '유다서',
  'REV': '요한계시록',
};

export function useSBLGNT() {
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(SBLGNT_URL);
        if (!response.ok) {
          throw new Error('Failed to fetch SBLGNT data');
        }
        const jsonData: RawSBLGNTData = await response.json();
        
        // Transform data: map t/l/m to text/lemma/morph for new schema
        const transformedBooks = (jsonData.books || []).map(book => ({
          ...book,
          chapters: book.chapters.map(chapter =>
            chapter.map(verse =>
              verse.map(word => ({
                text: word.t,
                lemma: word.l,
                morph: word.m
              }))
            )
          )
        }));
        
        setBooks(transformedBooks);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const getBooks = useCallback((): Book[] => {
    // Convert BibleBook[] to Book[] for UI compatibility
    return (books || []).map(b => ({
      name: BOOK_NAMES_KO[b.abbrev] || b.book,
      abbrev: b.abbrev,
      chapters: b.chapters.map((verses, idx) => ({
        number: idx + 1,
        verses: verses  // verses is already GreekWord[][]
      }))
    }));
  }, [books]);

  const getBook = useCallback(
    (abbrev: string): Book | undefined => {
      const bibleBook = (books || []).find((b) => b.abbrev === abbrev);
      if (!bibleBook) return undefined;
      
      return {
        name: BOOK_NAMES_KO[bibleBook.abbrev] || bibleBook.book,
        abbrev: bibleBook.abbrev,
        chapters: bibleBook.chapters.map((verses, idx) => ({
          number: idx + 1,
          verses: verses  // verses is already GreekWord[][]
        }))
      };
    },
    [books]
  );

  const getChapter = useCallback(
    (bookAbbrev: string, chapterNum: number): Chapter | undefined => {
      const bibleBook = (books || []).find((b) => b.abbrev === bookAbbrev);
      if (!bibleBook) return undefined;
      
      const chapterIndex = chapterNum - 1;
      const verses = bibleBook.chapters[chapterIndex];
      if (!verses) return undefined;
      
      return {
        number: chapterNum,
        verses: verses  // already GreekWord[][]
      };
    },
    [books]
  );

  const getVerse = useCallback(
    (bookAbbrev: string, chapterNum: number, verseNum: number): Verse | undefined => {
      const bibleBook = (books || []).find((b) => b.abbrev === bookAbbrev);
      if (!bibleBook) return undefined;
      
      const chapterIndex = chapterNum - 1;
      const verseIndex = verseNum - 1;
      const words = bibleBook.chapters[chapterIndex]?.[verseIndex];
      
      if (!words) return undefined;
      
      return {
        number: verseNum,
        words
      };
    },
    [books]
  );

  const getVerseText = useCallback(
    (bookAbbrev: string, chapterNum: number, verseNum: number): string => {
      const verse = getVerse(bookAbbrev, chapterNum, verseNum);
      return verse?.words?.map(w => w.text).join(' ') || '';
    },
    [getVerse]
  );

  const formatVerseRef = useCallback(
    (bookAbbrev: string, chapterNum: number, verseNum: number): string => {
      return `${bookAbbrev} ${chapterNum}:${verseNum}`;
    },
    []
  );

  return {
    books,
    loading,
    error,
    getBooks,
    getBook,
    getChapter,
    getVerse,
    getVerseText,
    formatVerseRef,
  };
}
