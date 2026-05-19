'use client';

import { Bluetooth, BluetoothConnected, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBluetoothScale } from '@/contexts/bluetooth-scale-context';

export function BluetoothStatusIndicator() {
  const { isSupported, isConnected, isConnecting, device, connect, disconnect } = useBluetoothScale();

  if (!isSupported) return null;

  if (isConnected && device) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={disconnect}
        className="gap-1.5 text-green-700 hover:text-red-600 hover:bg-red-50 px-2"
        title={`Connected: ${device.name} — click to disconnect`}
      >
        <BluetoothConnected className="h-4 w-4" />
        <span className="hidden sm:inline text-xs max-w-[80px] truncate">{device.name}</span>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={connect}
      disabled={isConnecting}
      className="gap-1.5 text-[#3E3226]/60 hover:text-[#3E3226] hover:bg-[#3E3226]/5 px-2"
      title="Connect Bluetooth scale"
    >
      {isConnecting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Bluetooth className="h-4 w-4" />
      )}
      <span className="hidden sm:inline text-xs">
        {isConnecting ? 'Pairing...' : 'Scale'}
      </span>
    </Button>
  );
}
