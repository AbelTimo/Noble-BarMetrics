'use client';

import { useState, useEffect } from 'react';
import { QRScanner } from '@/components/scan/qr-scanner';
import { ManualCodeInput } from '@/components/scan/manual-code-input';
import { ScanResultCard } from '@/components/scan/scan-result-card';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QrCode, Keyboard } from 'lucide-react';

export default function ScanPage() {
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [labelData, setLabelData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);

  // Fetch locations on mount
  useEffect(() => {
    fetch('/api/labels/locations')
      .then(res => res.json())
      .then(data => setLocations(data.map((loc: any) => loc.name)))
      .catch(() => setLocations(['Main Bar', 'Back Bar', 'Stock Room', 'Walk-in Cooler', 'Service Bar']));
  }, []);

  const handleScan = async (code: string) => {
    setScannedCode(code);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/labels/scan/${encodeURIComponent(code)}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Label not found. Please check the code and try again.');
        } else {
          setError('Failed to fetch label data. Please try again.');
        }
        setLabelData(null);
        return;
      }

      const data = await response.json();
      setLabelData(data);
    } catch (err) {
      console.error('Scan error:', err);
      setError('An error occurred while scanning. Please try again.');
      setLabelData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setScannedCode(null);
    setLabelData(null);
    setError(null);
  };

  const handleAssigned = () => {
    // Refresh the label data after assignment
    if (scannedCode) {
      handleScan(scannedCode);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Scan QR Label</h1>
        <p className="text-muted-foreground mt-2">
          Scan a QR code label to view item details and inventory information
        </p>
      </div>

      <div className="grid gap-6">
        <Card className="p-6">
          <Tabs defaultValue="camera" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="camera" className="gap-2">
                <QrCode className="h-4 w-4" />
                Camera Scan
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <Keyboard className="h-4 w-4" />
                Manual Entry
              </TabsTrigger>
            </TabsList>

            <TabsContent value="camera" className="mt-6">
              <QRScanner
                onScan={handleScan}
                isScanning={isScanning}
                onToggleScanning={setIsScanning}
              />
            </TabsContent>

            <TabsContent value="manual" className="mt-6">
              <ManualCodeInput onSubmit={handleScan} isLoading={isLoading} />
            </TabsContent>
          </Tabs>
        </Card>

        {isLoading && (
          <Card className="p-6">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              <p className="mt-4 text-muted-foreground">Loading label data...</p>
            </div>
          </Card>
        )}

        {error && (
          <Card className="p-6 border-destructive">
            <div className="text-center">
              <p className="text-destructive font-medium">{error}</p>
            </div>
          </Card>
        )}

        {labelData && !isLoading && (
          <ScanResultCard
            result={labelData}
            onClose={handleReset}
            onAssigned={handleAssigned}
            locations={locations}
          />
        )}
      </div>
    </div>
  );
}
