/**
 * Automatically determine the most fitting emoji icon for a category based on its name and type
 */
export function getCategoryIcon(name?: string, type?: string): string {
  if (!name) {
    if (type === 'INCOME') return '💰';
    if (type === 'INVESTMENT') return '📈';
    return '💸';
  }
  const n = name.toLowerCase();
  if (
    n.includes('ăn') ||
    n.includes('uống') ||
    n.includes('cà phê') ||
    n.includes('cafe') ||
    n.includes('trưa') ||
    n.includes('tối') ||
    n.includes('sáng') ||
    n.includes('food') ||
    n.includes('nhà hàng')
  )
    return '🍔';
  if (
    n.includes('mua') ||
    n.includes('sắm') ||
    n.includes('quần') ||
    n.includes('áo') ||
    n.includes('shopping') ||
    n.includes('đồ')
  )
    return '🛍️';
  if (
    n.includes('xăng') ||
    n.includes('xe') ||
    n.includes('di chuyển') ||
    n.includes('grab') ||
    n.includes('taxi') ||
    n.includes('vé')
  )
    return '🚗';
  if (
    n.includes('nhà') ||
    n.includes('điện') ||
    n.includes('nước') ||
    n.includes('internet') ||
    n.includes('phòng') ||
    n.includes('thuê')
  )
    return '🏠';
  if (
    n.includes('giải trí') ||
    n.includes('phim') ||
    n.includes('du lịch') ||
    n.includes('game') ||
    n.includes('chơi')
  )
    return '🎬';
  if (
    n.includes('sức khỏe') ||
    n.includes('thuốc') ||
    n.includes('khám') ||
    n.includes('bệnh') ||
    n.includes('gym') ||
    n.includes('thể thao')
  )
    return '💊';
  if (n.includes('học') || n.includes('sách') || n.includes('khóa') || n.includes('trường'))
    return '📚';
  if (
    n.includes('lương') ||
    n.includes('thưởng') ||
    n.includes('thu nhập') ||
    n.includes('tiền về') ||
    n.includes('bonus')
  )
    return '💵';
  if (
    n.includes('đầu tư') ||
    n.includes('cổ phiếu') ||
    n.includes('vàng') ||
    n.includes('quỹ') ||
    n.includes('chứng')
  )
    return '📈';
  if (n.includes('nợ') || n.includes('vay') || n.includes('mượn') || n.includes('trả')) return '🤝';
  if (n.includes('quà') || n.includes('biếu') || n.includes('tặng') || n.includes('mừng'))
    return '🎁';
  if (n.includes('hóa đơn') || n.includes('phí') || n.includes('dịch vụ')) return '📄';
  if (type === 'INCOME') return '💰';
  if (type === 'INVESTMENT') return '📈';
  return '💸';
}
