import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface NoteData {
  user_id?: string;
  user_nickname: string;
  verse_ref: string;
  book: string;
  chapter: number;
  verse: number;
  ministry_note: string;
  commentary: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

// GET /api/notes?book=MAT&chapter=1&verse=1&user=nickname
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const book = searchParams.get('book');
    const chapter = searchParams.get('chapter');
    const verse = searchParams.get('verse');
    const user = searchParams.get('user');

    if (!book || !chapter || !verse || !user) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const verseRef = `${book} ${chapter}:${verse}`;

    // Query Supabase for study note - match by verse_ref
    const { data, error } = await supabase
      .from('study_notes')
      .select('*')
      .eq('verse_ref', verseRef)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Supabase error fetching note:', error);
      return NextResponse.json({ data: null });
    }

    // Map to expected format
    if (data) {
      const noteData: NoteData = {
        user_id: data.user_id,
        user_nickname: data.user_id?.slice(0, 8) || 'user',
        verse_ref: data.verse_ref,
        book: data.book,
        chapter: data.chapter,
        verse: data.verse,
        ministry_note: data.content || '',
        commentary: data.commentary || '',
        tags: data.tags || [],
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
      return NextResponse.json({ data: noteData });
    }

    return NextResponse.json({ data: null });
  } catch (error) {
    console.error('Error reading note:', error);
    return NextResponse.json({ data: null });
  }
}

// POST /api/notes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      user_nickname,
      verse_ref,
      book,
      chapter,
      verse,
      ministry_note,
      commentary,
      tags,
    } = body;

    if (!book || !chapter || !verse) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const verseRef = verse_ref || `${book} ${chapter}:${verse}`;

    // Insert into Supabase study_notes table
    const { data, error } = await supabase
      .from('study_notes')
      .upsert({
        user_id: user_id,
        verse_ref: verseRef,
        book,
        chapter,
        verse,
        content: ministry_note || '',
        commentary: commentary || '',
        tags: tags || [],
        is_private: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,verse_ref'
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error saving note:', error);
      return NextResponse.json(
        { error: 'Failed to save note' },
        { status: 500 }
      );
    }

    const noteData: NoteData = {
      user_id: data.user_id,
      user_nickname: user_nickname || 'guest',
      verse_ref: data.verse_ref,
      book: data.book,
      chapter: data.chapter,
      verse: data.verse,
      ministry_note: data.content || '',
      commentary: data.commentary || '',
      tags: data.tags || [],
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return NextResponse.json({ data: noteData });
  } catch (error) {
    console.error('Error saving note:', error);
    return NextResponse.json(
      { error: 'Failed to save note' },
      { status: 500 }
    );
  }
}
