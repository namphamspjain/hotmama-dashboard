import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://narwfxajwihjfumrkzwh.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hcndmeGFqd2loamZ1bXJrendoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3OTU0MTQsImV4cCI6MjA4ODM3MTQxNH0.TT6dm3F356lK3FyAz9JMFVutUnQrKih5v3aYh9gqM40');

async function check() {
  const { data, error } = await supabase.from('user_profiles').select('*');
  console.log('--- ERROR user_profiles ---', error);
  console.log('--- DATA user_profiles ---', data);
}
check();
