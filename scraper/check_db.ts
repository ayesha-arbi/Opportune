import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

let envContent = '';
if (fs.existsSync('.env.local')) {
  envContent = fs.readFileSync('.env.local', 'utf8');
} else if (fs.existsSync('.env')) {
  envContent = fs.readFileSync('.env', 'utf8');
}

const parsed: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    parsed[match[1]] = value.trim();
  }
}

const supabaseUrl = parsed.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = parsed.SUPABASE_SERVICE_ROLE_KEY || parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, count, error } = await supabase.from('opportunities').select('*', { count: 'exact' });
  console.log('Total Opportunities Count in DB:', count);
  if (error) console.error('Error:', error);
  if (data && data.length > 0) {
    console.log(`Found ${data.length} rows:`);
    data.forEach(row => {
      console.log(`- [${row.type}] ${row.title} | Deadline: ${row.deadline} | Remote: ${row.is_remote} | Active: ${row.is_active} | Tags: ${JSON.stringify(row.field_tags)}`);
    });
  } else {
    console.log('Database is currently EMPTY of opportunities!');
  }
}

main();
