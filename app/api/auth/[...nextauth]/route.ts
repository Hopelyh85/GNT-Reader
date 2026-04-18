import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { createClient } from '@supabase/supabase-js';

// Defense: Check required env vars
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('FATAL: SUPABASE_SERVICE_ROLE_KEY is missing!');
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// NextAuth v5 configuration
const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }: { user: any; account: any }) {
      try {
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', user.email)
          .single();

        if (!existingUser) {
          const { data: allUsers } = await supabase
            .from('users')
            .select('id')
            .limit(1);
          
          const role = allUsers && allUsers.length === 0 ? 'ADMIN' : 'USER';
          
          await supabase.from('users').insert({
            email: user.email,
            name: user.name,
            image: user.image,
            role: role,
            provider: 'google',
            provider_account_id: account?.providerAccountId,
          });
        }
        return true;
      } catch (error) {
        console.error('SignIn error:', error);
        return true;
      }
    },
    
    async session({ session, token }: { session: any; token: any }) {
      if (!session) return { user: null };
      
      if (session?.user?.email) {
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('id, role')
            .eq('email', session.user.email)
            .single();
          
          if (userData) {
            session.user.id = userData.id;
            session.user.role = userData.role;
          }
        } catch (error) {
          console.error('Session callback error:', error);
        }
      }
      return session || { user: null };
    },
    
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) token.id = user.id;
      return token;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt' as const,
  },
  trustHost: true,
};

// NextAuth v5 handlers pattern - CORRECT WAY
const { handlers } = NextAuth(authConfig);
export const { GET, POST } = handlers;
