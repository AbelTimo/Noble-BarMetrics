'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, DollarSign, Trash2 } from 'lucide-react';
import { SALE_SHIFTS } from '@/lib/validations';
import { toast } from 'sonner';

interface SaleItem {
  id: string;
  type: string;
  quantity: number;
  recipe: { id: string; name: string } | null;
  product: { id: string; brand: string; productName: string } | null;
}

interface Sale {
  id: string;
  date: string;
  shift: string | null;
  notes: string | null;
  source: string;
  items: SaleItem[];
  createdAt: string;
}

export function SaleList() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [shiftFilter, setShiftFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const fetchSales = async () => {
    try {
      const params = new URLSearchParams();
      if (shiftFilter) params.set('shift', shiftFilter);
      if (dateFilter) {
        params.set('startDate', new Date(dateFilter + 'T00:00:00').toISOString());
        params.set('endDate', new Date(dateFilter + 'T23:59:59').toISOString());
      }
      const res = await fetch(`/api/sales?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      setSales(await res.json());
    } catch {
      toast.error('Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSales(); }, [shiftFilter, dateFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this sale record?')) return;
    try {
      const res = await fetch(`/api/sales/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      toast.success('Sale deleted');
      fetchSales();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const totalItems = (items: SaleItem[]) => items.reduce((sum, i) => sum + i.quantity, 0);

  const shiftColor = (shift: string | null) => {
    const colors: Record<string, string> = {
      MORNING: 'bg-yellow-100 text-yellow-800',
      AFTERNOON: 'bg-orange-100 text-orange-800',
      EVENING: 'bg-blue-100 text-blue-800',
      NIGHT: 'bg-purple-100 text-purple-800',
    };
    return colors[shift || ''] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-[0.15em] uppercase text-[#3E3226]">Sales</h1>
          <p className="text-sm text-[#3E3226]/60 mt-1">Record sales for variance calculation</p>
        </div>
        <Button asChild className="bg-[#3E3226] hover:bg-[#3E3226]/90 text-[#F5F0E8]">
          <Link href="/sales/new">
            <Plus className="h-4 w-4 mr-2" />
            Record Sale
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 rounded-md border border-[#3E3226]/20 bg-white/50 text-sm text-[#3E3226]"
        />
        <select
          value={shiftFilter}
          onChange={(e) => setShiftFilter(e.target.value)}
          className="px-3 py-2 rounded-md border border-[#3E3226]/20 bg-white/50 text-sm text-[#3E3226]"
        >
          <option value="">All Shifts</option>
          {SALE_SHIFTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#3E3226]/50">Loading sales...</div>
      ) : sales.length === 0 ? (
        <Card className="p-12 text-center bg-white/30 border-[#3E3226]/10">
          <DollarSign className="h-12 w-12 mx-auto mb-4 text-[#3E3226]/30" />
          <h3 className="text-lg font-semibold text-[#3E3226]/70 mb-2">No sales recorded</h3>
          <p className="text-sm text-[#3E3226]/50 mb-4">Record sales data to calculate variance</p>
          <Button asChild className="bg-[#3E3226] hover:bg-[#3E3226]/90 text-[#F5F0E8]">
            <Link href="/sales/new">
              <Plus className="h-4 w-4 mr-2" />
              Record First Sale
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {sales.map((sale) => (
            <Card key={sale.id} className="p-4 bg-white/40 border-[#3E3226]/10 hover:border-[#3E3226]/20 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#3E3226]">
                        {new Date(sale.date).toLocaleDateString()}
                      </span>
                      {sale.shift && (
                        <Badge className={`text-[10px] ${shiftColor(sale.shift)}`}>
                          {sale.shift}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] border-[#3E3226]/20 text-[#3E3226]/50">
                        {sale.source}
                      </Badge>
                    </div>
                    <div className="text-sm text-[#3E3226]/60 mt-1">
                      {sale.items.map((item) => (
                        <span key={item.id} className="mr-3">
                          {item.quantity}x {item.recipe?.name || (item.product ? `${item.product.brand} ${item.product.productName}` : item.type)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-[#3E3226]">{totalItems(sale.items)} items</span>
                  <button
                    onClick={() => handleDelete(sale.id)}
                    className="p-1.5 text-[#3E3226]/30 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
