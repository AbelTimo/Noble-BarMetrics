'use client';

import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Zap, Copy, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_STANDARD_POUR_ML } from '@/lib/calculations';

interface Session {
  id: string;
  name: string | null;
  location: string | null;
  startedAt: string;
  completedAt: string | null;
  mode: string;
  _count: { measurements: number };
}

type SessionMode = 'standard' | 'quick_count';

export default function NewSessionPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [mode, setMode] = useState<SessionMode>('standard');
  const [sourceSessionId, setSourceSessionId] = useState<string>('');
  const [defaultPourMl, setDefaultPourMl] = useState(String(DEFAULT_STANDARD_POUR_ML));
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [templatePreview, setTemplatePreview] = useState<{ totalProducts: number } | null>(null);

  // Fetch completed sessions for quick count source
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch('/api/sessions');
        if (response.ok) {
          const data = await response.json();
          // Filter to sessions with measurements
          const sessionsWithMeasurements = data.filter(
            (s: Session) => s._count.measurements > 0
          );
          setSessions(sessionsWithMeasurements);
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);
      }
    };
    fetchSessions();
  }, []);

  // Fetch template preview when source session selected
  useEffect(() => {
    const fetchTemplate = async () => {
      if (!sourceSessionId) {
        setTemplatePreview(null);
        return;
      }

      try {
        const response = await fetch(`/api/sessions/${sourceSessionId}/template`);
        if (response.ok) {
          const data = await response.json();
          setTemplatePreview({ totalProducts: data.totalProducts });
        }
      } catch (error) {
        console.error('Error fetching template:', error);
      }
    };

    if (mode === 'quick_count') {
      fetchTemplate();
    }
  }, [sourceSessionId, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'quick_count' && !sourceSessionId) {
      alert('Please select a source session for Quick Count mode');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || `${mode === 'quick_count' ? 'Quick Count' : 'Session'} ${new Date().toLocaleDateString()}`,
          location: location || null,
          mode,
          sourceSessionId: mode === 'quick_count' ? sourceSessionId : null,
          defaultPourMl: parseFloat(defaultPourMl) || DEFAULT_STANDARD_POUR_ML,
        }),
      });

      if (response.ok) {
        const session = await response.json();
        router.push(`/sessions/${session.id}`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to create session');
    } finally {
      setIsLoading(false);
    }
  };

  const completedSessions = sessions.filter((s) => s.completedAt);

  return (
    <div className="container mx-auto py-8 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Start New Session</CardTitle>
          <CardDescription>
            Choose standard mode for detailed inventory or quick count for rapid updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mode Selection */}
            <div className="space-y-3">
              <Label>Mode</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode('standard')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors',
                    mode === 'standard'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/30'
                  )}
                >
                  <ClipboardList className={cn(
                    'h-8 w-8',
                    mode === 'standard' ? 'text-primary' : 'text-muted-foreground'
                  )} />
                  <span className="font-medium">Standard</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Full inventory with product selection
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('quick_count')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors',
                    mode === 'quick_count'
                      ? 'border-amber-500 bg-amber-500/5'
                      : 'border-muted hover:border-muted-foreground/30'
                  )}
                >
                  <Zap className={cn(
                    'h-8 w-8',
                    mode === 'quick_count' ? 'text-amber-500' : 'text-muted-foreground'
                  )} />
                  <span className="font-medium">Quick Count</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Copy from previous, just enter weights
                  </span>
                </button>
              </div>
            </div>

            {/* Quick Count Source Session */}
            {mode === 'quick_count' && (
              <div className="space-y-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2">
                  <Copy className="h-4 w-4 text-amber-600" />
                  <Label className="text-amber-800">Copy from Session</Label>
                </div>
                <Select value={sourceSessionId} onValueChange={setSourceSessionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a previous session" />
                  </SelectTrigger>
                  <SelectContent>
                    {completedSessions.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No completed sessions available
                      </div>
                    ) : (
                      completedSessions.map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          <div className="flex items-center gap-2">
                            <span>{session.name || 'Untitled'}</span>
                            <Badge variant="secondary" className="text-xs">
                              {session._count.measurements} items
                            </Badge>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                {templatePreview && (
                  <div className="flex items-center gap-2 text-sm text-amber-700">
                    <Calendar className="h-4 w-4" />
                    <span>{templatePreview.totalProducts} products will be loaded</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="defaultPour" className="text-amber-800">
                    Standard Pour Size (ml)
                  </Label>
                  <Input
                    id="defaultPour"
                    type="number"
                    value={defaultPourMl}
                    onChange={(e) => setDefaultPourMl(e.target.value)}
                    placeholder="30"
                    className="bg-white"
                  />
                </div>
              </div>
            )}

            {/* Session Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Session Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`${mode === 'quick_count' ? 'Quick Count' : 'Session'} ${new Date().toLocaleDateString()}`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Main Bar, Patio Bar"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || (mode === 'quick_count' && !sourceSessionId)}
                className={cn(
                  'flex-1',
                  mode === 'quick_count' && 'bg-amber-500 hover:bg-amber-600'
                )}
              >
                {isLoading ? 'Creating...' : 'Start Session'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
