'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { BluetoothScaleManager, getScaleManager, type ScaleReading, type ScaleDevice } from '@/lib/bluetooth-scale';

interface BluetoothScaleState {
  isSupported: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  device: ScaleDevice | null;
  lastReading: ScaleReading | null;
  error: string | null;
}

interface BluetoothScaleContextType extends BluetoothScaleState {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  clearError: () => void;
}

const BluetoothScaleContext = createContext<BluetoothScaleContextType | undefined>(undefined);

export function BluetoothScaleProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BluetoothScaleState>({
    isSupported: false,
    isConnected: false,
    isConnecting: false,
    device: null,
    lastReading: null,
    error: null,
  });

  // Track mounted state to avoid state updates after unmount
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const supported = BluetoothScaleManager.isSupported();
    setState(prev => ({ ...prev, isSupported: supported }));

    if (!supported) return;

    const manager = getScaleManager();

    // Check if singleton already has a connection (e.g. from previous mount)
    const existingDevice = manager.getDevice();
    if (existingDevice?.connected) {
      setState(prev => ({
        ...prev,
        isConnected: true,
        device: existingDevice,
      }));
    }

    // Subscribe to weight readings
    const unsubWeight = manager.addWeightListener((reading) => {
      if (mountedRef.current) {
        setState(prev => ({ ...prev, lastReading: reading }));
      }
    });

    // Subscribe to connection changes
    const unsubConnection = manager.addConnectionListener((connected) => {
      if (mountedRef.current) {
        const device = manager.getDevice();
        setState(prev => ({
          ...prev,
          isConnected: connected,
          device: connected ? device : null,
          isConnecting: false,
        }));
      }
    });

    return () => {
      mountedRef.current = false;
      unsubWeight();
      unsubConnection();
    };
  }, []);

  const connect = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const manager = getScaleManager();
      const device = await manager.requestDevice();
      await manager.connect();

      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        device: { ...device, connected: true },
        error: null,
      }));
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: err.message || 'Failed to connect to scale',
      }));
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const manager = getScaleManager();
      await manager.disconnect();
    } catch {
      // Ignore disconnect errors
    }
    setState(prev => ({
      ...prev,
      isConnected: false,
      device: null,
      lastReading: null,
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const value: BluetoothScaleContextType = {
    ...state,
    connect,
    disconnect,
    clearError,
  };

  return (
    <BluetoothScaleContext.Provider value={value}>
      {children}
    </BluetoothScaleContext.Provider>
  );
}

/**
 * Full context hook — connection management + readings
 */
export function useBluetoothScale(): BluetoothScaleContextType {
  const context = useContext(BluetoothScaleContext);
  if (context === undefined) {
    throw new Error('useBluetoothScale must be used within a BluetoothScaleProvider');
  }
  return context;
}

/**
 * Convenience hook — just the latest weight reading + connection status
 */
export function useScaleWeight() {
  const { lastReading, isConnected } = useBluetoothScale();
  return { lastReading, isConnected };
}
