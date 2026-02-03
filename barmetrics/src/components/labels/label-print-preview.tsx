'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, Download, FileDown } from 'lucide-react';
import { PRINT_FORMATS, type PrintFormat } from '@/lib/labels';
import type { jsPDF as JsPDFType } from 'jspdf';

interface LabelData {
  id: string;
  code: string;
  qrContent: string;
  skuCode: string;
  skuName: string;
  category: string;
  sizeMl: number;
}

interface LabelPrintPreviewProps {
  labels: LabelData[];
  batchInfo: {
    id: string;
    quantity: number;
    createdAt: string;
    sku: {
      code: string;
      name: string;
    };
  };
}

export function LabelPrintPreview({ labels, batchInfo }: LabelPrintPreviewProps) {
  const [format, setFormat] = useState<PrintFormat>('THERMAL_2INCH');
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const generateQRCodes = async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        const codes: Record<string, string> = {};

        for (const label of labels) {
          const dataUrl = await QRCode.toDataURL(label.qrContent, {
            width: 100,
            margin: 1,
            errorCorrectionLevel: 'M',
          });
          codes[label.id] = dataUrl;
        }

        setQrCodes(codes);
      } catch (error) {
        console.error('Error generating QR codes:', error);
      }
    };

    generateQRCodes();
  }, [labels]);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print labels');
      return;
    }

    const formatConfig = PRINT_FORMATS[format];

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Labels - ${batchInfo.sku.code}</title>
        <style>
          @media print {
            @page {
              size: ${format === 'THERMAL_2INCH' ? '50mm 25mm' : '8.5in 11in'};
              margin: ${format === 'THERMAL_2INCH' ? '0' : '12.7mm 4.8mm'};
            }
            body {
              margin: 0;
              padding: 0;
            }
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
          }
          .label-container {
            display: ${format === 'AVERY_5160' ? 'grid' : 'block'};
            ${format === 'AVERY_5160' ? 'grid-template-columns: repeat(3, 1fr); gap: 0;' : ''}
          }
          .label {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 2mm;
            box-sizing: border-box;
            ${format === 'THERMAL_2INCH' ? `
              width: 50mm;
              height: 25mm;
              page-break-after: always;
            ` : `
              width: 66.7mm;
              height: 25.4mm;
              border: 0.5px dashed #ccc;
            `}
          }
          .qr-code {
            width: 20mm;
            height: 20mm;
            flex-shrink: 0;
          }
          .label-info {
            flex: 1;
            min-width: 0;
            font-size: 8pt;
          }
          .label-code {
            font-family: monospace;
            font-weight: bold;
            font-size: 10pt;
            margin: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .sku-code {
            margin: 0;
            color: #666;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .sku-info {
            margin: 0;
            color: #999;
            font-size: 7pt;
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          ${labels.map((label) => `
            <div class="label">
              <img src="${qrCodes[label.id] || ''}" class="qr-code" alt="QR Code" />
              <div class="label-info">
                <p class="label-code">${label.code}</p>
                <p class="sku-code">${label.skuCode}</p>
                <p class="sku-info">${label.category} ${label.sizeMl}ml</p>
              </div>
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handleDownloadPDF = async () => {
    if (Object.keys(qrCodes).length === 0) return;

    setIsGeneratingPDF(true);
    try {
      const { jsPDF } = await import('jspdf');

      // Create PDF based on format
      let pdf: JsPDFType;

      if (format === 'THERMAL_2INCH') {
        // 50mm x 25mm labels
        pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: [50, 25],
        });
      } else {
        // Letter size for Avery 5160 (3x10 grid)
        pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'letter',
        });
      }

      if (format === 'THERMAL_2INCH') {
        // One label per page for thermal
        for (let i = 0; i < labels.length; i++) {
          const label = labels[i];
          const qrDataUrl = qrCodes[label.id];

          if (i > 0) {
            pdf.addPage([50, 25], 'landscape');
          }

          // QR Code (left side)
          if (qrDataUrl) {
            pdf.addImage(qrDataUrl, 'PNG', 2, 2.5, 20, 20);
          }

          // Text (right side)
          pdf.setFontSize(10);
          pdf.setFont('courier', 'bold');
          pdf.text(label.code, 24, 8);

          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.text(label.skuCode, 24, 13);

          pdf.setFontSize(7);
          pdf.setTextColor(100);
          pdf.text(`${label.category} ${label.sizeMl}ml`, 24, 18);
          pdf.setTextColor(0);
        }
      } else {
        // Avery 5160: 3 columns, 10 rows
        const labelWidth = 66.7;
        const labelHeight = 25.4;
        const marginLeft = 4.8;
        const marginTop = 12.7;
        const gapX = 3.2;
        const labelsPerRow = 3;
        const labelsPerPage = 30;

        for (let i = 0; i < labels.length; i++) {
          const pageIndex = Math.floor(i / labelsPerPage);
          const indexOnPage = i % labelsPerPage;
          const row = Math.floor(indexOnPage / labelsPerRow);
          const col = indexOnPage % labelsPerRow;

          if (i > 0 && indexOnPage === 0) {
            pdf.addPage('letter', 'portrait');
          }

          const x = marginLeft + col * (labelWidth + gapX);
          const y = marginTop + row * labelHeight;

          const label = labels[i];
          const qrDataUrl = qrCodes[label.id];

          // QR Code
          if (qrDataUrl) {
            pdf.addImage(qrDataUrl, 'PNG', x + 2, y + 2.5, 20, 20);
          }

          // Text
          pdf.setFontSize(9);
          pdf.setFont('courier', 'bold');
          pdf.text(label.code, x + 24, y + 8);

          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'normal');
          pdf.text(label.skuCode, x + 24, y + 13);

          pdf.setFontSize(6);
          pdf.setTextColor(100);
          pdf.text(`${label.category} ${label.sizeMl}ml`, x + 24, y + 17);
          pdf.setTextColor(0);
        }
      }

      // Download the PDF
      const filename = `labels-${batchInfo.sku.code}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Print Preview</CardTitle>
          <div className="flex gap-2">
            <Select value={format} onValueChange={(v) => setFormat(v as PrintFormat)}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRINT_FORMATS).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={Object.keys(qrCodes).length === 0 || isGeneratingPDF}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
            </Button>
            <Button onClick={handlePrint} disabled={Object.keys(qrCodes).length === 0}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">SKU</p>
                <p className="font-mono font-medium">{batchInfo.sku.code}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Quantity</p>
                <p className="font-medium">{batchInfo.quantity} labels</p>
              </div>
              <div>
                <p className="text-muted-foreground">Format</p>
                <p className="font-medium">{PRINT_FORMATS[format].name}</p>
              </div>
            </div>
          </div>

          <div
            ref={printRef}
            className={`border rounded-lg p-4 bg-white overflow-auto max-h-[600px] ${
              format === 'AVERY_5160' ? 'grid grid-cols-3 gap-1' : 'space-y-2'
            }`}
          >
            {labels.map((label) => (
              <div
                key={label.id}
                className="inline-flex items-center gap-2 p-2 border border-dashed border-gray-300 bg-white"
                style={{
                  width: format === 'THERMAL_2INCH' ? '200px' : '180px',
                  height: format === 'THERMAL_2INCH' ? '80px' : '70px',
                }}
              >
                {qrCodes[label.id] ? (
                  <img
                    src={qrCodes[label.id]}
                    alt="QR Code"
                    className="w-16 h-16 flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 animate-pulse flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-mono font-bold text-sm truncate">{label.code}</p>
                  <p className="text-xs text-gray-600 truncate">{label.skuCode}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {label.category} {label.sizeMl}ml
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
