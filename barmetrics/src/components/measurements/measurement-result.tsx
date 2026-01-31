'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BottleVisual } from './bottle-visual';
import { Droplet, GlassWater, Percent, Wine } from 'lucide-react';

interface MeasurementResultProps {
  result: {
    netMassG: number;
    densityGPerMl: number;
    volumeMl: number;
    volumeL: number;
    percentFull: number | null;
    poursRemaining: number | null;
  };
  productName?: string;
  standardPourMl?: number;
}

export function MeasurementResult({
  result,
  productName,
  standardPourMl = 44,
}: MeasurementResultProps) {
  const getStatusBadge = (percent: number | null) => {
    if (percent === null) return null;
    if (percent >= 75) return <Badge className="bg-green-500">Full</Badge>;
    if (percent >= 50) return <Badge className="bg-yellow-500">Half</Badge>;
    if (percent >= 25) return <Badge className="bg-orange-500">Low</Badge>;
    return <Badge className="bg-red-500">Critical</Badge>;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {productName || 'Measurement Result'}
          </CardTitle>
          {result.percentFull !== null && getStatusBadge(result.percentFull)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-8">
          {result.percentFull !== null && (
            <div className="flex-shrink-0">
              <BottleVisual percentFull={result.percentFull} size="lg" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 flex-1">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Droplet className="h-4 w-4" />
                Volume
              </div>
              <p className="text-2xl font-bold">{result.volumeMl.toFixed(0)} ml</p>
              <p className="text-sm text-muted-foreground">
                ({result.volumeL.toFixed(3)} L)
              </p>
            </div>

            {result.percentFull !== null && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Percent className="h-4 w-4" />
                  Remaining
                </div>
                <p className="text-2xl font-bold">{result.percentFull.toFixed(1)}%</p>
              </div>
            )}

            {result.poursRemaining !== null && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Wine className="h-4 w-4" />
                  Pours Left
                </div>
                <p className="text-2xl font-bold">{result.poursRemaining.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">
                  ({standardPourMl}ml pour)
                </p>
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <GlassWater className="h-4 w-4" />
                Net Mass
              </div>
              <p className="text-2xl font-bold">{result.netMassG.toFixed(0)} g</p>
              <p className="text-sm text-muted-foreground">
                Density: {result.densityGPerMl.toFixed(3)} g/ml
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
