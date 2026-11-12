import { Gem, ShoppingBag, TrendingUp } from '../ui';
import { TransactionType } from '../../commons/constants';

/** Expense / income / investment glyph, shared by the type tabs and the mobile list cards. */
export function TransactionTypeIcon({ type, size = 16 }: { type: TransactionType; size?: number }) {
  if (type === TransactionType.INCOME) return <TrendingUp size={size} />;
  if (type === TransactionType.INVESTMENT) return <Gem size={size} />;
  return <ShoppingBag size={size} />;
}
