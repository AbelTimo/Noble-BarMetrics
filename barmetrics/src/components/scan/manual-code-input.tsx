'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Keyboard, Search } from 'lucide-react';

interface ManualCodeInputProps {
  onSubmit: (code: string) => void;
  isLoading: boolean;
}

export function ManualCodeInput({ onSubmit, isLoading }: ManualCodeInputProps) {
  const [code, setCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus for hardware scanner support
  useEffect(() => {
    const handleFocus = () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };

    // Focus on mount
    handleFocus();

    // Re-focus when user clicks anywhere (for hardware scanner)
    document.addEventListener('click', handleFocus);

    return () => {
      document.removeEventListener('click', handleFocus);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      onSubmit(code.trim().toUpperCase());
      setCode('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Hardware scanners often send Enter after scanning
    if (e.key === 'Enter' && code.trim()) {
      e.preventDefault();
      onSubmit(code.trim().toUpperCase());
      setCode('');
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium">Manual Entry / Hardware Scanner</h3>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder="Enter label code (e.g., BM-ABC12345)"
              className="font-mono flex-1"
              autoComplete="off"
              autoCapitalize="characters"
            />
            <Button type="submit" disabled={!code.trim() || isLoading}>
              <Search className="mr-2 h-4 w-4" />
              Lookup
            </Button>
          </form>

          <p className="text-xs text-muted-foreground">
            Type the label code manually or use a hardware barcode/QR scanner.
            The scanner should be configured to send Enter after scanning.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
