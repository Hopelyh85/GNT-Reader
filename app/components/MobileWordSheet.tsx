'use client';

import { useEffect, useState } from 'react';
import { X, BookOpen, Loader2 } from 'lucide-react';
import { SelectedWord } from '@/app/types';

interface LexiconEntry {
  transliteration: string;
  definition: string;
  strongs: string;
  frequency: string;
}

interface MobileWordSheetProps {
  selectedWord: SelectedWord | null;
  onClose: () => void;
}

export function MobileWordSheet({ selectedWord, onClose }: MobileWordSheetProps) {
  const [lexicon, setLexicon] = useState<Record<string, LexiconEntry>>({});
  const [lexiconLoading, setLexiconLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Load lexicon data
  useEffect(() => {
    async function loadLexicon() {
      setLexiconLoading(true);
      try {
        const response = await fetch('/data/lexicon.json');
        if (response.ok) {
          const data = await response.json();
          setLexicon(data);
        }
      } catch (err) {
        console.error('Error loading lexicon:', err);
      } finally {
        setLexiconLoading(false);
      }
    }
    loadLexicon();
  }, []);

  // Animate in when selectedWord changes
  useEffect(() => {
    if (selectedWord) {
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [selectedWord]);

  // Close handler with animation
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300);
  };

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Dual lookup: lemma first, then surface form
  const getWordDefinition = (lemma: string, surfaceForm: string): LexiconEntry | null => {
    if (lexicon[lemma]) {
      return lexicon[lemma];
    }
    if (lexicon[surfaceForm]) {
      return lexicon[surfaceForm];
    }
    return null;
  };

  // Parse morph code
  const parseMorphCode = (code: string): { type: string; case?: string; number?: string; gender?: string; person?: string; tense?: string; voice?: string; mood?: string } => {
    if (!code || code.length < 10) return { type: 'unknown' };
    
    const type = code[0];
    const typeMap: Record<string, string> = {
      'N': '명사', 'V': '동사', 'A': '형용사', 'D': '부사', 
      'C': '접속사', 'P': '전치사', 'R': '관계사', 'M': '수사',
      'I': '감탄사', 'X': '부정사'
    };
    
    const result: any = { type: typeMap[type] || type };
    
    if (type === 'N' || type === 'A' || type === 'R') {
      const caseMap: Record<string, string> = { 'N': '주격', 'G': '속격', 'D': '여격', 'A': '대격', 'V': '호격' };
      const numberMap: Record<string, string> = { 'S': '단수', 'P': '복수' };
      const genderMap: Record<string, string> = { 'M': '남성', 'F': '여성', 'N': '중성' };
      
      if (code[7]) result.case = caseMap[code[7]] || code[7];
      if (code[8]) result.number = numberMap[code[8]] || code[8];
      if (code[9]) result.gender = genderMap[code[9]] || code[9];
    } else if (type === 'V') {
      const personMap: Record<string, string> = { '1': '1인칭', '2': '2인칭', '3': '3인칭' };
      const tenseMap: Record<string, string> = { 'P': '현재', 'I': '미완료', 'F': '미래', 'A': '부정과거', 'R': '완료', 'L': '과거완료' };
      const voiceMap: Record<string, string> = { 'A': '능동태', 'M': '중간태', 'P': '수동태' };
      const moodMap: Record<string, string> = { 'I': '직설법', 'S': '가정법', 'O': '명령법', 'N': '부정사', 'P': '분사' };
      
      if (code[1]) result.person = personMap[code[1]] || code[1];
      if (code[3]) result.tense = tenseMap[code[3]] || code[3];
      if (code[4]) result.voice = voiceMap[code[4]] || code[4];
      if (code[5]) result.mood = moodMap[code[5]] || code[5];
      if (code[2]) result.number = code[2] === 'S' ? '단수' : code[2] === 'P' ? '복수' : code[2];
    }
    
    return result;
  };

  // Infer word type
  const inferWordType = (morph: string, word: string): string => {
    const parsed = parseMorphCode(morph);
    
    if (parsed.type === '명사' && word[0] === word[0]?.toUpperCase()) {
      return '고유명사 (인명/지명)';
    }
    
    if (parsed.type === '명사') return `명사${parsed.case ? ` (${parsed.case})` : ''}${parsed.number ? ` ${parsed.number}` : ''}${parsed.gender ? ` ${parsed.gender}` : ''}`;
    if (parsed.type === '동사') return `동사${parsed.tense ? ` (${parsed.tense})` : ''}${parsed.voice ? ` ${parsed.voice}` : ''}${parsed.mood ? ` ${parsed.mood}` : ''}`;
    if (parsed.type === '형용사') return `형용사${parsed.case ? ` (${parsed.case})` : ''}`;
    if (parsed.type === '관계사') return '관계대명사';
    if (parsed.type === '수사') return '수사';
    if (parsed.type === '부사') return '부사';
    if (parsed.type === '접속사') return '접속사';
    if (parsed.type === '전치사') return '전치사';
    if (parsed.type === '감탄사') return '감탄사';
    
    return parsed.type || '미상의 품사';
  };

  if (!selectedWord) return null;

  const word = selectedWord.word;
  const entry = getWordDefinition(word.lemma, word.text);
  const inferredType = entry ? '' : inferWordType(word.morph, word.text);
  const parsed = parseMorphCode(word.morph);

  return (
    <div 
      className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleBackdropClick}
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight: '80vh' }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-stone-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-stone-100">
          <h3 className="text-lg font-serif font-semibold text-stone-800">
            📖 단어 분석
          </h3>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-stone-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 120px)' }}>
          {lexiconLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
            </div>
          ) : entry ? (
            <div className="space-y-4">
              {/* Word Info */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-greek text-3xl font-bold text-amber-700">
                  {word.lemma}
                </span>
                {word.lemma !== word.text && (
                  <span className="text-sm px-2 py-1 bg-stone-200 rounded text-stone-600">
                    표면형: {word.text}
                  </span>
                )}
              </div>

              {/* Reference */}
              <p className="text-sm text-stone-500">
                {selectedWord.bookName} {selectedWord.chapter}:{selectedWord.verse}
              </p>

              {/* Definition */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-stone-700 leading-relaxed">
                  {entry.definition}
                </p>
              </div>

              {/* Meta Info */}
              <div className="flex flex-wrap gap-2 text-xs text-stone-500">
                <span className="px-2 py-1 bg-stone-100 rounded">Strong&apos;s: {entry.strongs}</span>
                <span className="px-2 py-1 bg-stone-100 rounded">[{entry.transliteration}]</span>
                <span className="px-2 py-1 bg-stone-100 rounded">{entry.frequency}</span>
              </div>

              {/* Grammar */}
              <div className="text-xs text-stone-500 pt-2 border-t border-stone-200">
                문법: {parsed.type}{parsed.case ? ` • ${parsed.case}` : ''}{parsed.number ? ` • ${parsed.number}` : ''}{parsed.gender ? ` • ${parsed.gender}` : ''}{parsed.tense ? ` • ${parsed.tense}` : ''}{parsed.voice ? ` • ${parsed.voice}` : ''}{parsed.mood ? ` • ${parsed.mood}` : ''}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Word Info (No Definition) */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-greek text-3xl font-semibold text-stone-700">
                  {word.lemma}
                </span>
                {word.lemma !== word.text && (
                  <span className="text-sm px-2 py-1 bg-stone-200 rounded text-stone-600">
                    표면형: {word.text}
                  </span>
                )}
              </div>

              {/* Reference */}
              <p className="text-sm text-stone-500">
                {selectedWord.bookName} {selectedWord.chapter}:{selectedWord.verse}
              </p>

              {/* Inferred Type */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-amber-700 font-medium mb-2">
                  📖 {inferredType}
                </p>
                <p className="text-sm text-stone-600">
                  문법: {parsed.type}{parsed.case ? ` • ${parsed.case}` : ''}{parsed.number ? ` • ${parsed.number}` : ''}{parsed.gender ? ` • ${parsed.gender}` : ''}{parsed.tense ? ` • ${parsed.tense}` : ''}{parsed.voice ? ` • ${parsed.voice}` : ''}{parsed.mood ? ` • ${parsed.mood}` : ''}
                </p>
              </div>

              <p className="text-xs text-stone-400 text-center pt-2">
                (사전 데이터 준비 중)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MobileWordSheet;
