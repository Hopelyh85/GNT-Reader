import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StudyNote, Reflection } from '@/app/types';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase() {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not found. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
    }
    
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return supabaseInstance;
}

// Study Notes API
export async function getStudyNote(
  userNickname: string,
  verseRef: string
): Promise<StudyNote | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('study_notes')
    .select('*')
    .eq('user_nickname', userNickname)
    .eq('verse_ref', verseRef)
    .single();

  // PGRST116 = no rows found (404) - return null without error
  if (error && error.code === 'PGRST116') {
    return null;
  }

  if (error) {
    console.error('Error fetching study note:', error);
    return null; // Return null instead of throwing error
  }

  return data;
}

export async function saveStudyNote(
  userNickname: string,
  verseRef: string,
  book: string,
  chapter: number,
  verse: number,
  ministryNote: string,
  commentary: string
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('study_notes').upsert(
    {
      user_nickname: userNickname,
      verse_ref: verseRef,
      book,
      chapter,
      verse,
      ministry_note: ministryNote,
      commentary,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_nickname,verse_ref' }
  );

  if (error) {
    console.error('Error saving study note:', error);
    throw error;
  }
}

// Reflections API
export async function getReflections(
  verseRef: string,
  limit: number = 50
): Promise<Reflection[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('reflections')
    .select('*')
    .eq('verse_ref', verseRef)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching reflections:', error);
    return [];
  }

  return data || [];
}

export async function addReflection(
  userNickname: string,
  verseRef: string,
  book: string,
  chapter: number,
  verse: number,
  content: string
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('reflections').insert({
    user_nickname: userNickname,
    verse_ref: verseRef,
    book,
    chapter,
    verse,
    content,
  });

  if (error) {
    console.error('Error adding reflection:', error);
    throw error;
  }
}

// Realtime subscriptions
export function subscribeToReflections(
  verseRef: string,
  callback: (reflection: Reflection) => void
) {
  const supabase = getSupabase();
  return supabase
    .channel(`reflections:${verseRef}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'reflections',
        filter: `verse_ref=eq.${verseRef}`,
      },
      (payload: { new: Reflection }) => {
        callback(payload.new);
      }
    )
    .subscribe();
}
