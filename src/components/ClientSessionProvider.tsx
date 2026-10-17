// src/components/ClientSessionProvider.tsx
'use client';
import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

interface ClientSessionProviderProps {
  children: ReactNode;
}

export default function ClientSessionProvider({ children }: ClientSessionProviderProps) {
  return <SessionProvider basePath="/api/v1/auth">{children}</SessionProvider>;
}