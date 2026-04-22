import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const REFLECTIONS_DIR = path.join(process.cwd(), 'data', 'reflections');

// Ensure reflections directory exists
if (!fs.existsSync(REFLECTIONS_DIR)) {
  fs.mkdirSync(REFLECTIONS_DIR, { recursive: true });
}

interface ReflectionData {
  user_nickname: string;
  verse_ref: string;
  book: string;
  chapter: number;
  verse: number;
  content: string;
  updated_at: string;
}

function getReflectionFilePath(book: string, chapter: number, verse: number): string {
  const safeBook = book.replace(/[^a-zA-Z0-9]/g, '');
  return path.join(REFLECTIONS_DIR, `${safeBook}_${chapter}_${verse}.json`);
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

    const filePath = getReflectionFilePath(book, parseInt(chapter), parseInt(verse));

    // Return null quietly if reflection doesn't exist (404 handled gracefully)
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ data: null });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const data: ReflectionData = JSON.parse(content);

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error reading reflection:', error);
    // Return null instead of error for 404-like cases
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
    } = body;

    if (!book || chapter === undefined || chapter === null || verse === undefined || verse === null) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const filePath = getReflectionFilePath(book, chapter, verse);

    const reflectionData: ReflectionData = {
      user_nickname: user_nickname || 'guest',
      verse_ref: verse_ref || `${book} ${chapter}:${verse}`,
      book,
      chapter,
      verse,
      content: content || '',
      updated_at: new Date().toISOString(),
    };

    fs.writeFileSync(filePath, JSON.stringify(reflectionData, null, 2), 'utf-8');

    return NextResponse.json({ data: reflectionData });
  } catch (error) {
    console.error('Error saving reflection:', error);
    return NextResponse.json(
      { error: 'Failed to save reflection' },
      { status: 500 }
    );
  }
}
