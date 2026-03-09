require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  console.log("Fetching sales...");
  const t0 = Date.now();
  const { data, error } = await supabase.from('sales').select('*, inventory(product_id)');
  console.log(`Fetched in ${Date.now() - t0}ms`);
  console.log("Data:", data ? data.length : null, "Error:", error);
}

test();
