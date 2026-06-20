const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let supabaseUrl = '';
let supabaseAnonKey = '';

try {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('NEXT_PUBLIC_SUPABASE_URL=')[1].trim();
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.split('NEXT_PUBLIC_SUPABASE_ANON_KEY=')[1].trim();
    }
  }
} catch (e) {
  console.log('Error reading .env.local', e.message);
}

// Strip /rest/v1/ if it is there
if (supabaseUrl.endsWith('/rest/v1/')) {
  supabaseUrl = supabaseUrl.slice(0, -'/rest/v1/'.length);
} else if (supabaseUrl.endsWith('/rest/v1')) {
  supabaseUrl = supabaseUrl.slice(0, -'/rest/v1'.length);
}

console.log('Cleaned Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key length:', supabaseAnonKey.length);

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('Supabase not configured in env.');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Testing connection...');
  try {
    const { data: accounts, error: accountsError } = await supabase.from('accounts').select('*');
    console.log('Accounts Select Result:');
    console.log('Error:', accountsError);
    console.log('Data:', accounts);

    const { data: cols, error: colsError } = await supabase.from('signal_columns').select('*');
    console.log('\nColumns Select Result:');
    console.log('Error:', colsError);
    console.log('Data:', cols);
  } catch (e) {
    console.error('Exception caught:', e);
  }
}

test();
