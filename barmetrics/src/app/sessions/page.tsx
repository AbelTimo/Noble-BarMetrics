'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
import { Plus, Play, CheckCircle, Trash2, Eye } from 'lucide-react';

interface Session {
  id: string;
  name: string | null;
  location: string | null;
  startedAt: string;
  completedAt: string | null;
  _count: {
    measurements: number;
  };
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions');
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this session and all its measurements?')) return;

    try {
      await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      fetchSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await fetch(`/api/sessions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedAt: new Date().toISOString() }),
      });
      fetchSessions();
    } catch (error) {
      console.error('Error completing session:', error);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Inventory Sessions</CardTitle>
          <Link href="/sessions/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Session
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sessions yet. Start a new inventory session to begin measuring.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Measurements</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      {session.name || 'Untitled Session'}
                    </TableCell>
                    <TableCell>{session.location || '-'}</TableCell>
                    <TableCell>
                      {new Date(session.startedAt).toLocaleDateString()}{' '}
                      {new Date(session.startedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell className="text-center">
                      {session._count.measurements}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/sessions/${session.id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {!session.completedAt && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleComplete(session.id)}
                            title="Mark as complete"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(session.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
