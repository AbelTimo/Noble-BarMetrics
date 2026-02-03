'use client';

import { useEffect, useRef } from 'react';

interface ThermalLabelProps {
  code: string;
  qrContent: string;
  skuCode: string;
  skuName: string;
  category: string;
  sizeMl: number;
}

export function ThermalLabel({
  code,
  qrContent,
  skuCode,
  skuName,
  category,
  sizeMl,
}: ThermalLabelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const generateQR = async () => {
      if (!canvasRef.current) return;

      try {
        const QRCode = (await import('qrcode')).default;
        await QRCode.toCanvas(canvasRef.current, qrContent, {
          width: 80,
          margin: 1,
          errorCorrectionLevel: 'M',
        });
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };

    generateQR();
  }, [qrContent]);

  return (
    <div className="inline-block border border-gray-300 bg-white p-2 rounded" style={{ width: '200px' }}>
      <div className="flex gap-2">
        <canvas ref={canvasRef} className="flex-shrink-0" />
        <div className="flex flex-col justify-center min-w-0">
          <p className="font-mono font-bold text-sm truncate">{code}</p>
          <p className="text-xs text-gray-600 truncate">{skuCode}</p>
          <p className="text-xs text-gray-500 truncate">{category} {sizeMl}ml</p>
        </div>
      </div>
    </div>
  );
}
