import { createClient } from '@supabase/supabase-js';
import { getMyProfile, Profile } from './supabase';

// User tiers
export type UserTier = 'Admin' | 'Hardworking' | 'Regular' | 'General';

// Extended session user type
export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  tier: UserTier;
}

// RBAC Permission checks
export const canViewContent = () => true; // Everyone can view

export const canWriteNote = (tier: UserTier | null): boolean => {
  return tier === 'Admin' || tier === 'Hardworking';
};

export const canWriteCommentary = (tier: UserTier | null): boolean => {
  return tier === 'Admin';
};

export const canEditContent = (
  tier: UserTier | null,
  userId: string,
  contentOwnerId: string
): boolean => {
  if (!tier) return false;
  return tier === 'Admin' || userId === contentOwnerId;
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
  const profile = await getMyProfile();
  if (!profile) return null;
  
  return {
    id: profile.id,
    email: profile.email,
    name: profile.nickname || profile.email,
    image: undefined,
    tier: profile.tier,
  };
}
