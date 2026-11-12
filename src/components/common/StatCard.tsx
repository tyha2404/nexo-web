import type { ReactNode } from 'react';
import { clickableProps } from '../../commons/utils';
import {
  CLICKABLE_STAT_CARD,
  statValueClass,
  SUMMARY_STAT_CARD,
  SUMMARY_STAT_HEADER,
  SUMMARY_STAT_SUBTITLE,
  SUMMARY_STAT_TITLE,
  type StatTone,
} from '../ui';

export interface StatCardProps {
  title: ReactNode;
  value: ReactNode;
  subtitle?: ReactNode;
  tone?: StatTone;
  /** Makes the tile clickable (CLICKABLE_STAT_CARD, keyboard-activatable). */
  onClick?: () => void;
  /** Tooltip (title attribute). */
  hint?: string;
}

/** One headline number of a SUMMARY_GRID row (ui/layoutStyles block 5). */
export function StatCard({ title, value, subtitle, tone, onClick, hint }: StatCardProps) {
  return (
    <div
      className={onClick ? CLICKABLE_STAT_CARD : SUMMARY_STAT_CARD}
      title={hint}
      {...(onClick ? clickableProps(onClick) : {})}
    >
      <div className={SUMMARY_STAT_HEADER}>
        <span className={SUMMARY_STAT_TITLE}>{title}</span>
      </div>
      <div className={statValueClass(tone)}>{value}</div>
      {subtitle && <div className={SUMMARY_STAT_SUBTITLE}>{subtitle}</div>}
    </div>
  );
}
