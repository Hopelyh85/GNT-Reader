'use client';

import { useState, useMemo } from 'react';
import { Book, GreekWord } from '@/app/types';
import { ChevronDown, ChevronRight, BookOpen, X } from 'lucide-react';

import { SelectedWord } from '@/app/types';

interface BiblePanelProps {
  books: Book[];
  selectedVerse: { book: string; chapter: number; verse: number } | null;
  onSelectVerse: (verse: { book: string; bookName: string; chapter: number; verse: number; text: string }) => void;
  onSelectWord: (word: SelectedWord | null) => void;
  loading: boolean;
}

// Parse morphology code to Korean (Protestant standard terminology)
// Format examples: V-3AAI-S-- (verbs), N----NSM- (nouns), A----NSM- (adjectives)
const parseMorphCode = (morph: string) => {
  if (!morph) return '';
  const cleanMorph = morph.trim();
  const category = cleanMorph[0]; // 첫 글자로 품사 판별

  // 형태 불변 단어 처리 (접속사, 부사, 전치사 등)
  const invariantMap: any = {
    C: '접속사',
    D: '부사',
    P: '전치사',
    I: '감탄사',
    X: '입자(Particle)'
  };

  if (invariantMap[category] && cleanMorph.includes('----')) {
    return `[${invariantMap[category]}]`;
  }

  // 공통 맵
  const tenseMap: any = { P: '현재', I: '미완료', F: '미래', A: '부정과거', R: '완료', X: '완료', L: '과거완료' };
  const voiceMap: any = { A: '능동태', M: '중간태', P: '수동태', D: '디포넌트' };
  const moodMap: any = { I: '직설법', S: '가정법', O: '희구법', M: '명령법', N: '부정사', P: '분사' };
  const caseMap: any = { N: '주격', G: '속격', D: '여격', A: '대격', V: '호격' };
  const numberMap: any = { S: '단수', P: '복수' };
  const genderMap: any = { M: '남성', F: '여성', N: '중성' };
  const personMap: any = { 1: '1인칭', 2: '2인칭', 3: '3인칭' };

  if (category === 'V') {
    const parts = ['동사'];
    const verbMorph = cleanMorph.replace('V-', 'V');
    if (['1', '2', '3'].includes(verbMorph[1])) {
      parts.push(personMap[verbMorph[1]], tenseMap[verbMorph[2]], voiceMap[verbMorph[3]], moodMap[verbMorph[4]], numberMap[verbMorph[6]]);
    } else {
      parts.push(tenseMap[verbMorph[1]], voiceMap[verbMorph[2]], moodMap[verbMorph[3]]);
    }
    return `[${parts.filter(Boolean).join(' | ')}]`;
  }

  if (['N', 'A', 'D', 'R', 'P', 'I'].includes(category)) {
    const catName: any = { N: '명사', A: '형용사', D: '지시대명사', R: '관계대명사', P: '인칭대명사', I: '의문대명사' };
    const parts = [catName[category] || '체언'];
    // N----ASM- 처럼 하이픈이 많은 경우 뒤에서부터 격/수/성을 찾음
    const suffix = cleanMorph.slice(-4); 
    parts.push(caseMap[suffix[0]], numberMap[suffix[1]], genderMap[suffix[2]]);
    return `[${parts.filter(p => p && p !== '-').join(' | ')}]`;
  }

  return `[${cleanMorph}]`;
};

