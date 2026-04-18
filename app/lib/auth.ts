import { getServerSession } from 'next-auth';
import { createClient } from '@supabase/supabase-js';

// User roles
export type UserRole = 'ADMIN' | 'USER';

// Extended session user type
export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  role: UserRole;
}

// RBAC Permission checks
export const canViewContent = () => true; // Everyone can view

export const canWriteNote = (session: SessionUser | null): boolean => {
  return !!session; // Must be logged in
};

export const canWriteCommentary = (session: SessionUser | null): boolean => {
  return session?.role === 'ADMIN'; // Only admin
};

export const canEditContent = (
  session: SessionUser | null,
  contentOwnerId: string
): boolean => {
  if (!session) return false;
  return session.role === 'ADMIN' || session.id === contentOwnerId;
};

// Supabase client with service role for server operations
export const getServiceSupabase = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

// Get current session user
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession();
  if (!session?.user?.email) return null;
  
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from('users')
    .select('id, email, name, image, role')
    .eq('email', session.user.email)
    .single();
    
  return data as SessionUser | null;
}
