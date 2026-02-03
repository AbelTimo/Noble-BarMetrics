'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QRScanner } from '@/components/scan/qr-scanner';
import { ManualCodeInput } from '@/components/scan/manual-code-input';
import { ScanResultCard } from '@/components/scan/scan-result-card';
import { DEFAULT_LOCATIONS, parseLabelFromQR } from '@/lib/labels';
import { Scan, AlertCircle } from 'lucide-react';

interface ScanResult {
  id: string;
  code: string;
  status: string;
  location: string | null;
  warning: string | null;
  sku: {
    id: string;
    code: string;
    name: string;
    category: string;
    sizeMl: number;
    products: {
      isPrimary: boolean;
      product: {
        id: string;
        brand: string;
        productName: string;
      };
    }[];
  };
  events: {
    id: string;
    eventType: string;
    description: string | null;
    createdAt: string;
  }[];
}

export default function ScanPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<string[]>([...DEFAULT_LOCATIONS]);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch('/api/locations');
        if (response.ok) {
          const data = await response.json();
          setLocations(data.map((l: { name: string }) => l.name));
        }
      } catch (err) {
        console.error('Error fetching locations:', err);
      }
    };
    fetchLocations();
  }, []);

  const lookupLabel = useCallback(async (rawCode: string) => {
    // Parse the code (handles both direct codes and QR content URLs)
    const labelCode = parseLabelFromQR(rawCode) || rawCode;

    // Prevent duplicate lookups
    if (labelCode === lastScannedCode) {
      return;
    }

    setLastScannedCode(labelCode);
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/labels/scan/${encodeURIComponent(labelCode)}`);

      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        const err = await response.json();
        setError(err.error || 'Label not found');
      }
    } catch (err) {
      console.error('Error looking up label:', err);
      setError('Failed to lookup label. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [lastScannedCode]);

  const handleScan = useCallback((code: string) => {
    lookupLabel(code);
  }, [lookupLabel]);

  const handleManualSubmit = useCallback((code: string) => {
    setLastScannedCode(null); // Reset to allow re-scanning same code
    lookupLabel(code);
  }, [lookupLabel]);

  const handleClose = () => {
    setResult(null);
    setError(null);
    setLastScannedCode(null);
  };

  const handleAssigned = () => {
    // Re-fetch the label to show updated status
    if (result) {
      lookupLabel(result.code);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Scan className="h-6 w-6" />
          Scan Labels
        </h1>
        <p className="text-muted-foreground">
          Scan QR codes to identify bottles and manage their locations
        </p>
      </div>

      <div className="space-y-4">
        <QRScanner
          onScan={handleScan}
          isScanning={isScanning}
          onToggleScanning={setIsScanning}
        />

        <ManualCodeInput onSubmit={handleManualSubmit} isLoading={isLoading} />

        {isLoading && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Looking up label...
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="py-6">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="h-6 w-6" />
                <div>
                  <p className="font-medium">{error}</p>
                  <p className="text-sm text-muted-foreground">
                    Make sure the label code is correct or try scanning again
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <ScanResultCard
            result={result}
            onClose={handleClose}
            onAssigned={handleAssigned}
            locations={locations}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quick Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Camera scanning:</strong> Position the QR code within the
              frame. Works best in good lighting.
            </p>
            <p>
              <strong>Hardware scanner:</strong> Just scan - the code will be
              entered automatically.
            </p>
            <p>
              <strong>Manual entry:</strong> Type the label code (e.g.,
              BM-ABC12345) and press Enter.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
