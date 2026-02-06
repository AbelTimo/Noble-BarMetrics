'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bluetooth, BluetoothConnected, BluetoothOff, Scale, AlertTriangle } from 'lucide-react';
import { BluetoothScaleManager, getScaleManager, type ScaleDevice } from '@/lib/bluetooth-scale';

interface BluetoothScaleConnectProps {
  onWeightReceived?: (weightG: number) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export function BluetoothScaleConnect({
  onWeightReceived,
  onConnectionChange,
}: BluetoothScaleConnectProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<ScaleDevice | null>(null);
  const [lastWeight, setLastWeight] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsSupported(BluetoothScaleManager.isSupported());
  }, []);

  useEffect(() => {
    if (!isSupported) return;

    const manager = getScaleManager();

    // Register callbacks
    manager.onWeight((reading) => {
      setLastWeight(reading.weightG);
      onWeightReceived?.(reading.weightG);
    });

    manager.onConnectionChange((connected) => {
      if (!connected) {
        setConnectedDevice(null);
      }
      onConnectionChange?.(connected);
    });

    // Check if already connected
    const device = manager.getDevice();
    if (device?.connected) {
      setConnectedDevice(device);
    }
  }, [isSupported, onWeightReceived, onConnectionChange]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const manager = getScaleManager();

      // Request device pairing
      const device = await manager.requestDevice();
      setConnectedDevice(device);

      // Connect to device
      await manager.connect();

      setConnectedDevice({ ...device, connected: true });
    } catch (err: any) {
      console.error('Bluetooth connection error:', err);
      setError(err.message || 'Failed to connect to scale');
      setConnectedDevice(null);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    const manager = getScaleManager();
    await manager.disconnect();
    setConnectedDevice(null);
    setLastWeight(null);
  };

  if (!isSupported) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Bluetooth is not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium">Bluetooth Scale</h3>
            </div>

            {connectedDevice?.connected ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <BluetoothConnected className="h-4 w-4" />
                  {connectedDevice.name}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                >
                  <BluetoothOff className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Bluetooth className="mr-2 h-4 w-4 animate-pulse" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Bluetooth className="mr-2 h-4 w-4" />
                    Connect Scale
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Current Weight Display */}
          {connectedDevice?.connected && lastWeight !== null && (
            <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Current Weight</p>
              <p className="text-3xl font-bold text-green-700">
                {lastWeight.toFixed(1)}g
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          {!connectedDevice?.connected && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>How to connect:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Turn on your Bluetooth scale</li>
                <li>Click "Connect Scale" button</li>
                <li>Select your scale from the list</li>
                <li>Wait for connection to establish</li>
              </ol>
              <p className="mt-2 text-xs">
                <strong>Supported scales:</strong> Escali, generic BLE scales
              </p>
            </div>
          )}

          {connectedDevice?.connected && (
            <p className="text-xs text-muted-foreground">
              Scale connected. Place bottle on scale to automatically capture weight.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
