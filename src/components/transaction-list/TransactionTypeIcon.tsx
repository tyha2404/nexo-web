import { Gem, ShoppingBag, TrendingUp } from 'lucide-react';
import { TransactionType } from '../../commons/constants';

export function TransactionTypeIcon({ type, size = 18 }: { type: TransactionType; size?: number }) {
  if (type === TransactionType.INCOME) return <TrendingUp size={size} />;
  if (type === TransactionType.INVESTMENT) return <Gem size={size} />;
  return <ShoppingBag size={size} />;
}
