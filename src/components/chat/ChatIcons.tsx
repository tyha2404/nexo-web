import type { CSSProperties, ReactNode } from 'react';

interface IconProps {
  size?: number;
  strokeWidth?: number;
  stroke?: string;
  style?: CSSProperties;
}

function Svg({
  size = 16,
  strokeWidth = 2,
  stroke = 'currentColor',
  style,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {children}
    </svg>
  );
}

export const ResizeIcon = (p: IconProps) => (
  <Svg size={10} strokeWidth={2.5} {...p}>
    <line x1="2" y1="2" x2="16" y2="2" />
    <line x1="2" y1="2" x2="2" y2="16" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </Svg>
);

export const SparkIcon = (p: IconProps) => (
  <Svg size={18} strokeWidth={2.2} {...p}>
    <path d="M12 2v4" />
    <path d="m19.07 4.93-2.83 2.83" />
    <path d="M20 12h-4" />
    <path d="m16.24 16.24 2.83 2.83" />
    <path d="M12 18v4" />
    <path d="m4.93 19.07 2.83-2.83" />
    <path d="M4 12h4" />
    <path d="m7.76 7.76-2.83-2.83" />
  </Svg>
);

export const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </Svg>
);

export const WrenchIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </Svg>
);

export const ListIcon = (p: IconProps) => (
  <Svg {...p}>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </Svg>
);

export const ClockIcon = (p: IconProps) => (
  <Svg size={28} {...p}>
    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
    <path d="M12 6v6l4 2" />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg strokeWidth={2.5} {...p}>
    <polyline points="20 6 9 17 4 12" />
  </Svg>
);

export const UndoIcon = (p: IconProps) => (
  <Svg size={12} strokeWidth={2.5} {...p}>
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
  </Svg>
);

export const RetryIcon = (p: IconProps) => (
  <Svg size={12} {...p}>
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
  </Svg>
);

export const SpinnerIcon = (p: IconProps) => (
  <Svg size={14} style={{ animation: 'spin 1.5s linear infinite' }} {...p}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </Svg>
);

export const MicIcon = (p: IconProps) => (
  <Svg size={18} {...p}>
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </Svg>
);

export const SendIcon = (p: IconProps) => (
  <Svg size={18} strokeWidth={2.5} {...p}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </Svg>
);

export const ChatBubbleIcon = (p: IconProps) => (
  <Svg size={14} {...p}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </Svg>
);
