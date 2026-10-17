import { useMemo } from 'react';
import { CloseIcon, WrenchIcon } from './ChatIcons';
import { AI_TOOL_CATEGORIES, AI_TOOLS_CATALOG, ALL_CATEGORY } from './toolsCatalog';

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
    <div className="chat-sessions-sidebar chat-tools-catalog-drawer">
      <div className="sessions-sidebar-header">
        <div className="sessions-sidebar-title">
          <WrenchIcon size={15} />
          <span>Công cụ AI ({AI_TOOLS_CATALOG.length})</span>
        </div>
        <button className="sessions-close-btn" onClick={onClose} title="Đóng danh sách công cụ">
          <CloseIcon size={14} />
        </button>
      </div>

      {/* Categories Filter Tabs */}
      <div className="tools-categories-filter">
        {[ALL_CATEGORY, ...AI_TOOL_CATEGORIES.map((c) => c.id)].map((cat) => (
          <button
            key={cat}
            className={`tool-category-tab ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => onSelectCategory(cat)}
          >
            {cat === ALL_CATEGORY ? 'Tất cả' : cat}
          </button>
        ))}
      </div>

      {/* Tools List grouped by category */}
      <div className="tools-catalog-list">
        {groupedTools.map((group) => (
          <div key={group.id} className="tool-group">
            <div className="tool-group-header">
              <span className="tool-group-icon">{group.icon}</span>
              <span className="tool-group-label">{group.label}</span>
              <span className="tool-group-count">{group.tools.length}</span>
            </div>
            {group.tools.map((tool) => (
              <div
                key={tool.id}
                className="tool-card-item"
                onClick={() => onRunPrompt(tool.promptExample)}
                title={`Chạy lệnh mẫu: "${tool.promptExample}"`}
              >
                <div className="tool-card-top">
                  <span className="tool-card-icon">{tool.icon}</span>
                  <div className="tool-card-info">
                    <h5>{tool.name}</h5>
                  </div>
                </div>
                <p className="tool-card-desc">{tool.description}</p>
                <div className="tool-card-prompt-hint">
                  <span>💬 Thử ngay: </span>
                  <em>"{tool.promptExample}"</em>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
