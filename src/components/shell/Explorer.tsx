import { ChevronDown, cx } from '../ui';
import {
  isTreeChildActive,
  NAV_ITEMS,
  TAB_ICON_CLASS,
  TREE_CHILDREN,
  type NavState,
} from './navigation';
import { TREE_ITEM } from './shellStyles';

export interface ExplorerProps {
  nav: NavState;
  onNavigate: (nav: string) => void;
}

/** Desktop side bar: page tree with the sub-pages of Giao dịch and Kế hoạch. */
export function Explorer({ nav, onNavigate }: ExplorerProps) {
  return (
    <div className="flex w-[240px] flex-col border-r border-line bg-sidebar text-main">
      <div className="flex h-[35px] shrink-0 items-center px-5 text-[11px] tracking-[0.04em] uppercase">
        Explorer
      </div>
      <div className="flex h-[22px] shrink-0 items-center gap-[2px] px-[2px] text-[11px] font-bold tracking-[0.04em] uppercase">
        <ChevronDown size={16} className="shrink-0" />
        Nexo Portal
      </div>
      <nav aria-label="Trang" className="min-h-0 flex-1 overflow-y-auto pb-2">
        {NAV_ITEMS.map(({ tab, label, Icon }) => {
          const children = TREE_CHILDREN[tab];
          const selected = nav.activeTab === tab && !children;
          return (
            <div key={tab}>
              <button
                type="button"
                className={cx(
                  TREE_ITEM,
                  'pl-[8px]',
                  selected ? 'bg-list-active' : 'bg-transparent'
                )}
                onClick={() => onNavigate(tab)}
              >
                {children ? (
                  <ChevronDown className="size-4! text-main" />
                ) : (
                  <span className="w-4 shrink-0" />
                )}
                <Icon className={TAB_ICON_CLASS[tab]} />
                <span className="truncate">{label}</span>
              </button>
              {children?.map((child) => (
                <button
                  key={child.nav}
                  type="button"
                  className={cx(
                    TREE_ITEM,
                    'pl-[30px]',
                    isTreeChildActive(child.nav, nav) ? 'bg-list-active' : 'bg-transparent'
                  )}
                  onClick={() => onNavigate(child.nav)}
                >
                  <child.Icon className={child.iconClass} />
                  <span className="truncate">{child.label}</span>
                </button>
              ))}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
