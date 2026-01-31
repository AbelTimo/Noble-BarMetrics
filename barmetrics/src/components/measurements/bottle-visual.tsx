'use client';

interface BottleVisualProps {
  percentFull: number;
  size?: 'sm' | 'md' | 'lg';
}

export function BottleVisual({ percentFull, size = 'md' }: BottleVisualProps) {
  const clampedPercent = Math.max(0, Math.min(100, percentFull));

  const sizeClasses = {
    sm: 'w-8 h-20',
    md: 'w-12 h-32',
    lg: 'w-16 h-44',
  };

  const getFillColor = (percent: number) => {
    if (percent >= 75) return '#22c55e'; // green-500
    if (percent >= 50) return '#eab308'; // yellow-500
    if (percent >= 25) return '#f97316'; // orange-500
    return '#ef4444'; // red-500
  };

  return (
    <div className={`relative ${sizeClasses[size]}`}>
      <svg
        viewBox="0 0 40 100"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Bottle outline */}
        <path
          d="M16 0 H24 V8 L28 15 V95 C28 97.5 25.5 100 20 100 C14.5 100 12 97.5 12 95 V15 L16 8 V0"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="text-muted-foreground"
        />

        {/* Bottle cap */}
        <rect x="14" y="0" width="12" height="5" fill="currentColor" className="text-muted-foreground" />

        {/* Liquid fill - positioned from bottom */}
        <clipPath id={`bottle-clip-${clampedPercent}`}>
          <path d="M13 15 L27 15 V95 C27 97 25 99 20 99 C15 99 13 97 13 95 V15" />
        </clipPath>

        <rect
          x="13"
          y={15 + (84 * (100 - clampedPercent) / 100)}
          width="14"
          height={84 * clampedPercent / 100}
          fill={getFillColor(clampedPercent)}
          clipPath={`url(#bottle-clip-${clampedPercent})`}
          opacity="0.8"
        />

        {/* Level lines */}
        {[25, 50, 75].map((level) => (
          <line
            key={level}
            x1="29"
            y1={15 + (84 * (100 - level) / 100)}
            x2="32"
            y2={15 + (84 * (100 - level) / 100)}
            stroke="currentColor"
            strokeWidth="1"
            className="text-muted-foreground"
          />
        ))}
      </svg>

      {/* Percentage label */}
      <div className="absolute -right-8 top-1/2 -translate-y-1/2 text-xs font-medium">
        {clampedPercent.toFixed(0)}%
      </div>
    </div>
  );
}
