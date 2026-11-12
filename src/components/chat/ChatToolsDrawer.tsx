import { useMemo } from 'react';
import { X } from '../ui';
import { WrenchIcon } from './ChatIcons';
import {
  BTN_TRANSITION,
  SIDEBAR_CLOSE_BTN,
  SIDEBAR_HEADER,
  SIDEBAR_PANEL,
  SIDEBAR_TITLE,
} from './chatStyles';
import { AI_TOOL_CATEGORIES, AI_TOOLS_CATALOG, ALL_CATEGORY } from './toolsCatalog';

const TAB = `border text-[11px] py-1 px-[9px] rounded-sm whitespace-nowrap cursor-pointer ${BTN_TRANSITION}`;
const TAB_IDLE =
  'bg-[rgba(255,255,255,0.04)] border-line text-[var(--text-muted)] font-medium hover:bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] hover:text-[var(--text-main)] light:bg-[var(--bg-card-hover)] light:text-[var(--text-muted)] light:hover:bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] light:hover:text-[var(--primary)]';
const TAB_ACTIVE =
  '[background:linear-gradient(135deg,#6366f1_0%,#a855f7_100%)] border-transparent text-white font-semibold';

export interface ChatToolsDrawerProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  onClose: () => void;
  onRunPrompt: (prompt: string) => void;
}

/** Catalog of AI tools grouped by category; tapping one sends its example prompt. */
export function ChatToolsDrawer({
  selectedCategory,
  onSelectCategory,
  onClose,
  onRunPrompt,
}: ChatToolsDrawerProps) {
  // Catalog grouped by category, following AI_TOOL_CATEGORIES order.
  const groupedTools = useMemo(() => {
    return AI_TOOL_CATEGORIES.map((cat) => ({
      ...cat,
      tools: AI_TOOLS_CATALOG.filter((t) => t.category === cat.id),
    })).filter((group) => selectedCategory === ALL_CATEGORY || group.id === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className={`${SIDEBAR_PANEL} w-[320px] max-w-[90%]`}>
      <div className={SIDEBAR_HEADER}>
        <div className={SIDEBAR_TITLE}>
          <WrenchIcon size={16} />
          <span>Công cụ AI ({AI_TOOLS_CATALOG.length})</span>
        </div>
        <button className={SIDEBAR_CLOSE_BTN} onClick={onClose} title="Đóng danh sách công cụ">
          <X size={16} />
        </button>
      </div>

      {/* Categories Filter Tabs */}
      <div className="flex gap-[5px] py-2 px-[10px] overflow-x-auto border-b border-line">
        {[ALL_CATEGORY, ...AI_TOOL_CATEGORIES.map((c) => c.id)].map((cat) => (
          <button
            key={cat}
            className={`${TAB} ${selectedCategory === cat ? TAB_ACTIVE : TAB_IDLE}`}
            onClick={() => onSelectCategory(cat)}
          >
            {cat === ALL_CATEGORY ? 'Tất cả' : cat}
          </button>
        ))}
      </div>

      {/* Tools List grouped by category */}
      <div className="flex-1 overflow-y-auto p-[10px] flex flex-col gap-2">
        {groupedTools.map((group) => (
          <div key={group.id} className="flex flex-col gap-2">
            <div className="flex items-center gap-[6px] pt-[2px] px-[2px] pb-0">
              <span className="text-[13px]">{group.icon}</span>
              <span className="text-[11px] font-semibold tracking-[0.3px] uppercase text-[var(--text-link)] light:text-[var(--primary)]">
                {group.label}
              </span>
              <span className="text-[9.5px] font-semibold py-px px-[6px] rounded-full bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-[var(--text-link)] light:bg-[color-mix(in_srgb,var(--purple)_12%,transparent)] light:text-[var(--purple)]">
                {group.tools.length}
              </span>
            </div>
            {group.tools.map((tool) => (
              <div
                key={tool.id}
                className="bg-[rgba(255,255,255,0.03)] border border-line rounded-md py-[10px] px-3 cursor-pointer transition-all duration-[220ms] ease-[ease] hover:bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] hover:border-[color-mix(in_srgb,var(--primary)_40%,transparent)] hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(0,0,0,0.25)] light:bg-white light:hover:bg-[color-mix(in_srgb,var(--purple)_8%,transparent)] light:hover:border-[var(--purple)] light:hover:shadow-[0_4px_14px_color-mix(in_srgb,var(--primary)_12%,transparent)]"
                onClick={() => onRunPrompt(tool.promptExample)}
                title={`Chạy lệnh mẫu: "${tool.promptExample}"`}
              >
                <div className="flex items-center gap-2 mb-[5px]">
                  <span className="text-[16px]">{tool.icon}</span>
                  <div className="flex items-center justify-between flex-1">
                    <h5 className="m-0 text-[12.5px] font-semibold text-[var(--text-main)] light:text-[var(--text-main)]">
                      {tool.name}
                    </h5>
                  </div>
                </div>
                <p className="m-0 mb-[6px] text-[11px] leading-[1.4] text-[var(--text-muted)] light:text-[var(--text-muted)]">
                  {tool.description}
                </p>
                <div className="text-[10.5px] text-primary bg-primary-glow py-1 px-[7px] rounded-xs light:bg-[color-mix(in_srgb,var(--purple)_12%,transparent)]">
                  <span>💬 Thử ngay: </span>
                  <em className="not-italic text-[var(--text-main)] light:text-[var(--text-main)]">
                    "{tool.promptExample}"
                  </em>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
