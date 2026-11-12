import { TransactionType } from '../constants';

/**
 * Icon rules, checked in order. A keyword matches whole words of the category name (a
 * multi-word keyword matches those words in sequence), never a substring: "ăn" must not
 * match "xăng", "căn hộ" or "khăn".
 */
const ICON_RULES: [keywords: string[], icon: string][] = [
  [['ăn', 'uống', 'cà phê', 'cafe', 'trưa', 'tối', 'sáng', 'food', 'nhà hàng'], '🍔'],
  [['mua', 'sắm', 'quần', 'áo', 'shopping', 'đồ'], '🛍️'],
  [['xăng', 'xe', 'di chuyển', 'grab', 'taxi', 'vé'], '🚗'],
  [['nhà', 'điện', 'nước', 'internet', 'phòng', 'thuê'], '🏠'],
  [['giải trí', 'phim', 'du lịch', 'game', 'chơi'], '🎬'],
  [['sức khỏe', 'thuốc', 'khám', 'bệnh', 'gym', 'thể thao'], '💊'],
  [['học', 'sách', 'khóa', 'trường'], '📚'],
  [['lương', 'thưởng', 'thu nhập', 'tiền về', 'bonus'], '💵'],
  [['đầu tư', 'cổ phiếu', 'vàng', 'quỹ', 'chứng'], '📈'],
  [['nợ', 'vay', 'mượn', 'trả'], '🤝'],
  [['quà', 'biếu', 'tặng', 'mừng'], '🎁'],
  [['hóa đơn', 'phí', 'dịch vụ'], '📄'],
];

/** Lowercase words of `text`, with Vietnamese diacritics in one (NFC) form. */
const toWords = (text: string) =>
  text
    .normalize('NFC')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

const RULE_WORDS = ICON_RULES.map(
  ([keywords, icon]) => [keywords.map(toWords), icon] as [string[][], string]
);

function containsPhrase(words: string[], phrase: string[]): boolean {
  for (let i = 0; i + phrase.length <= words.length; i++) {
    if (phrase.every((word, j) => words[i + j] === word)) return true;
  }
  return false;
}

function typeIcon(type?: TransactionType): string {
  if (type === TransactionType.INCOME) return '💰';
  if (type === TransactionType.INVESTMENT) return '📈';
  return '💸';
}

/**
 * Automatically determine the most fitting emoji icon for a category based on its name and type
 */
export function getCategoryIcon(name?: string, type?: TransactionType): string {
  if (!name) return typeIcon(type);
  const words = toWords(name);
  for (const [phrases, icon] of RULE_WORDS) {
    if (phrases.some((phrase) => containsPhrase(words, phrase))) return icon;
  }
  return typeIcon(type);
}
