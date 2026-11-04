import { cx, Tags } from '../ui';
import { TAG_CHIP } from './listStyles';

export interface TagChipsProps {
  tags?: string[];
  /** When set, each tag is a button that filters the list by it. */
  onTagClick?: (tag: string) => void;
  className?: string;
}

/** The tags of one transaction as tag badges (codicon `tag` + name). Renders nothing without tags. */
export function TagChips({ tags, onTagClick, className }: TagChipsProps) {
  if (!tags?.length) return null;
  return (
    <span className={cx('inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1', className)}>
      {tags.map((tag) =>
        onTagClick ? (
          <button
            key={tag}
            type="button"
            className={TAG_CHIP}
            onClick={() => onTagClick(tag)}
            aria-label={`Lọc theo tag ${tag}`}
            title={`Lọc theo tag ${tag}`}
          >
            <Tags size={12} aria-hidden="true" />
            <span className="truncate">{tag}</span>
          </button>
        ) : (
          <span key={tag} className={TAG_CHIP}>
            <Tags size={12} aria-hidden="true" />
            <span className="truncate">{tag}</span>
          </span>
        )
      )}
    </span>
  );
}
