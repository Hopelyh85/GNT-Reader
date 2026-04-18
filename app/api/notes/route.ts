import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const NOTES_DIR = path.join(process.cwd(), 'data', 'notes');

// Ensure notes directory exists
if (!fs.existsSync(NOTES_DIR)) {
  fs.mkdirSync(NOTES_DIR, { recursive: true });
}

interface NoteData {
  user_nickname: string;
  verse_ref: string;
  book: string;
  chapter: number;
  verse: number;
  ministry_note: string;
  commentary: string;
  updated_at: string;
}

function getNoteFilePath(book: string, chapter: number, verse: number): string {
  const safeBook = book.replace(/[^a-zA-Z0-9]/g, '');
  return path.join(NOTES_DIR, `${safeBook}_${chapter}_${verse}.json`);
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

    const filePath = getNoteFilePath(book, parseInt(chapter), parseInt(verse));

    // Return null quietly if note doesn't exist (404 handled gracefully)
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ data: null });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const data: NoteData = JSON.parse(content);

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error reading note:', error);
    // Return null instead of error for 404-like cases
    return NextResponse.json({ data: null });
  }
}

// POST /api/notes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_nickname,
      verse_ref,
      book,
      chapter,
      verse,
      ministry_note,
      commentary,
    } = body;

    if (!book || !chapter || !verse) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const filePath = getNoteFilePath(book, chapter, verse);

    const noteData: NoteData = {
      user_nickname: user_nickname || 'guest',
      verse_ref: verse_ref || `${book} ${chapter}:${verse}`,
      book,
      chapter,
      verse,
      ministry_note: ministry_note || '',
      commentary: commentary || '',
      updated_at: new Date().toISOString(),
    };

    fs.writeFileSync(filePath, JSON.stringify(noteData, null, 2), 'utf-8');

    return NextResponse.json({ data: noteData });
  } catch (error) {
    console.error('Error saving note:', error);
    return NextResponse.json(
      { error: 'Failed to save note' },
      { status: 500 }
    );
  }
}
