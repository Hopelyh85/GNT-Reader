import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ReflectionData {
  user_nickname: string;
  verse_ref: string;
  book: string;
  chapter: number;
  verse: number;
  content: string;
  updated_at: string;
}

// GET /api/reflections?book=MAT&chapter=1&verse=1&user=nickname
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const book = searchParams.get('book');
    const chapter = searchParams.get('chapter');
    const verse = searchParams.get('verse');
    const user = searchParams.get('user');

    if (!book || !chapter || verse === undefined || verse === null || !user) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const verseRef = `${book} ${chapter}:${verse}`;

    // Query Supabase for reflection - try to match by verse_ref and user_nickname
    const { data, error } = await supabase
      .from('reflections')
      .select('*')
      .eq('verse_ref', verseRef)
      .eq('is_public', false)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Supabase error fetching reflection:', error);
      return NextResponse.json({ data: null });
    }

    // Map to expected format
    if (data) {
      const reflectionData: ReflectionData = {
        user_nickname: data.user_id?.slice(0, 8) || 'user',
        verse_ref: data.verse_ref,
        book: data.book,
        chapter: data.chapter,
        verse: data.verse,
        content: data.content,
        updated_at: data.updated_at,
      };
      return NextResponse.json({ data: reflectionData });
    }

    return NextResponse.json({ data: null });
  } catch (error) {
    console.error('Error reading reflection:', error);
    return NextResponse.json({ data: null });
  }
}

// POST /api/reflections
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_nickname,
      verse_ref,
      book,
      chapter,
      verse,
      content,
      // 신규 필드들
      category,
      tags,
      is_urgent,
      is_world_prayer,
      prayer_type,
      prayer_status,
      linked_prayer_id,
    } = body;

    if (!book || chapter === undefined || chapter === null || verse === undefined || verse === null) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert into Supabase reflections table with all fields
    const { data, error } = await supabase
      .from('reflections')
      .upsert({
        verse_ref: verse_ref || `${book} ${chapter}:${verse}`,
        book,
        chapter,
        verse,
        content: content || '',
        is_public: false,
        updated_at: new Date().toISOString(),
        // 신규 필드들 매핑
        category: category || 'reflection',
        tags: tags || [],
        is_urgent: is_urgent || false,
        is_world_prayer: is_world_prayer || false,
        prayer_type: prayer_type || null,
        prayer_status: prayer_status || 'wait',
        linked_prayer_id: linked_prayer_id || null,
        is_admin_approved: is_world_prayer ? false : true, // 세계 기도는 승인 필요
      }, {
        onConflict: 'verse_ref'
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error saving reflection:', error);
      return NextResponse.json(
        { error: 'Failed to save reflection' },
        { status: 500 }
      );
    }

    const reflectionData: ReflectionData = {
      user_nickname: user_nickname || 'guest',
      verse_ref: data.verse_ref,
      book: data.book,
      chapter: data.chapter,
      verse: data.verse,
      content: data.content,
      updated_at: data.updated_at,
    };

    return NextResponse.json({ data: reflectionData });
  } catch (error) {
    console.error('Error saving reflection:', error);
    return NextResponse.json(
      { error: 'Failed to save reflection' },
      { status: 500 }
    );
  }
}
