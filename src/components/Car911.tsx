interface Props {
  color: string;
  className?: string;
}

/** Simplified 911 side profile. The body takes the paint color; glass, wheels and trim stay fixed. */
export function Car911({ color, className }: Props) {
  return (
    <svg viewBox="0 0 800 270" className={className} role="img" aria-label="Porsche 911 side profile">
      <defs>
        <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </linearGradient>
        <radialGradient id="floor" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.7" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="400" cy="246" rx="390" ry="18" fill="url(#floor)" />
      <g style={{ transition: "fill 600ms ease" }} fill={color}>
        <path d="M44 214 L40 186 C42 164 62 152 116 145 C178 137 256 130 306 122 C348 98 388 70 438 62 C496 54 546 58 590 78 C648 104 706 128 748 150 C764 160 772 178 768 214 L684 214 A74 74 0 0 0 536 214 L268 214 A74 74 0 0 0 120 214 Z" />
      </g>
      <path
        d="M44 214 L40 186 C42 164 62 152 116 145 C178 137 256 130 306 122 C348 98 388 70 438 62 C496 54 546 58 590 78 C648 104 706 128 748 150 C764 160 772 178 768 214 L684 214 A74 74 0 0 0 536 214 L268 214 A74 74 0 0 0 120 214 Z"
        fill="url(#sheen)"
      />
      <path d="M338 120 C370 94 400 76 440 70 C488 64 530 68 566 84 C584 93 594 104 598 116 Z" fill="#0d0f12" opacity="0.92" />
      <path d="M470 68 L478 118" stroke={color} strokeWidth="7" style={{ transition: "stroke 600ms ease" }} />
      <path d="M318 132 C420 128 560 128 640 134" stroke="#000" strokeOpacity="0.25" strokeWidth="1.5" fill="none" />
      <path d="M470 130 L470 196" stroke="#000" strokeOpacity="0.3" strokeWidth="1.5" />
      <ellipse cx="88" cy="160" rx="22" ry="9" fill="#f4f1e8" opacity="0.9" />
      <rect x="742" y="156" width="26" height="8" rx="3" fill="#c3121b" />
      {[194, 610].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="214" r="58" fill="#0a0a0b" />
          <circle cx={cx} cy="214" r="40" fill="#2a2c30" />
          <circle cx={cx} cy="214" r="38" fill="none" stroke="#8a8d92" strokeWidth="2" />
          {[0, 72, 144, 216, 288].map((a) => (
            <rect key={a} x={cx - 3} y="180" width="6" height="34" rx="3" fill="#9a9da2" transform={`rotate(${a} ${cx} 214)`} />
          ))}
          <circle cx={cx} cy="214" r="9" fill="#c9ccd0" />
        </g>
      ))}
    </svg>
  );
}
