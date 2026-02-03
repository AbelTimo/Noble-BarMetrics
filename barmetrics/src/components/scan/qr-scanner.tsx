'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';

interface QRScannerProps {
  onScan: (code: string) => void;
  isScanning: boolean;
  onToggleScanning: (scanning: boolean) => void;
}

export function QRScanner({ onScan, isScanning, onToggleScanning }: QRScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const startScanner = async () => {
    if (!scannerRef.current || html5QrCodeRef.current) return;

    setIsInitializing(true);
    setError(null);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');

      const scanner = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          onScan(decodedText);
        },
        () => {
          // QR code not found - ignore
        }
      );

      onToggleScanning(true);
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to start camera. Please ensure camera permissions are granted.'
      );
      onToggleScanning(false);
    } finally {
      setIsInitializing(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    onToggleScanning(false);
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Camera Scanner</h3>
            <div className="flex gap-2">
              {isScanning ? (
                <Button variant="outline" size="sm" onClick={stopScanner}>
                  <CameraOff className="mr-2 h-4 w-4" />
                  Stop Camera
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={startScanner}
                  disabled={isInitializing}
                >
                  {isInitializing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-4 w-4" />
                      Start Camera
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          <div
            id="qr-reader"
            ref={scannerRef}
            className={`rounded-lg overflow-hidden bg-black ${
              isScanning ? 'min-h-[300px]' : 'h-0'
            }`}
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              {error}
            </div>
          )}

          {!isScanning && !error && (
            <div className="text-center py-8 text-muted-foreground">
              <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Click "Start Camera" to scan QR codes</p>
              <p className="text-xs mt-1">
                Camera permission may be required
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
