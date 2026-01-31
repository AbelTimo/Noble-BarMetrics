import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Scale, ClipboardList, FileBarChart, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">BarMetrics</h1>
        <p className="text-muted-foreground text-lg">
          Bar inventory management using bottle weight to estimate remaining liquor
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <Package className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Products</CardTitle>
            <CardDescription>
              Manage your product catalog with SKUs, calibrations, and tare weights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/products">
              <Button className="w-full">
                View Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Scale className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Quick Measure</CardTitle>
            <CardDescription>
              Take a quick measurement without starting a session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/measure">
              <Button className="w-full">
                Measure Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <ClipboardList className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Sessions</CardTitle>
            <CardDescription>
              Start and manage inventory stock-take sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/sessions">
              <Button className="w-full">
                View Sessions
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <FileBarChart className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Reports</CardTitle>
            <CardDescription>
              View reports and export inventory data to CSV
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/reports">
              <Button className="w-full">
                View Reports
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  1
                </div>
                <h3 className="font-semibold">Define Products</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Add your liquor products with brand, ABV, and bottle size. Calibrate
                tare weights for accurate measurements.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  2
                </div>
                <h3 className="font-semibold">Weigh Bottles</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Place bottles on a scale and enter the gross weight. The app
                calculates remaining volume using density formulas.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  3
                </div>
                <h3 className="font-semibold">Track Inventory</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                See remaining volume, percentage full, and pours remaining. Export
                data for analysis and ordering.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
