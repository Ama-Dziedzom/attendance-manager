import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../database.types'

let supabaseInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

export const createClient = () => {
    if (supabaseInstance) {
        return supabaseInstance
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables')
    }

    supabaseInstance = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

    return supabaseInstance
}

// Export a singleton instance
export const supabase = createClient()
