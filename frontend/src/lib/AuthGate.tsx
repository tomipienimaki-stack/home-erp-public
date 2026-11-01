import type { ReactNode } from 'react';
import LoginView from '../views/LoginView';
import { authDisabled, useSession } from './supabase';

export default function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  if (authDisabled()) return <>{children}</>;
  if (loading) return null;
  if (!session) return <LoginView />;
  return <>{children}</>;
}
