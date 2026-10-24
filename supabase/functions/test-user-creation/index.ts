import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const logs: string[] = [];
  
  try {
    logs.push('Step 1: Function started');
    
    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    logs.push(`Step 2: Environment check - URL: ${supabaseUrl ? 'SET' : 'MISSING'}, Anon Key: ${supabaseAnonKey ? 'SET' : 'MISSING'}, Service Key: ${supabaseServiceKey ? 'SET' : 'MISSING'}`);
    
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }
    
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    logs.push(`Step 3: Auth header: ${authHeader ? 'PRESENT' : 'MISSING'}`);
    
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }
    
    // Create client with user token
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    logs.push('Step 4: Supabase client created');
    
    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    logs.push(`Step 5: Get user - Success: ${!!user}, Error: ${userError?.message || 'none'}`);
    
    if (userError || !user) {
      throw new Error(`Failed to get user: ${userError?.message || 'No user'}`);
    }
    
    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role, username')
      .eq('id', user.id)
      .single();
    
    logs.push(`Step 6: Get profile - Success: ${!!profile}, Role: ${profile?.role}, Error: ${profileError?.message || 'none'}`);
    
    if (profileError || !profile) {
      throw new Error(`Failed to get profile: ${profileError?.message || 'No profile'}`);
    }
    
    if (profile.role !== 'admin') {
      throw new Error(`User ${profile.username} is not an admin (role: ${profile.role})`);
    }
    
    // Parse request body
    const body = await req.json();
    logs.push(`Step 7: Request body parsed - Username: ${body.username}, Role: ${body.role || 'user'}`);
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    logs.push('Step 8: Admin client created');
    
    // Try to create user
    const authEmail = body.email || `${body.username}@miaoda.com`;
    logs.push(`Step 9: Creating user with email: ${authEmail}`);
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password: body.password,
      email_confirm: true,
      user_metadata: { username: body.username },
    });
    
    logs.push(`Step 10: User creation - Success: ${!!newUser?.user}, Error: ${createError?.message || 'none'}`);
    
    if (createError) {
      throw new Error(`Failed to create auth user: ${createError.message}`);
    }
    
    if (!newUser.user) {
      throw new Error('No user returned from createUser');
    }
    
    logs.push(`Step 11: Auth user created with ID: ${newUser.user.id}`);
    
    // Wait for trigger
    logs.push('Step 12: Waiting 1 second for trigger...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check for profile
    const { data: newProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', newUser.user.id)
      .maybeSingle();
    
    logs.push(`Step 13: Profile check - Found: ${!!newProfile}, Error: ${profileCheckError?.message || 'none'}`);
    
    if (!newProfile) {
      logs.push('Step 14: Creating profile manually...');
      
      const { data: createdProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: newUser.user.id,
          username: body.username,
          email: authEmail,
          role: body.role || 'user',
          email_verified: true,
          approved: true,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      logs.push(`Step 15: Manual profile creation - Success: ${!!createdProfile}, Error: ${insertError?.message || 'none'}`);
      
      if (insertError) {
        logs.push('Step 16: Rolling back - deleting auth user...');
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        throw new Error(`Failed to create profile: ${insertError.message}`);
      }
      
      logs.push('Step 17: SUCCESS - User and profile created');
      
      return new Response(
        JSON.stringify({ success: true, logs, user: newUser.user, profile: createdProfile }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Update existing profile
    logs.push('Step 14: Updating existing profile...');
    
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        approved: true,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        role: body.role || newProfile.role,
      })
      .eq('id', newUser.user.id)
      .select()
      .single();
    
    logs.push(`Step 15: Profile update - Success: ${!!updatedProfile}, Error: ${updateError?.message || 'none'}`);
    
    if (updateError) {
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }
    
    logs.push('Step 16: SUCCESS - User created and profile updated');
    
    return new Response(
      JSON.stringify({ success: true, logs, user: newUser.user, profile: updatedProfile }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    logs.push(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('test-user-creation error:', error);
    console.error('Logs:', logs);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        logs,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
