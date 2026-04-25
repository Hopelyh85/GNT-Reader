import { createClient } from '@supabase/supabase-js';
import { getMyProfile, Profile } from './supabase';

// User tiers
export type UserTier = 'Admin' | 'Staff' | 'Hardworking' | 'Regular' | 'General' | '관리자' | '스태프' | '열심회원' | '정회원' | '준회원';

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
  return tier === 'Admin' || tier === 'Hardworking' || tier === '관리자' || tier === '열심회원';
};

export const canWriteCommentary = (tier: UserTier | null): boolean => {
  return tier === 'Admin' || tier === '관리자';
};

export const canEditContent = (
  tier: UserTier | null,
  userId: string,
  contentOwnerId: string
): boolean => {
  if (!tier) return false;
  return tier === 'Admin' || tier === '관리자' || userId === contentOwnerId;
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
