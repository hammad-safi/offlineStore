'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface QRScannerProps {
  onDecode: (value: string) => void;
}

export default function QRScanner({ onDecode }: QRScannerProps) {
  const scannerRef = useRef<HTMLDivElement | null>(null);
  const scannerId = useMemo(() => `html5qr-code-full-region-${Math.random().toString(16).slice(2)}`, []);
  const [status, setStatus] = useState('Ready to scan');

  useEffect(() => {
    let qrCodeScanner: any;
    let active = true;

    const startScanner = async () => {
      const container = scannerRef.current;
      if (!container || !active) return;

      const { Html5Qrcode } = await import('html5-qrcode');
      if (!active || !scannerRef.current) return;

      qrCodeScanner = new Html5Qrcode(scannerRef.current.id || scannerId);
      qrCodeScanner
        .start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: 250,
          },
          (decodedText: string) => {
            if (!active) return;
            setStatus('Detected: ' + decodedText);
            onDecode(decodedText);
          },
          (error: unknown) => {
            if (!active) return;
            if (error && typeof error === 'string') {
              setStatus(error);
            }
          }
        )
        .catch(() => {
          if (active) {
            setStatus('Camera permission denied or unavailable.');
          }
        });
    };

    startScanner();

    return () => {
      active = false;
      if (!qrCodeScanner) return;

      (async () => {
        try {
          await qrCodeScanner.stop();
        } catch {
          // ignore stop errors if scanner was not running
        }
      })();
    };
  }, [onDecode]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-panel">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">Scan barcode / QR code</p>
        <p className="text-xs text-slate-500">{status}</p>
      </div>
      <div id={scannerId} ref={scannerRef} className="h-80 rounded-3xl bg-slate-900" />
    </div>
  );
}
