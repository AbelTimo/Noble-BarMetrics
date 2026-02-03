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
import { getLabelEventColor, LABEL_EVENT_TYPES } from '@/lib/labels';
import { Search, History, QrCode, Tag, User, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';

interface AuditEvent {
  id: string;
  labelId: string;
  eventType: string;
  description: string | null;
  location: string | null;
  fromValue: string | null;
  toValue: string | null;
  userId: string | null;
  deviceId: string | null;
  performedBy: string | null;
  createdAt: string;
  label: {
    id: string;
    code: string;
    sku: {
      id: string;
      code: string;
      name: string;
      category: string;
    };
  };
}

interface AuditResponse {
  events: AuditEvent[];
  total: number;
  limit: number;
  offset: number;
  eventTypeCounts: Record<string, number>;
}

export default function AuditLabelsPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [eventType, setEventType] = useState<string>('');
  const [labelCode, setLabelCode] = useState('');
  const [skuCode, setSkuCode] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (eventType && eventType !== 'all') params.set('eventType', eventType);
      if (labelCode) params.set('labelCode', labelCode);
      if (skuCode) params.set('skuCode', skuCode);
      if (performedBy) params.set('performedBy', performedBy);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('limit', String(limit));
      params.set('offset', String(offset));

      const response = await fetch(`/api/audit/labels?${params.toString()}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [eventType, offset]);

  const handleSearch = () => {
    setOffset(0);
    fetchAuditLogs();
  };

  const handleClearFilters = () => {
    setEventType('');
    setLabelCode('');
    setSkuCode('');
    setPerformedBy('');
    setStartDate('');
    setEndDate('');
    setOffset(0);
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Label Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            {/* Filter row 1 */}
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Event Type</label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Events" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    {LABEL_EVENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type} {data?.eventTypeCounts[type] ? `(${data.eventTypeCounts[type]})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Label Code</label>
                <Input
                  placeholder="e.g., BM-ABC123"
                  value={labelCode}
                  onChange={(e) => setLabelCode(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">SKU Code</label>
                <Input
                  placeholder="e.g., VODKA-750"
                  value={skuCode}
                  onChange={(e) => setSkuCode(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Performed By</label>
                <Input
                  placeholder="User name"
                  value={performedBy}
                  onChange={(e) => setPerformedBy(e.target.value)}
                />
              </div>
            </div>

            {/* Filter row 2 */}
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2 col-span-2">
                <Button onClick={handleSearch}>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Event type quick filters */}
            {data && (
              <div className="flex gap-2 flex-wrap">
                {LABEL_EVENT_TYPES.map((type) => {
                  const count = data.eventTypeCounts[type] || 0;
                  if (count === 0) return null;
                  return (
                    <Badge
                      key={type}
                      className={`${getLabelEventColor(type)} cursor-pointer ${eventType === type ? 'ring-2 ring-offset-2' : ''}`}
                      variant="outline"
                      onClick={() => setEventType(eventType === type ? '' : type)}
                    >
                      {type}: {count}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : !data || data.events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit events found
            </div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground mb-4">
                Showing {offset + 1}-{Math.min(offset + limit, data.total)} of {data.total} events
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Performed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(event.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={getLabelEventColor(event.eventType as any)}
                          variant="outline"
                        >
                          {event.eventType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/labels/${event.label.id}`}
                          className="font-mono text-sm hover:underline flex items-center gap-1"
                        >
                          <QrCode className="h-3 w-3" />
                          {event.label.code}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/skus/${event.label.sku.id}`}
                          className="hover:underline flex items-center gap-1"
                        >
                          <Tag className="h-3 w-3" />
                          {event.label.sku.code}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={event.description || ''}>
                        {event.description || '-'}
                      </TableCell>
                      <TableCell>
                        {event.location ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {event.performedBy || event.userId ? (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {event.performedBy || event.userId}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={offset === 0}
                      onClick={() => setOffset(Math.max(0, offset - limit))}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={offset + limit >= data.total}
                      onClick={() => setOffset(offset + limit)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
