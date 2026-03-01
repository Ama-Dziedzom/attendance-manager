import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "supabase";

interface InviteRequest {
    email: string;
    fullName: string;
    role: 'super_admin' | 'it' | 'hr' | 'front_desk';
    redirectTo?: string;
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization')! },
                },
            }
        );

        // 1. Get the user making the request
        const {
            data: { user: requester },
        } = await supabaseClient.auth.getUser();

        if (!requester) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            });
        }

        // 2. Check if the requester is an it_admin
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', requester.id)
            .single();

        if (profileError || (profile?.role !== 'super_admin' && profile?.role !== 'it')) {
            return new Response(JSON.stringify({ error: 'Only IT Admins can invite users' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403,
            });
        }

        // Getting the Service Role client for administrative actions
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { email, fullName, role, redirectTo: bodyRedirectTo }: InviteRequest = await req.json();

        // Determine the redirect URL: 
        // 1. Use the one from body if provided
        // 2. Otherwise use the origin header
        // 3. Fallback to a hardcoded dashboard callback if all else fails
        const origin = req.headers.get('origin');
        const finalRedirectTo = bodyRedirectTo || (origin ? `${origin}/auth/v1/callback` : null);

        // 3. Invite the user via Supabase Auth
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: { full_name: fullName },
            // Redirect back to our dashboard password reset page
            ...(finalRedirectTo ? { redirectTo: finalRedirectTo } : {}),
        });

        if (inviteError) throw inviteError;

        // 4. Create the profile entry
        const { error: profileCreateError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: inviteData.user.id,
                email: email,
                full_name: fullName,
                role: role,
            });

        if (profileCreateError) throw profileCreateError;

        return new Response(JSON.stringify({ message: `Invitation sent to ${email}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
