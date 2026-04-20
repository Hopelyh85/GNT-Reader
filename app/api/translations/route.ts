import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/app/lib/supabase';

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

    const supabase = getSupabase();
    
    // Determine which table to query based on version
    const tableName = version === 'krv' ? 'krv_translations' : 
                     version === 'net' ? 'net_translations' : 
                     'translations';
    
    // Try to fetch from Supabase - select 'text' column only for new schema
    const { data, error } = await supabase
      .from(tableName)
      .select('text')
      .eq('book', book)
      .eq('chapter', parseInt(chapter))
      .eq('verse', parseInt(verse))
      .maybeSingle();

    if (error && error.code === 'PGRST116') {
      // No data found
      return NextResponse.json({ 
        data: null,
        text: null,
        translation: null
      });
    }

    if (error) {
      console.error('Error fetching translation:', error);
      return NextResponse.json(
        { error: 'Failed to fetch translation' },
        { status: 500 }
      );
    }

    // Return the text field from new schema
    const translationText = data?.text || null;
    
    return NextResponse.json({ 
      data,
      text: translationText,
      translation: translationText
    });
    
  } catch (error) {
    console.error('Error in translations API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
