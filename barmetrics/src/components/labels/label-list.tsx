'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, QrCode, MapPin, History } from 'lucide-react';
import { getLabelStatusColor, LABEL_STATUSES } from '@/lib/labels';

interface Label {
  id: string;
  code: string;
  status: string;
  location: string | null;
  assignedAt: string | null;
  createdAt: string;
  sku: {
    id: string;
    code: string;
    name: string;
    category: string;
  };
  _count: { events: number };
}

export function LabelList() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLabels = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status && status !== 'all') params.set('status', status);

      const response = await fetch(`/api/labels?${params.toString()}`);
      const data = await response.json();
      setLabels(data);
    } catch (error) {
      console.error('Error fetching labels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLabels();
  }, [search, status]);

  const statusCounts = {
    all: labels.length,
    UNASSIGNED: labels.filter((l) => l.status === 'UNASSIGNED').length,
    ASSIGNED: labels.filter((l) => l.status === 'ASSIGNED').length,
    RETIRED: labels.filter((l) => l.status === 'RETIRED').length,
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Labels
        </CardTitle>
        <Button asChild>
          <Link href="/labels/generate">
            <Plus className="mr-2 h-4 w-4" />
            Generate Labels
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search label codes (e.g., BM-ABC123)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses ({statusCounts.all})</SelectItem>
                {LABEL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s} ({statusCounts[s]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            {LABEL_STATUSES.map((s) => (
              <Badge
                key={s}
                className={`${getLabelStatusColor(s)} cursor-pointer`}
                variant="outline"
                onClick={() => setStatus(status === s ? '' : s)}
              >
                {s}: {statusCounts[s]}
              </Badge>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : labels.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No labels found. Generate your first batch to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label Code</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Events</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {labels.map((label) => (
                <TableRow key={label.id}>
                  <TableCell>
                    <Link
                      href={`/labels/${label.id}`}
                      className="font-mono font-medium hover:underline"
                    >
                      {label.code}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/skus/${label.sku.id}`}
                      className="hover:underline"
                    >
                      <span className="font-mono text-sm">{label.sku.code}</span>
                      <br />
                      <span className="text-xs text-muted-foreground">{label.sku.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={getLabelStatusColor(label.status as 'UNASSIGNED' | 'ASSIGNED' | 'RETIRED')}
                      variant="outline"
                    >
                      {label.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {label.location ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {label.location}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(label.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{label._count.events}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="icon" title="View History">
                      <Link href={`/labels/${label.id}`}>
                        <History className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
