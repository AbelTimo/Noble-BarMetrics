'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BluetoothScaleConnect } from '@/components/scan/bluetooth-scale-connect';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { calculateVolumeFromWeight, DEFAULT_STANDARD_POUR_ML } from '@/lib/calculations';
import {
  Scale,
  Wine,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Droplets,
  Activity,
  Zap,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SKU {
  id: string;
  code: string;
  name: string;
  category: string;
  sizeMl: number;
  bottleTareG: number | null;
  densityGPerMl: number | null;
  abvPercent: number | null;
}

interface Session {
  id: string;
  name: string | null;
  location: string | null;
}

function WeighTrackPageContent() {
  const router = useRouter();
  const [skus, setSKUs] = useState<SKU[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSKUs, setFilteredSKUs] = useState<SKU[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSKU, setSelectedSKU] = useState<SKU | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [grossWeightG, setGrossWeightG] = useState<string>('');
  const [isBluetoothConnected, setIsBluetoothConnected] = useState(false);
  const [calculation, setCalculation] = useState<ReturnType<typeof calculateVolumeFromWeight> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Fetch SKUs and active sessions
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [skusRes, sessionsRes] = await Promise.all([
          fetch('/api/skus?isActive=true'),
          fetch('/api/sessions?status=active'),
        ]);

        if (skusRes.ok) {
          const skusData = await skusRes.json();
          setSKUs(skusData);
          setFilteredSKUs(skusData);
        }

        if (sessionsRes.ok) {
          const sessionsData = await sessionsRes.json();
          setSessions(sessionsData);
          // Auto-select first active session
          if (sessionsData.length > 0) {
            setSelectedSession(sessionsData[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  // Filter SKUs based on search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSKUs(skus);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredSKUs(
        skus.filter(
          (sku) =>
            sku.name.toLowerCase().includes(query) ||
            sku.code.toLowerCase().includes(query) ||
            sku.category.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, skus]);

  // Calculate volume when weight changes
  useEffect(() => {
    if (selectedSKU && grossWeightG && selectedSKU.bottleTareG) {
      const weight = parseFloat(grossWeightG);
      if (!isNaN(weight)) {
        const result = calculateVolumeFromWeight({
          grossWeightG: weight,
          tareWeightG: selectedSKU.bottleTareG,
          abvPercent: selectedSKU.abvPercent || 40,
          nominalVolumeMl: selectedSKU.sizeMl,
          standardPourMl: DEFAULT_STANDARD_POUR_ML,
        });
        setCalculation(result);
      } else {
        setCalculation(null);
      }
    } else {
      setCalculation(null);
    }
  }, [selectedSKU, grossWeightG]);

  const handleBluetoothWeight = useCallback((weightG: number) => {
    setGrossWeightG(weightG.toFixed(1));
  }, []);

  const handleBluetoothConnection = useCallback((connected: boolean) => {
    setIsBluetoothConnected(connected);
  }, []);

  const handleSKUSelect = (skuId: string) => {
    const sku = skus.find((s) => s.id === skuId);
    setSelectedSKU(sku || null);
    setGrossWeightG('');
    setCalculation(null);
    setLastSaved(null);
  };

  const handleSave = async () => {
    if (!selectedSKU || !grossWeightG || !calculation) {
      return;
    }

    // Create session if none exists
    let sessionId = selectedSession?.id;
    if (!sessionId) {
      try {
        const sessionRes = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Quick Count ${new Date().toLocaleDateString()}`,
            mode: 'standard',
          }),
        });
        if (sessionRes.ok) {
          const newSession = await sessionRes.json();
          sessionId = newSession.id;
          setSelectedSession(newSession);
          setSessions([newSession, ...sessions]);
        } else {
          alert('Failed to create session');
          return;
        }
      } catch (error) {
        console.error('Error creating session:', error);
        alert('Failed to create session');
        return;
      }
    }

    setIsSaving(true);
    try {
      // For SKU-based measurement, we need to convert to product-based
      // This is a simplified version - you may need to adjust based on your data model
      const response = await fetch(`/api/sessions/${sessionId}/measurements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skuId: selectedSKU.id,
          grossWeightG: parseFloat(grossWeightG),
          tareWeightG: selectedSKU.bottleTareG,
          standardPourMl: DEFAULT_STANDARD_POUR_ML,
        }),
      });

      if (response.ok) {
        setLastSaved(`${selectedSKU.name} - ${calculation.volumeMl.toFixed(0)}ml`);
        setGrossWeightG('');
        setCalculation(null);
        // Auto-clear after 3 seconds
        setTimeout(() => setLastSaved(null), 3000);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save measurement');
      }
    } catch (error) {
      console.error('Error saving measurement:', error);
      alert('Failed to save measurement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickNext = async () => {
    await handleSave();
    // Auto-focus on next bottle (keep same SKU, clear weight)
    setGrossWeightG('');
  };

  const canSave = selectedSKU && grossWeightG && calculation && !isSaving;

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Scale className="h-8 w-8" />
          Weigh & Track Inventory
        </h1>
        <p className="text-muted-foreground mt-1">
          Connect your Bluetooth scale and start weighing bottles
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Setup & Input */}
        <div className="space-y-4">
          {/* Bluetooth Scale Connection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Bluetooth Scale
              </CardTitle>
              <CardDescription>
                Connect your scale for automatic weight capture
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BluetoothScaleConnect
                onWeightReceived={handleBluetoothWeight}
                onConnectionChange={handleBluetoothConnection}
              />
            </CardContent>
          </Card>

          {/* Session Selection */}
          {sessions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Session</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedSession?.id}
                  onValueChange={(id) => {
                    const session = sessions.find((s) => s.id === id);
                    setSelectedSession(session || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.name || 'Untitled Session'}
                        {session.location && ` - ${session.location}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  Measurements will be saved to this session
                </p>
              </CardContent>
            </Card>
          )}

          {/* Product Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wine className="h-5 w-5" />
                Choose Product
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* SKU Select */}
              <Select value={selectedSKU?.id} onValueChange={handleSKUSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {filteredSKUs.map((sku) => (
                    <SelectItem key={sku.id} value={sku.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {sku.category}
                        </Badge>
                        <span>{sku.name}</span>
                        <span className="text-muted-foreground">- {sku.sizeMl}ml</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedSKU && !selectedSKU.bottleTareG && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This product needs bottle weight configuration. Please update it in product settings.
                  </AlertDescription>
                </Alert>
              )}

              {selectedSKU && selectedSKU.bottleTareG && (
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  <p>
                    <strong>Empty Bottle:</strong> {selectedSKU.bottleTareG}g
                  </p>
                  <p>
                    <strong>Full Bottle:</strong> {selectedSKU.sizeMl}ml
                  </p>
                  {selectedSKU.abvPercent && (
                    <p>
                      <strong>Alcohol %:</strong> {selectedSKU.abvPercent}%
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weight Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bottle Weight</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="weight">
                  Gross Weight (grams)
                  {isBluetoothConnected && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Auto-updating from scale
                    </Badge>
                  )}
                </Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={grossWeightG}
                  onChange={(e) => setGrossWeightG(e.target.value)}
                  placeholder={isBluetoothConnected ? 'Place bottle on scale...' : 'Enter weight...'}
                  className={cn(
                    'text-2xl font-mono text-center py-6',
                    calculation && 'border-green-500 bg-green-50'
                  )}
                  disabled={!selectedSKU || !selectedSKU.bottleTareG}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Results & Actions */}
        <div className="space-y-4">
          {/* Calculation Results */}
          {calculation && (
            <Card className="border-2 border-green-500">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  Measurement Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                      <Droplets className="h-4 w-4" />
                      <span className="text-sm font-medium">Volume</span>
                    </div>
                    <p className="text-3xl font-bold text-blue-900">
                      {calculation.volumeMl.toFixed(0)}
                      <span className="text-lg">ml</span>
                    </p>
                  </div>

                  <div className="bg-amber-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-600 mb-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm font-medium">Fill Level</span>
                    </div>
                    <p className="text-3xl font-bold text-amber-900">
                      {calculation.percentFull !== null ? calculation.percentFull.toFixed(1) : '0.0'}
                      <span className="text-lg">%</span>
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Liquid Weight:</span>
                    <span className="font-mono font-semibold">{calculation.netMassG.toFixed(1)}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Servings Left:</span>
                    <span className="font-mono font-semibold">
                      {calculation.poursRemaining !== null ? calculation.poursRemaining.toFixed(1) : '0.0'} pours
                    </span>
                  </div>
                  {calculation.densityGPerMl && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Liquid Density:</span>
                      <span className="font-mono font-semibold">
                        {calculation.densityGPerMl.toFixed(3)} g/ml
                      </span>
                    </div>
                  )}
                </div>

                {/* Visual Bottle Fill */}
                <div className="pt-4">
                  <div className="relative h-32 w-16 mx-auto border-2 border-gray-400 rounded-t-lg rounded-b-3xl overflow-hidden bg-gray-100">
                    <div
                      className="absolute bottom-0 w-full bg-gradient-to-t from-blue-500 to-blue-300 transition-all duration-300"
                      style={{ height: `${calculation.percentFull !== null ? calculation.percentFull : 0}%` }}
                    />
                  </div>
                  <p className="text-center text-xs text-muted-foreground mt-2">
                    Visual Indicator
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {calculation && (
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button
                  onClick={handleSave}
                  disabled={!canSave}
                  className="w-full h-12 text-lg"
                  size="lg"
                >
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Save Measurement
                </Button>

                <Button
                  onClick={handleQuickNext}
                  disabled={!canSave}
                  variant="outline"
                  className="w-full"
                >
                  Save & Next Bottle
                </Button>

                {selectedSession && (
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => router.push(`/sessions/${selectedSession.id}`)}
                  >
                    View Session Details
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Last Saved Confirmation */}
          {lastSaved && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Saved:</strong> {lastSaved}
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          {!calculation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Start</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong className="text-foreground">1. Connect Scale:</strong> Click "Setup" to pair your Bluetooth scale
                </p>
                <p>
                  <strong className="text-foreground">2. Choose Product:</strong> Select the bottle from the dropdown
                </p>
                <p>
                  <strong className="text-foreground">3. Weigh Bottle:</strong> Place on scale (auto-fills) or enter weight manually
                </p>
                <p>
                  <strong className="text-foreground">4. Save:</strong> Review results and save measurement
                </p>
                <Separator className="my-3" />
                <p className="text-xs">
                  ⚡ <strong>Pro Tip:</strong> Keep scale connected and use "Save & Next" for fast inventory counting
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WeighTrackPage() {
  return (
    <Suspense fallback={<div className="container mx-auto py-8 text-center">Loading...</div>}>
      <WeighTrackPageContent />
    </Suspense>
  );
}
