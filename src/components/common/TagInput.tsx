import { useState, type KeyboardEvent } from 'react';
import { CHIP_BTN, CHIP_BTN_GHOST, cx, Plus, Tags, X } from '../ui';

/** Same limits as the API (CreateTransactionRequest.tags). */
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 50;
const MAX_SUGGESTIONS = 6;

/** Trim, collapse spaces, drop a leading '#', cap the length (mirrors the API's NormalizeTags). */
const normalizeTag = (raw: string) =>
  raw.trim().replace(/^#/, '').trim().replace(/\s+/g, ' ').slice(0, MAX_TAG_LENGTH);

/** Case- and accent-insensitive key, so "Đà Lạt", "đà lạt" and "da lat" match. */
const tagKey = (tag: string) =>
  tag
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

export interface TagInputProps {
  id: string;
  value: string[];
  onChange: (tags: string[]) => void;
  /** Tags the user already used, most recent first; offered as one-tap chips. */
  suggestions?: string[];
  disabled?: boolean;
}

/**
 * Free-form tag field: type a tag and press return or comma; tap a suggestion to add it;
 * backspace on an empty field removes the last tag. A tag still in the box when the field
 * loses focus is added too, so it is never silently dropped on save.
 */
export function TagInput({ id, value, onChange, suggestions = [], disabled }: TagInputProps) {
  const [text, setText] = useState('');
  const full = value.length >= MAX_TAGS;

  // Several tags can arrive at once (a pasted "a, b, c"), so build the list in one pass.
  const addMany = (raws: string[]) => {
    const next = [...value];
    for (const raw of raws) {
      const tag = normalizeTag(raw);
      if (!tag || next.length >= MAX_TAGS || next.some((t) => tagKey(t) === tagKey(tag))) continue;
      // Reuse the existing spelling of a known tag ("da lat" -> "Đà Lạt").
      next.push(suggestions.find((s) => tagKey(s) === tagKey(tag)) ?? tag);
    }
    if (next.length !== value.length) onChange(next);
  };
  const add = (raw: string) => {
    setText('');
    addMany([raw]);
  };

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if ((e.key === 'Enter' || e.key === ',') && text.trim()) {
      e.preventDefault(); // add the tag instead of submitting the form
      add(text);
    } else if (e.key === 'Backspace' && !text && value.length) {
      remove(value[value.length - 1]);
    }
  };

  const query = tagKey(normalizeTag(text));
  const picked = new Set(value.map(tagKey));
  const visibleSuggestions = full
    ? []
    : suggestions
        .filter((s) => !picked.has(tagKey(s)) && (!query || tagKey(s).includes(query)))
        .slice(0, MAX_SUGGESTIONS);

  return (
    <div>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2" aria-label="Tag đã chọn">
          {/* The whole chip is the remove button: a tiny × alone is too small to tap. */}
          {value.map((tag) => (
            <button
              key={tag}
              type="button"
              className={CHIP_BTN}
              onClick={() => remove(tag)}
              disabled={disabled}
              aria-label={`Bỏ tag ${tag}`}
              title={`Bỏ tag ${tag}`}
            >
              <Tags size={12} className="text-muted" />
              <span className="truncate">{tag}</span>
              <X size={12} className="text-muted" />
            </button>
          ))}
        </div>
      )}
      <input
        id={id}
        type="text"
        autoComplete="off"
        autoCapitalize="sentences"
        enterKeyHint="enter"
        maxLength={MAX_TAG_LENGTH + 1}
        placeholder={full ? `Tối đa ${MAX_TAGS} tag` : 'Ví dụ: Du lịch Đà Lạt, Công tác...'}
        value={text}
        disabled={disabled || full}
        onChange={(e) => {
          // Typing or pasting a comma ends the tag.
          const parts = e.target.value.split(',');
          if (parts.length > 1) addMany(parts.slice(0, -1));
          setText(parts[parts.length - 1]);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => text.trim() && add(text)}
      />
      {visibleSuggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2" aria-label="Gợi ý tag">
          {visibleSuggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              className={cx(CHIP_BTN, CHIP_BTN_GHOST)}
              aria-label={`Thêm tag ${tag}`}
              title={`Thêm tag ${tag}`}
              // Keep focus in the field so its blur doesn't also add the half-typed text.
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => add(tag)}
              disabled={disabled}
            >
              <Plus size={12} />
              <span className="truncate">{tag}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
