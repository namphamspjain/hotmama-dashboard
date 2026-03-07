import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
        throw new Error("Missing environment variables.")
    }

    // 1. Verify caller authenticity
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
        throw new Error("Missing Authorization header")
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }
    
    // 2. Validate caller is an Admin
    const { data: callerProfile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()
      
    if (profileErr || callerProfile.role !== 'admin') {
      throw new Error('Forbidden: Only admins can manage users.')
    }
    
    // 3. Extract requested input
    const { email, password, full_name, role } = await req.json()
    if (!email || !password || !full_name || !role) {
      throw new Error('Missing required fields (email, password, full_name, role)')
    }

    // 4. Admin Setup (bypass RLS constraints)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // 5. Build user into auth tables
    const { data: newAuthUser, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        organization_id: callerProfile.organization_id,
        full_name,
      }
    })
    
    if (createAuthErr) throw createAuthErr
    
    // 6. Push profile table data bridging identities
    const { error: insertErr } = await supabaseAdmin.from('user_profiles').insert({
      id: newAuthUser.user.id,
      organization_id: callerProfile.organization_id,
      role: role,
      full_name: full_name,
    })
    
    if (insertErr) {
        throw new Error(`Profile creation failed: ${insertErr.message}`)
    }

    return new Response(JSON.stringify({ 
      id: newAuthUser.user.id,
      email: newAuthUser.user.email,
      role: role,
      name: full_name,
      active: true,
      message: 'User successfully provisioned!'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || err }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
