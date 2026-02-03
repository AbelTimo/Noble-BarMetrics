'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getLabelStatusColor, DEFAULT_LOCATIONS } from '@/lib/labels';
import {
  QrCode,
  Tag,
  MapPin,
  AlertTriangle,
  History,
  X,
  Check,
} from 'lucide-react';
import { useState } from 'react';

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

interface ScanResultCardProps {
  result: ScanResult;
  onClose: () => void;
  onAssigned: () => void;
  locations: string[];
}

export function ScanResultCard({
  result,
  onClose,
  onAssigned,
  locations,
}: ScanResultCardProps) {
  const [showAssign, setShowAssign] = useState(false);
  const [assignLocation, setAssignLocation] = useState('');
  const [assignPerformedBy, setAssignPerformedBy] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const primaryProduct = result.sku.products.find((p) => p.isPrimary)?.product;

  const handleAssign = async () => {
    if (!assignLocation) return;

    setIsAssigning(true);
    try {
      const response = await fetch(`/api/labels/${result.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: assignLocation,
          performedBy: assignPerformedBy || null,
        }),
      });

      if (response.ok) {
        setShowAssign(false);
        onAssigned();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error assigning label:', error);
      alert('Failed to assign label');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Card className="border-2 border-primary">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            <span className="font-mono">{result.code}</span>
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {result.warning && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">{result.warning}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Badge
            className={getLabelStatusColor(result.status as 'UNASSIGNED' | 'ASSIGNED' | 'RETIRED')}
            variant="outline"
          >
            {result.status}
          </Badge>
          {result.location && (
            <span className="flex items-center gap-1 text-sm">
              <MapPin className="h-3 w-3" />
              {result.location}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Tag className="h-3 w-3" />
              SKU
            </p>
            <p className="font-mono font-medium">{result.sku.code}</p>
            <p className="text-sm text-muted-foreground">{result.sku.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Details</p>
            <p className="text-sm">
              {result.sku.category} - {result.sku.sizeMl}ml
            </p>
            {primaryProduct && (
              <p className="text-sm text-muted-foreground">
                {primaryProduct.brand} {primaryProduct.productName}
              </p>
            )}
          </div>
        </div>

        {result.events.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Recent Activity</p>
            <div className="space-y-1">
              {result.events.slice(0, 3).map((event) => (
                <div key={event.id} className="text-sm flex justify-between">
                  <span>
                    <Badge variant="secondary" className="mr-2 text-xs">
                      {event.eventType}
                    </Badge>
                    {event.description}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(event.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {showAssign ? (
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={assignLocation} onValueChange={setAssignLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or type a new location"
                value={assignLocation}
                onChange={(e) => setAssignLocation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Performed By (optional)</Label>
              <Input
                value={assignPerformedBy}
                onChange={(e) => setAssignPerformedBy(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAssign(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAssign}
                disabled={!assignLocation || isAssigning}
              >
                <Check className="mr-2 h-4 w-4" />
                {isAssigning ? 'Assigning...' : 'Confirm'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            {result.status !== 'RETIRED' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAssign(true)}
              >
                <MapPin className="mr-2 h-4 w-4" />
                {result.status === 'ASSIGNED' ? 'Reassign' : 'Assign'}
              </Button>
            )}
            <Button asChild variant="outline" size="sm">
              <Link href={`/labels/${result.id}`}>
                <History className="mr-2 h-4 w-4" />
                View Details
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
