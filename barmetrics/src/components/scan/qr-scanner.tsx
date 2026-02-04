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
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const startScanner = async () => {
    if (!videoRef.current || qrScannerRef.current) return;

    setIsInitializing(true);
    setError(null);

    try {
      // Check if mediaDevices API is available
      if (!navigator?.mediaDevices?.enumerateDevices) {
        throw new Error('Camera API not supported in this browser. Please use manual entry instead.');
      }

      // Check if camera is available
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(device => device.kind === 'videoinput');

      if (!hasCamera) {
        throw new Error('No camera found on this device. Please use manual entry instead.');
      }

      const QrScanner = (await import('qr-scanner')).default;

      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          onScan(result.data);
        },
        {
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      qrScannerRef.current = scanner;
      await scanner.start();
      onToggleScanning(true);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      let errorMessage = 'Failed to start camera. ';

      if (err?.message?.includes('not found') || err?.message?.includes('NotFoundError')) {
        errorMessage = 'Camera not accessible. Please check:\n• Camera permissions in Settings > Safari\n• Camera is not being used by another app\n• Try using manual entry below instead';
      } else if (err?.message?.includes('NotAllowedError') || err?.message?.includes('Permission')) {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (err?.message?.includes('secure')) {
        errorMessage = 'Camera requires secure connection. Please use manual entry below.';
      } else {
        errorMessage += err instanceof Error ? err.message : 'Please use manual entry below.';
      }

      setError(errorMessage);
      onToggleScanning(false);
    } finally {
      setIsInitializing(false);
    }
  };

  const stopScanner = async () => {
    if (qrScannerRef.current) {
      try {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    onToggleScanning(false);
  };

  // Auto-start scanner when isScanning prop changes to true
  useEffect(() => {
    if (isScanning && !qrScannerRef.current && !isInitializing) {
      startScanner();
    } else if (!isScanning && qrScannerRef.current) {
      stopScanner();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning]);

  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
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

          <video
            ref={videoRef}
            className={`rounded-lg w-full bg-black ${
              isScanning ? 'block' : 'hidden'
            }`}
            style={{ maxHeight: '400px', objectFit: 'cover' }}
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