export function BiblePanel({
  books,
  selectedVerse,
  onSelectVerse,
  onSelectWord,
  loading,
}: BiblePanelProps) {
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  const [internalSelectedWord, setInternalSelectedWord] = useState<{word: GreekWord, bookName: string, chapter: number, verse: number, wordIndex: number} | null>(null);

  const bookAbbrevMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {
      '마태복음': 'MAT', '마가복음': 'MRK', '누가복음': 'LUK', '요한복음': 'JHN',
      '사도행전': 'ACT', '로마서': 'ROM', '고린도전서': '1CO', '고린도후서': '2CO',
      '갈라디아서': 'GAL', '에베소서': 'EPH', '빌립보서': 'PHP', '골로새서': 'COL',
      '데살로니가전서': '1TH', '데살로니가후서': '2TH', '디모데전서': '1TM', '디모데후서': '2TM',
      '디도서': 'TIT', '빌레몬서': 'PHM', '히브리서': 'HEB', '야고보서': 'JAS',
      '베드로전서': '1PE', '베드로후서': '2PE', '요한일서': '1JN', '요한이서': '2JN',
      '요한삼서': '3JN', '유다서': 'JUD', '요한계시록': 'REV',
    };
    return map;
  }, []);

  const getBookAbbrev = (bookName: string): string => {
    return bookAbbrevMap[bookName] || bookName.slice(0, 3).toUpperCase();
  };

  const handleBookClick = (bookName: string) => {
    setExpandedBook(expandedBook === bookName ? null : bookName);
    setExpandedChapter(null);
  };

  const handleChapterClick = (bookName: string, chapterNum: number) => {
    const key = `${bookName}-${chapterNum}`;
    setExpandedChapter(expandedChapter === key ? null : key);
  };

  const handleWordClick = (
    word: GreekWord,
    book: Book,
    chapterNum: number,
    verseNum: number,
    wordIndex: number
  ) => {
    const selectedWordData = {
      word,
      bookName: book.name,
      book: bookAbbrevMap[book.name] || book.name,
      chapter: chapterNum,
      verse: verseNum,
      wordIndex,
    };
    setInternalSelectedWord(selectedWordData);
    onSelectWord({
      word,
      bookName: book.name,
      book: bookAbbrevMap[book.name] || book.name,
      chapter: chapterNum,
      verse: verseNum,
    });
  };

  const handleVerseClick = (
    book: Book,
    chapterNum: number,
    verseNum: number,
    verseWords: GreekWord[]
  ) => {
    const abbrev = getBookAbbrev(book.name);
    const fullText = verseWords.map(w => w.t).join(' ');
    onSelectVerse({
      book: abbrev,
      bookName: book.name,
      chapter: chapterNum,
      verse: verseNum,
      text: fullText,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="flex flex-col items-center gap-3 text-stone-500">
          <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
          <p className="text-sm font-serif">헬라어 성경 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-stone-50">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-stone-100 border-b border-stone-200">
        <BookOpen className="w-5 h-5 text-stone-600" />
        <h2 className="text-sm font-serif font-semibold text-stone-700">
          SBLGNT 헬라어 신약
        </h2>
      </div>

      {/* Bible Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {books.map((book) => {
          const abbrev = getBookAbbrev(book.name);
          const isBookExpanded = expandedBook === book.name;

          return (
            <div key={book.name} className="rounded-lg overflow-hidden">
              {/* Book Header */}
              <button
                onClick={() => handleBookClick(book.name)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                  isBookExpanded
                    ? 'bg-stone-200 text-stone-800'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-150'
                }`}
              >
                <span className="font-serif font-medium text-sm">
                  {book.name}
                </span>
                {isBookExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {/* Chapters */}
              {isBookExpanded && (
                <div className="bg-stone-50 p-2 space-y-1">
                  {book.chapters.map((chapter) => {
                    const chapterKey = `${book.name}-${chapter.number}`;
                    const isChapterExpanded = expandedChapter === chapterKey;

                    return (
                      <div key={chapter.number}>
                        <button
                          onClick={() =>
                            handleChapterClick(book.name, chapter.number)
                          }
                          className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-sm rounded transition-colors ${
                            isChapterExpanded
                              ? 'bg-stone-200 text-stone-800'
                              : 'bg-white text-stone-600 hover:bg-stone-100'
                          }`}
                        >
                          <span className="font-serif">
                            {chapter.number}장
                          </span>
                          {isChapterExpanded ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                        </button>

                        {/* Verses */}
                        {isChapterExpanded && (
                          <div className="mt-1 space-y-0.5 pl-2">
                            {chapter.verses.map((verse, verseIdx) => {
                              const isSelected =
                                selectedVerse?.book === abbrev &&
                                selectedVerse?.chapter === chapter.number &&
                                selectedVerse?.verse === verseIdx + 1;

                              return (
                                <div
                                  key={verseIdx}
                                  onClick={() =>
                                    handleVerseClick(
                                      book,
                                      chapter.number,
                                      verseIdx + 1,
                                      verse
                                    )
                                  }
                                  className={`w-full text-left p-2 rounded transition-all text-sm leading-relaxed cursor-pointer ${
                                    isSelected
                                      ? 'bg-amber-100 border-l-2 border-amber-500 text-stone-800'
                                      : 'bg-white hover:bg-stone-100 text-stone-600'
                                  }`}
                                >
                                  <span className="font-serif text-xs text-stone-400 mr-2 select-none">
                                    {verseIdx + 1}
                                  </span>
                                  <span className="font-greek text-stone-700">
                                    {verse.map((word, wordIdx) => (
                                      <span
                                        key={wordIdx}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleWordClick(
                                            word,
                                            book,
                                            chapter.number,
                                            verseIdx + 1,
                                            wordIdx
                                          );
                                        }}
                                        className="inline-block mr-[0.3em] cursor-pointer hover:bg-amber-200 hover:text-amber-900 rounded px-0.5 transition-colors"
                                        title={`${word.l} (${word.m})`}
                                      >
                                        {word.t}
                                      </span>
                                    ))}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Word Analysis Panel */}
      {internalSelectedWord && (
        <div className="border-t border-stone-200 bg-white p-4 shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-serif font-semibold text-stone-800 mb-2">
                단어 분석: {internalSelectedWord.word.t}
              </h3>
              <div className="space-y-1 text-sm">
                <p className="text-stone-600">
                  <span className="font-medium text-stone-700">원형 (Lemma):</span>{' '}
                  <span className="font-greek text-amber-700">{internalSelectedWord.word.l}</span>
                </p>
                <p className="text-stone-600">
                  <span className="font-medium text-stone-700">문법 정보:</span>{' '}
                  <span className="text-stone-500">[{internalSelectedWord.word.m}]</span>
                </p>
                <p className="text-stone-600">
                  <span className="font-medium text-stone-700">해석:</span>{' '}
                  <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {parseMorphCode(internalSelectedWord.word.m)}
                  </span>
                </p>
                <p className="text-xs text-stone-400 mt-2">
                  {internalSelectedWord.bookName} {internalSelectedWord.chapter}:{internalSelectedWord.verse}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setInternalSelectedWord(null);
                onSelectWord(null);
              }}
              className="p-1 hover:bg-stone-100 rounded transition-colors"
            >
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// fix: v1.1
