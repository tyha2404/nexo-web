import { useMemo } from 'react';
import { CloseIcon, WrenchIcon } from './ChatIcons';
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
  'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.06)] text-[#94a3b8] font-medium hover:bg-[rgba(99,102,241,0.15)] hover:text-[#e2e8f0] light:bg-[#f1f5f9] light:border-[#e2e8f0] light:text-[#475569] light:hover:bg-[#e0e7ff] light:hover:text-[#3730a3]';
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
          <WrenchIcon size={15} />
          <span>Công cụ AI ({AI_TOOLS_CATALOG.length})</span>
        </div>
        <button className={SIDEBAR_CLOSE_BTN} onClick={onClose} title="Đóng danh sách công cụ">
          <CloseIcon size={14} />
        </button>
      </div>

      {/* Categories Filter Tabs */}
      <div className="flex gap-[5px] py-2 px-[10px] overflow-x-auto border-b border-[rgba(255,255,255,0.06)]">
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
              <span className="text-[11px] font-semibold tracking-[0.3px] uppercase text-[#a5b4fc] light:text-[#4f46e5]">
                {group.label}
              </span>
              <span className="text-[9.5px] font-semibold py-px px-[6px] rounded-full bg-[rgba(99,102,241,0.18)] text-[#c7d2fe] light:bg-[#ede9fe] light:text-[#5b21b6]">
                {group.tools.length}
              </span>
            </div>
            {group.tools.map((tool) => (
              <div
                key={tool.id}
                className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-md py-[10px] px-3 cursor-pointer transition-all duration-[220ms] ease-[ease] hover:bg-[rgba(99,102,241,0.14)] hover:border-[rgba(99,102,241,0.4)] hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(0,0,0,0.25)] light:bg-white light:border-[#e2e8f0] light:hover:bg-[#f5f3ff] light:hover:border-[#c4b5fd] light:hover:shadow-[0_4px_14px_rgba(99,102,241,0.12)]"
                onClick={() => onRunPrompt(tool.promptExample)}
                title={`Chạy lệnh mẫu: "${tool.promptExample}"`}
              >
                <div className="flex items-center gap-2 mb-[5px]">
                  <span className="text-[16px]">{tool.icon}</span>
                  <div className="flex items-center justify-between flex-1">
                    <h5 className="m-0 text-[12.5px] font-semibold text-[#f8fafc] light:text-[#0f172a]">
                      {tool.name}
                    </h5>
                  </div>
                </div>
                <p className="m-0 mb-[6px] text-[11px] leading-[1.4] text-[#94a3b8] light:text-[#475569]">
                  {tool.description}
                </p>
                <div className="text-[10.5px] text-primary bg-primary-glow py-1 px-[7px] rounded-xs light:bg-[#ede9fe]">
                  <span>💬 Thử ngay: </span>
                  <em className="not-italic text-[#e2e8f0] light:text-[#0f172a]">
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
