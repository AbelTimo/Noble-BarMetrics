'use client';

import { AuthProvider } from '@/contexts/auth-context';
import { BluetoothScaleProvider } from '@/contexts/bluetooth-scale-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <BluetoothScaleProvider>
        {children}
      </BluetoothScaleProvider>
    </AuthProvider>
  );
}
