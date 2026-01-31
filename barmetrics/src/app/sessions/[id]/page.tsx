'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MeasurementForm } from '@/components/measurements/measurement-form';
import { QuickCountForm } from '@/components/measurements/quick-count-form';
import { BottleVisual } from '@/components/measurements/bottle-visual';
import { AnomalyBadge, VarianceBadge } from '@/components/measurements/anomaly-badge';
import { AnomalySummaryPanel } from '@/components/sessions/anomaly-summary-panel';
import {
  ArrowLeft,
  CheckCircle,
  Play,
  Trash2,
  Zap,
  AlertTriangle,
  SkipForward,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  brand: string;
  productName: string;
  category: string;
  nominalVolumeMl: number;
}

interface Measurement {
  id: string;
  productId: string;
  grossWeightG: number;
  tareWeightG: number;
  netMassG: number;
  volumeMl: number;
  percentFull: number | null;
  poursRemaining: number | null;
  measuredAt: string;
  product: Product;
  anomalyFlags: string | null;
  variancePercent: number | null;
  isSkipped: boolean;
}

interface Session {
  id: string;
  name: string | null;
  location: string | null;
  startedAt: string;
  completedAt: string | null;
  mode: string;
  sourceSessionId: string | null;
  defaultPourMl: number | null;
  hasAnomalies: boolean;
  measurements: Measurement[];
}

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/sessions/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSession(data);
      } else {
        router.push('/sessions');
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [id]);

  const handleComplete = async () => {
    try {
      await fetch(`/api/sessions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedAt: new Date().toISOString() }),
      });
      fetchSession();
    } catch (error) {
      console.error('Error completing session:', error);
    }
  };

  const handleDeleteMeasurement = async (measurementId: string) => {
    if (!confirm('Delete this measurement?')) return;

    try {
      await fetch(`/api/measurements/${measurementId}`, { method: 'DELETE' });
      fetchSession();
    } catch (error) {
      console.error('Error deleting measurement:', error);
    }
  };

  const getTotalVolume = () => {
    if (!session) return 0;
    return session.measurements.reduce((sum, m) => sum + m.volumeMl, 0);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-muted-foreground">Session not found</div>
      </div>
    );
  }

  const isQuickCount = session.mode === 'quick_count';

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Link href="/sessions">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sessions
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{session.name || 'Untitled Session'}</h1>
            {isQuickCount && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                <Zap className="mr-1 h-3 w-3" />
                Quick Count
              </Badge>
            )}
            {session.hasAnomalies && (
              <Badge variant="destructive" className="bg-red-100 text-red-800">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Has Anomalies
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-muted-foreground mt-1">
            {session.location && <span>{session.location}</span>}
            <span>
              Started: {new Date(session.startedAt).toLocaleString()}
            </span>
            {session.completedAt ? (
              <Badge variant="secondary">
                <CheckCircle className="mr-1 h-3 w-3" />
                Completed
              </Badge>
            ) : (
              <Badge>
                <Play className="mr-1 h-3 w-3" />
                In Progress
              </Badge>
            )}
          </div>
        </div>
        {!session.completedAt && (
          <Button onClick={handleComplete} variant="outline">
            <CheckCircle className="mr-2 h-4 w-4" />
            Complete Session
          </Button>
        )}
      </div>

      {/* Quick Count Mode - Full width form */}
      {isQuickCount && !session.completedAt && session.sourceSessionId && (
        <div className="mb-6">
          <QuickCountForm
            sessionId={session.id}
            sourceSessionId={session.sourceSessionId}
            defaultPourMl={session.defaultPourMl ?? undefined}
            onMeasurementsSaved={fetchSession}
          />
        </div>
      )}

      {/* Standard Mode or Completed Session View */}
      {(!isQuickCount || session.completedAt) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Standard mode measurement form */}
          {!session.completedAt && !isQuickCount && (
            <div>
              <MeasurementForm
                sessionId={session.id}
                onMeasurementSaved={fetchSession}
              />
            </div>
          )}

          {/* Anomaly Summary Panel - show for completed sessions or when anomalies exist */}
          {(session.completedAt || session.hasAnomalies) && (
            <div className={session.completedAt && !isQuickCount ? '' : 'lg:col-span-2'}>
              <AnomalySummaryPanel sessionId={session.id} />
            </div>
          )}

          {/* Measurements table */}
          <div className={cn(
            session.completedAt ? 'lg:col-span-2' : '',
            isQuickCount && session.completedAt ? '' : ''
          )}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Measurements ({session.measurements.length})</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Total: {(getTotalVolume() / 1000).toFixed(2)} L
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {session.measurements.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {isQuickCount
                      ? 'Enter weights above to start measuring'
                      : 'No measurements yet. Start measuring bottles!'}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Gross</TableHead>
                        <TableHead className="text-right">Volume</TableHead>
                        <TableHead className="text-center">Fill</TableHead>
                        {isQuickCount && (
                          <TableHead className="text-center">Change</TableHead>
                        )}
                        <TableHead className="text-right">Pours</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Time</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {session.measurements.map((measurement) => (
                        <TableRow
                          key={measurement.id}
                          className={cn(
                            measurement.isSkipped && 'bg-muted/30 text-muted-foreground',
                            measurement.anomalyFlags && 'bg-amber-50/50'
                          )}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {measurement.product.brand}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {measurement.product.productName}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {measurement.grossWeightG}g
                          </TableCell>
                          <TableCell className="text-right">
                            {measurement.volumeMl.toFixed(0)}ml
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center">
                              {measurement.percentFull !== null && (
                                <BottleVisual
                                  percentFull={measurement.percentFull}
                                  size="sm"
                                />
                              )}
                            </div>
                          </TableCell>
                          {isQuickCount && (
                            <TableCell className="text-center">
                              <VarianceBadge variancePercent={measurement.variancePercent} />
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            {measurement.poursRemaining?.toFixed(1) || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {measurement.isSkipped ? (
                              <Badge variant="outline" className="text-xs">
                                <SkipForward className="mr-1 h-3 w-3" />
                                Skipped
                              </Badge>
                            ) : measurement.anomalyFlags ? (
                              <AnomalyBadge anomalyFlags={measurement.anomalyFlags} showAll />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {new Date(measurement.measuredAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </TableCell>
                          <TableCell>
                            {!session.completedAt && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteMeasurement(measurement.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
