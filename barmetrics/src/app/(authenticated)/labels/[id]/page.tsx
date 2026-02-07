'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { LabelHistoryTimeline } from '@/components/labels/label-history-timeline';
import { getLabelStatusColor, DEFAULT_LOCATIONS, RETIREMENT_REASONS, REPRINT_REASONS } from '@/lib/labels';
import { ArrowLeft, MapPin, QrCode, Tag, AlertTriangle, RefreshCw, Printer } from 'lucide-react';

interface LabelDetail {
  id: string;
  code: string;
  status: string;
  location: string | null;
  assignedAt: string | null;
  retiredAt: string | null;
  retiredReason: string | null;
  replacedByLabelId: string | null;
  replacesLabelId: string | null;
  replacedByLabel?: { id: string; code: string } | null;
  replacesLabel?: { id: string; code: string } | null;
  createdAt: string;
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
    location: string | null;
    performedBy: string | null;
    createdAt: string;
  }[];
}

export default function LabelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [label, setLabel] = useState<LabelDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locations, setLocations] = useState<string[]>([]);

  // Assignment dialog state
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignLocation, setAssignLocation] = useState('');
  const [assignPerformedBy, setAssignPerformedBy] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Retire dialog state
  const [showRetireDialog, setShowRetireDialog] = useState(false);
  const [retireReason, setRetireReason] = useState<string>('DAMAGED');
  const [retireDescription, setRetireDescription] = useState('');
  const [retirePerformedBy, setRetirePerformedBy] = useState('');
  const [isRetiring, setIsRetiring] = useState(false);

  // Reprint dialog state
  const [showReprintDialog, setShowReprintDialog] = useState(false);
  const [reprintReason, setReprintReason] = useState<string>('DAMAGED');
  const [reprintDescription, setReprintDescription] = useState('');
  const [reprintPerformedBy, setReprintPerformedBy] = useState('');
  const [isReprinting, setIsReprinting] = useState(false);

  const fetchLabel = async () => {
    try {
      const response = await fetch(`/api/labels/${id}`);
      if (response.ok) {
        const data = await response.json();
        setLabel(data);
      }
    } catch (error) {
      console.error('Error fetching label:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      if (response.ok) {
        const data = await response.json();
        setLocations(data.map((l: { name: string }) => l.name));
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([...DEFAULT_LOCATIONS]);
    }
  };

  useEffect(() => {
    fetchLabel();
    fetchLocations();
  }, [id]);

  const handleAssign = async () => {
    if (!assignLocation) {
      alert('Please select a location');
      return;
    }

    setIsAssigning(true);
    try {
      const response = await fetch(`/api/labels/${id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: assignLocation,
          performedBy: assignPerformedBy || null,
        }),
      });

      if (response.ok) {
        setShowAssignDialog(false);
        setAssignLocation('');
        setAssignPerformedBy('');
        fetchLabel();
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

  const handleRetire = async () => {
    setIsRetiring(true);
    try {
      const response = await fetch(`/api/labels/${id}/retire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: retireReason,
          description: retireDescription || null,
          performedBy: retirePerformedBy || null,
        }),
      });

      if (response.ok) {
        setShowRetireDialog(false);
        setRetireReason('DAMAGED');
        setRetireDescription('');
        setRetirePerformedBy('');
        fetchLabel();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error retiring label:', error);
      alert('Failed to retire label');
    } finally {
      setIsRetiring(false);
    }
  };

  const handleReprint = async () => {
    setIsReprinting(true);
    try {
      const response = await fetch(`/api/labels/${id}/reprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reprintReason,
          description: reprintDescription || null,
          performedBy: reprintPerformedBy || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setShowReprintDialog(false);
        setReprintReason('DAMAGED');
        setReprintDescription('');
        setReprintPerformedBy('');
        // Navigate to the new label
        router.push(`/labels/${data.newLabel.id}`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error reprinting label:', error);
      alert('Failed to reprint label');
    } finally {
      setIsReprinting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!label) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-muted-foreground">Label not found</div>
      </div>
    );
  }

  const primaryProduct = label.sku.products.find((p) => p.isPrimary)?.product;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/labels">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              <h1 className="text-2xl font-bold font-mono">{label.code}</h1>
              <Badge
                className={getLabelStatusColor(label.status as 'UNASSIGNED' | 'ASSIGNED' | 'RETIRED')}
                variant="outline"
              >
                {label.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {label.sku.code} - {label.sku.name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {label.status !== 'RETIRED' && (
            <>
              <Button variant="outline" onClick={() => setShowAssignDialog(true)}>
                <MapPin className="mr-2 h-4 w-4" />
                {label.status === 'ASSIGNED' ? 'Reassign' : 'Assign'}
              </Button>
              <Button variant="outline" onClick={() => setShowReprintDialog(true)}>
                <Printer className="mr-2 h-4 w-4" />
                Reprint
              </Button>
              <Button variant="destructive" onClick={() => setShowRetireDialog(true)}>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Retire
              </Button>
            </>
          )}
        </div>
      </div>

      {label.status === 'RETIRED' && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-destructive font-medium">
            <AlertTriangle className="h-5 w-5" />
            This label has been retired
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Reason: {label.retiredReason} • Retired on{' '}
            {label.retiredAt ? new Date(label.retiredAt).toLocaleString() : 'Unknown'}
          </p>
          {label.replacedByLabel && (
            <p className="text-sm mt-2">
              <RefreshCw className="h-3 w-3 inline mr-1" />
              Replaced by:{' '}
              <Link href={`/labels/${label.replacedByLabel.id}`} className="font-mono hover:underline text-primary">
                {label.replacedByLabel.code}
              </Link>
            </p>
          )}
        </div>
      )}

      {label.replacesLabel && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-800 font-medium">
            <RefreshCw className="h-5 w-5" />
            This is a replacement label
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Replaces:{' '}
            <Link href={`/labels/${label.replacesLabel.id}`} className="font-mono hover:underline text-primary">
              {label.replacesLabel.code}
            </Link>
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Label Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge
                  className={getLabelStatusColor(label.status as 'UNASSIGNED' | 'ASSIGNED' | 'RETIRED')}
                  variant="outline"
                >
                  {label.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium flex items-center gap-1">
                  {label.location ? (
                    <>
                      <MapPin className="h-3 w-3" />
                      {label.location}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Not assigned</span>
                  )}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p>{new Date(label.createdAt).toLocaleString()}</p>
            </div>
            {label.assignedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Assigned</p>
                <p>{new Date(label.assignedAt).toLocaleString()}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="h-4 w-4" />
              SKU Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">SKU Code</p>
              <Link href={`/skus/${label.sku.id}`} className="font-mono font-medium hover:underline">
                {label.sku.code}
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <Badge variant="outline">{label.sku.category}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Size</p>
                <p className="font-medium">{label.sku.sizeMl}ml</p>
              </div>
            </div>
            {primaryProduct && (
              <div>
                <p className="text-sm text-muted-foreground">Primary Product</p>
                <Link
                  href={`/products/${primaryProduct.id}`}
                  className="hover:underline"
                >
                  {primaryProduct.brand} {primaryProduct.productName}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Event History</CardTitle>
        </CardHeader>
        <CardContent>
          <LabelHistoryTimeline events={label.events} />
        </CardContent>
      </Card>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Label to Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Select value={assignLocation} onValueChange={setAssignLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select or enter location" />
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
              <Label htmlFor="performedBy">Performed By</Label>
              <Input
                id="performedBy"
                value={assignPerformedBy}
                onChange={(e) => setAssignPerformedBy(e.target.value)}
                placeholder="Your name (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={!assignLocation || isAssigning}>
              {isAssigning ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retire Dialog */}
      <Dialog open={showRetireDialog} onOpenChange={setShowRetireDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retire Label</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm">
              Retiring a label marks it as no longer in use. This action cannot be undone.
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Select value={retireReason} onValueChange={setRetireReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RETIREMENT_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={retireDescription}
                onChange={(e) => setRetireDescription(e.target.value)}
                placeholder="Additional details (optional)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retirePerformedBy">Performed By</Label>
              <Input
                id="retirePerformedBy"
                value={retirePerformedBy}
                onChange={(e) => setRetirePerformedBy(e.target.value)}
                placeholder="Your name (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRetireDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRetire} disabled={isRetiring}>
              {isRetiring ? 'Retiring...' : 'Retire Label'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reprint Dialog */}
      <Dialog open={showReprintDialog} onOpenChange={setShowReprintDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprint Label</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-blue-800">This will:</p>
              <ul className="list-disc list-inside mt-1 text-blue-700">
                <li>Create a new replacement label with same SKU</li>
                <li>Retire the current label ({label.code})</li>
                <li>Link the new label to this one for audit trail</li>
                {label.status === 'ASSIGNED' && label.location && (
                  <li>Transfer the location ({label.location}) to the new label</li>
                )}
              </ul>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reprintReason">Reason *</Label>
              <Select value={reprintReason} onValueChange={setReprintReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPRINT_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reprintDescription">Description</Label>
              <Input
                id="reprintDescription"
                value={reprintDescription}
                onChange={(e) => setReprintDescription(e.target.value)}
                placeholder="Additional details (optional)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reprintPerformedBy">Performed By</Label>
              <Input
                id="reprintPerformedBy"
                value={reprintPerformedBy}
                onChange={(e) => setReprintPerformedBy(e.target.value)}
                placeholder="Your name (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReprintDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReprint} disabled={isReprinting}>
              <Printer className="mr-2 h-4 w-4" />
              {isReprinting ? 'Creating...' : 'Create Replacement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
