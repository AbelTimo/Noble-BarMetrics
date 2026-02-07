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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PackagePlus, Clock, CheckCircle, XCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface LiquorRequest {
  id: string;
  quantity: number;
  urgency: string;
  reason: string | null;
  notes: string | null;
  status: string;
  requestedAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  sku: {
    id: string;
    code: string;
    name: string;
    category: string;
    sizeMl: number;
  } | null;
  product: {
    id: string;
    brand: string;
    productName: string;
    category: string;
  } | null;
  requester: {
    id: string;
    displayName: string;
    role: string;
  };
  reviewer: {
    id: string;
    displayName: string;
  } | null;
}

export default function RequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LiquorRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchRequests = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/requests?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });

      if (response.ok) {
        fetchRequests();
      } else {
        alert('Failed to approve request');
      }
    } catch (error) {
      alert('Failed to approve request');
    }
  };

  const handleReject = async (id: string) => {
    const notes = prompt('Reason for rejection (optional):');
    try {
      const response = await fetch(`/api/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'REJECTED',
          reviewNotes: notes || null,
        }),
      });

      if (response.ok) {
        fetchRequests();
      } else {
        alert('Failed to reject request');
      }
    } catch (error) {
      alert('Failed to reject request');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this request?')) return;

    try {
      const response = await fetch(`/api/requests/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchRequests();
      } else {
        alert('Failed to delete request');
      }
    } catch (error) {
      alert('Failed to delete request');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Badge>;
      case 'APPROVED':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="mr-1 h-3 w-3" />
          Approved
        </Badge>;
      case 'REJECTED':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <XCircle className="mr-1 h-3 w-3" />
          Rejected
        </Badge>;
      case 'FULFILLED':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <CheckCircle className="mr-1 h-3 w-3" />
          Fulfilled
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'URGENT':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'HIGH':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">High</Badge>;
      case 'NORMAL':
        return <Badge variant="secondary">Normal</Badge>;
      case 'LOW':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">{urgency}</Badge>;
    }
  };

  const isManager = user?.role === 'MANAGER';
  const isBartender = user?.role === 'BARTENDER';

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Liquor Requests</h1>
          <p className="text-muted-foreground">
            {isManager
              ? 'Review and approve inventory requests'
              : isBartender
                ? 'Submit and manage your inventory requests'
                : 'View inventory requests'}
          </p>
        </div>
        {isBartender && (
          <Button asChild>
            <Link href="/requests/new">
              <PackagePlus className="mr-2 h-4 w-4" />
              New Request
            </Link>
          </Button>
        )}
      </div>

      <div className="mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Filter:</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="FULFILLED">Fulfilled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {statusFilter === 'all' ? 'All Requests' : `${statusFilter} Requests`}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({requests.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No requests found.
              {isBartender && (
                <Link href="/requests/new" className="text-primary hover:underline ml-1">
                  Create your first request
                </Link>
              )}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                  {isManager && <TableHead className="text-center">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {request.sku?.name || `${request.product?.brand} ${request.product?.productName}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {request.sku?.category || request.product?.category}
                          {request.sku && ` - ${request.sku.sizeMl}ml`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{request.quantity}</TableCell>
                    <TableCell>{getUrgencyBadge(request.urgency)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {request.reason || '-'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{request.requester.displayName}</p>
                        <p className="text-xs text-muted-foreground">{request.requester.role}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </TableCell>
                    {isManager && (
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          {request.status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApprove(request.id)}
                                className="text-green-600 border-green-200 hover:bg-green-50"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(request.id)}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(request.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
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
