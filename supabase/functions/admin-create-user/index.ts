import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  username: string;
  password: string;
  role?: 'user' | 'admin';
  email?: string;
  phone?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('admin-create-user: Request received');

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('admin-create-user: Missing authorization header');
      throw new Error('Missing authorization header');
    }

    console.log('admin-create-user: Authorization header present');

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    console.log('admin-create-user: Supabase client created');

    // Verify the user is an admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('admin-create-user: User verification failed:', userError);
      throw new Error('Unauthorized');
    }

    console.log('admin-create-user: User verified:', user.id);

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      console.error('admin-create-user: Not an admin:', profileError, profile);
      throw new Error('Only admins can create users');
    }

    console.log('admin-create-user: Admin verified');

    // Parse request body
    const body: CreateUserRequest = await req.json();
    const { username, password, role = 'user', email, phone } = body;

    console.log('admin-create-user: Creating user:', username, 'with role:', role);

    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    // Validate username
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('Username can only contain letters, digits, and underscores');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Create Supabase admin client
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (!supabaseServiceKey) {
      console.error('admin-create-user: SUPABASE_SERVICE_ROLE_KEY not set');
      throw new Error('Server configuration error');
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('admin-create-user: Admin client created');

    // Create the auth user
    const authEmail = email || `${username}@miaoda.com`;
    console.log('admin-create-user: Creating auth user with email:', authEmail);
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password,
      phone,
      email_confirm: true, // Auto-confirm email
      phone_confirm: phone ? true : false, // Auto-confirm phone if provided
      user_metadata: {
        username,
        phone: phone || null,
      },
    });

    if (createError) {
      console.error('admin-create-user: Error creating auth user:', createError);
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    if (!newUser.user) {
      console.error('admin-create-user: No user returned from createUser');
      throw new Error('User creation failed - no user returned');
    }

    console.log('admin-create-user: Auth user created:', newUser.user.id);

    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if profile was created by trigger
    const { data: newProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', newUser.user.id)
      .maybeSingle();

    console.log('admin-create-user: Profile check result:', { newProfile, profileCheckError });

    if (profileCheckError) {
      console.error('admin-create-user: Error checking profile:', profileCheckError);
    }

    if (!newProfile) {
      // Profile wasn't created by trigger, create it manually
      console.log('admin-create-user: Profile not created by trigger, creating manually...');
      
      // Check if this is the first user
      const { count } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const isFirstUser = count === 0;
      const userRole = isFirstUser ? 'admin' : role;
      const isApproved = true; // Admin-created users are auto-approved

      console.log('admin-create-user: Creating profile manually with role:', userRole);

      const { data: createdProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: newUser.user.id,
          username,
          email: authEmail,
          phone: phone || null,
          role: userRole,
          email_verified: true,
          phone_verified: phone ? true : false,
          approved: isApproved,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('admin-create-user: Error creating profile:', insertError);
        // Try to delete the auth user since profile creation failed
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        throw new Error(`Failed to create profile: ${insertError.message}`);
      }

      console.log('admin-create-user: Profile created manually:', createdProfile.id);

      return new Response(
        JSON.stringify({
          success: true,
          user: newUser.user,
          profile: createdProfile,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Profile was created by trigger, update role and approval if needed
    console.log('admin-create-user: Profile exists, updating...');
    
    const updates: any = {
      approved: true,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    };

    if (role === 'admin') {
      updates.role = 'admin';
    }

    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', newUser.user.id)
      .select()
      .single();

    if (updateError) {
      console.error('admin-create-user: Error updating profile:', updateError);
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }

    console.log('admin-create-user: Profile updated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        user: newUser.user,
        profile: updatedProfile,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('admin-create-user: Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
