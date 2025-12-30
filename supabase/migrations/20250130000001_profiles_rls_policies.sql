-- Enable RLS on profiles table if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all profiles
-- This is needed for the User Management page to display all team members
CREATE POLICY "Authenticated users can view all profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Allow service role to insert profiles (for the invite-user edge function)
-- Note: Service role bypasses RLS by default, but this makes intent clear
CREATE POLICY "Service role can insert profiles"
    ON public.profiles
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- IT Admins can delete profiles (except their own)
CREATE POLICY "IT Admins can delete other profiles"
    ON public.profiles
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() != id 
        AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'it_admin'
        )
    );
