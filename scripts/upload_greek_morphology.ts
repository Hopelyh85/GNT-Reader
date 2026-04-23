/**
 * Script to upload Greek morphology data from SBLGNT text files to Supabase
 * Usage: npx ts-node scripts/upload_greek_morphology.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role key for bulk insert

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Book mapping (file number to book name)
const bookMap: Record<string, string> = {
    '61': 'Matthew',
    '62': 'Mark',
    '63': 'Luke',
    '64': 'John',
    '65': 'Acts',
    '66': 'Romans',
    '67': '1Corinthians',
    '68': '2Corinthians',
    '69': 'Galatians',
    '70': 'Ephesians',
    '71': 'Philippians',
    '72': 'Colossians',
    '73': '1Thessalonians',
    '74': '2Thessalonians',
    '75': '1Timothy',
    '76': '2Timothy',
    '77': 'Titus',
    '78': 'Philemon',
    '79': 'Hebrews',
    '80': 'James',
    '81': '1Peter',
    '82': '2Peter',
    '83': '1John',
    '84': '2John',
    '85': '3John',
    '86': 'Jude',
    '87': 'Revelation',
};

interface MorphologyRow {
    location: string;
    pos: string;
    parsing: string;
    text: string;
    word: string;
    normalized: string;
    lemma: string;
}

function parseLine(line: string): MorphologyRow | null {
    // Skip empty lines
    if (!line.trim()) return null;

    // Split by whitespace
    const parts = line.trim().split(/\s+/);
    if (parts.length < 7) {
        console.warn(`Skipping malformed line: ${line}`);
        return null;
    }

    // Parts: [location, pos, parsing, text, word, normalized, lemma]
    // Note: text might contain spaces, so we need to handle it carefully
    // The format is: location pos parsing text word normalized lemma
    // text can have spaces if there was punctuation, but in morphgnt it's the 4th field

    return {
        location: parts[0],
        pos: parts[1],
        parsing: parts[2],
        text: parts[3],
        word: parts[4],
        normalized: parts[5],
        lemma: parts[6],
    };
}

async function uploadFile(filePath: string, batchSize: number = 1000): Promise<number> {
    const fileName = path.basename(filePath);
    console.log(`Processing ${fileName}...`);

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const rows: MorphologyRow[] = [];
    let totalUploaded = 0;

    for (const line of lines) {
        const parsed = parseLine(line);
        if (parsed) {
            rows.push(parsed);

            // Upload in batches
            if (rows.length >= batchSize) {
                const { error } = await supabase
                    .from('greek_morphology')
                    .insert(rows);

                if (error) {
                    console.error(`Error uploading batch from ${fileName}:`, error);
                    throw error;
                }

                totalUploaded += rows.length;
                console.log(`  Uploaded ${totalUploaded} rows...`);
                rows.length = 0; // Clear array
            }
        }
    }

    // Upload remaining rows
    if (rows.length > 0) {
        const { error } = await supabase
            .from('greek_morphology')
            .insert(rows);

        if (error) {
            console.error(`Error uploading final batch from ${fileName}:`, error);
            throw error;
        }

        totalUploaded += rows.length;
    }

    console.log(`  ✓ ${fileName} complete: ${totalUploaded} rows uploaded`);
    return totalUploaded;
}

async function main() {
    const dataDir = path.join(process.cwd(), 'data', 'sblgnt');
    const files = fs.readdirSync(dataDir)
        .filter(f => f.endsWith('.txt') && !f.startsWith('README'))
        .sort();

    console.log(`Found ${files.length} files to process\n`);

    let totalRows = 0;

    for (const file of files) {
        const filePath = path.join(dataDir, file);
        const uploaded = await uploadFile(filePath, 1000);
        totalRows += uploaded;
    }

    console.log(`\n✅ All files processed!`);
    console.log(`   Total rows uploaded: ${totalRows}`);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
