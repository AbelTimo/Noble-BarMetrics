'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  Download,
  FileBarChart,
  Package,
  Droplet,
  AlertTriangle,
  CalendarRange,
} from 'lucide-react';

interface Summary {
  totalMeasurements: number;
  totalVolumeMl: number;
  totalVolumeL: number;
  uniqueProducts: number;
  sessionCount: number;
  avgPercentFull: number | null;
  byCategory: {
    category: string;
    count: number;
    volumeMl: number;
    volumeL: number;
  }[];
  lowStock: {
    productId: string;
    brand: string;
    productName: string;
    percentFull: number | null;
    volumeMl: number;
    measuredAt: string;
  }[];
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', new Date(startDate).toISOString());
      if (endDate) params.set('endDate', new Date(endDate).toISOString());

      const response = await fetch(`/api/reports/summary?${params.toString()}`);
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleFilter = () => {
    fetchSummary();
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', new Date(startDate).toISOString());
    if (endDate) params.set('endDate', new Date(endDate).toISOString());

    window.location.href = `/api/reports/export?${params.toString()}`;
  };

  const getStatusColor = (percent: number | null) => {
    if (percent === null) return 'bg-gray-500';
    if (percent >= 75) return 'bg-green-500';
    if (percent >= 50) return 'bg-yellow-500';
    if (percent >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Reports & Export</h1>
        <p className="text-muted-foreground">
          View inventory statistics and export measurement data
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5" />
            Date Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={handleFilter}>Apply Filter</Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : summary ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Measurements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <FileBarChart className="h-8 w-8 text-muted-foreground" />
                  <span className="text-3xl font-bold">{summary.totalMeasurements}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Products Measured</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Package className="h-8 w-8 text-muted-foreground" />
                  <span className="text-3xl font-bold">{summary.uniqueProducts}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Volume</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Droplet className="h-8 w-8 text-muted-foreground" />
                  <span className="text-3xl font-bold">{summary.totalVolumeL.toFixed(2)} L</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg Fill Level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <span className="text-3xl font-bold">
                    {summary.avgPercentFull !== null
                      ? `${summary.avgPercentFull.toFixed(0)}%`
                      : 'N/A'}
                  </span>
                  {summary.avgPercentFull !== null && (
                    <Progress value={summary.avgPercentFull} className="h-2" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Volume by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {summary.byCategory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No data available
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Volume (L)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.byCategory.map((cat) => (
                        <TableRow key={cat.category}>
                          <TableCell>
                            <Badge variant="outline">{cat.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{cat.count}</TableCell>
                          <TableCell className="text-right">
                            {cat.volumeL.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Low Stock Alert
                </CardTitle>
                <CardDescription>
                  Products below 25% remaining
                </CardDescription>
              </CardHeader>
              <CardContent>
                {summary.lowStock.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No low stock items
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                        <TableHead className="text-right">Volume</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.lowStock.map((item, index) => (
                        <TableRow key={`${item.productId}-${index}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.brand}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.productName}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Progress
                                value={item.percentFull || 0}
                                className={`w-16 h-2 ${getStatusColor(item.percentFull)}`}
                              />
                              <span className="text-sm">
                                {item.percentFull?.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {item.volumeMl.toFixed(0)}ml
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
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No data available
        </div>
      )}
    </div>
  );
}
