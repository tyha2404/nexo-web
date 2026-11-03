import { Codicon, type IconProps } from '../ui';

/* Chat widget icons: VS Code Codicons (see ui/icons.tsx), 16px by default. */

/** Corner grip of the resizable desktop chat panel (not a codicon). */
export const ResizeIcon = ({ size = 10, ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...p}
  >
    <line x1="2" y1="2" x2="16" y2="2" />
    <line x1="2" y1="2" x2="2" y2="16" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

export const SparkIcon = (p: IconProps) => <Codicon name="sparkle" {...p} />;
export const PlusIcon = (p: IconProps) => <Codicon name="add" {...p} />;
export const WrenchIcon = (p: IconProps) => <Codicon name="tools" {...p} />;
export const ListIcon = (p: IconProps) => <Codicon name="list-unordered" {...p} />;
export const CloseIcon = (p: IconProps) => <Codicon name="close" {...p} />;
export const ClockIcon = (p: IconProps) => <Codicon name="clockface" {...p} />;
export const CheckIcon = (p: IconProps) => <Codicon name="check" {...p} />;
export const UndoIcon = (p: IconProps) => <Codicon name="discard" {...p} />;
export const RetryIcon = (p: IconProps) => <Codicon name="refresh" {...p} />;
export const SpinnerIcon = ({ className, ...p }: IconProps) => (
  <Codicon name="loading" className={`animate-spin ${className ?? ''}`} {...p} />
);
export const MicIcon = (p: IconProps) => <Codicon name="mic" {...p} />;
export const SendIcon = (p: IconProps) => <Codicon name="send" {...p} />;
export const ChatBubbleIcon = (p: IconProps) => <Codicon name="comment-discussion" {...p} />;
