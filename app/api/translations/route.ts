import { NextRequest, NextResponse } from 'next/server';
import krvData from '@/krv_data.json';

// Local KRV data loaded from krv_data.json
// Format: { "BOOK_chapter_verse": "translation text", ... }
const krvTranslations: Record<string, string> = krvData as Record<string, string>;

// GET /api/translations?version=krv|net&book=MAT&chapter=1&verse=1
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const version = searchParams.get('version');
    const book = searchParams.get('book');
    const chapter = searchParams.get('chapter');
    const verse = searchParams.get('verse');

    if (!version || !book || !chapter || !verse) {
      return NextResponse.json(
        { error: 'Missing required parameters: version, book, chapter, verse' },
        { status: 400 }
      );
    }

    // KRV: Use local JSON data (no external API call)
    if (version === 'krv') {
      const key = `${book}_${chapter}_${verse}`;
      const text = krvTranslations[key] || null;
      
      return NextResponse.json({ 
        data: text ? { text } : null,
        text,
        translation: text
      });
    }
    
    // NET: Currently not available (placeholder for future implementation)
    if (version === 'net') {
      return NextResponse.json({ 
        data: null,
        text: null,
        translation: null
      });
    }

    // Unknown version
    return NextResponse.json({ 
      data: null,
      text: null,
      translation: null
    });
    
  } catch (error) {
    console.error('Error in translations API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
