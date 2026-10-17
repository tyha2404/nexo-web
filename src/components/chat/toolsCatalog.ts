import moment from 'moment';

// Ordered tool categories used for grouping the catalog and rendering filter tabs.
export const AI_TOOL_CATEGORIES = [
  { id: 'Giao dịch', icon: '💸', label: 'Giao dịch' },
  { id: 'Ví & Tiền tệ', icon: '💳', label: 'Ví & Tiền tệ' },
  { id: 'Ngân sách & Mục tiêu', icon: '🎯', label: 'Ngân sách & Mục tiêu' },
  { id: 'Vay & Nợ', icon: '🤝', label: 'Vay & Nợ' },
  { id: 'Báo cáo & Phân tích', icon: '📊', label: 'Báo cáo & Phân tích' },
  { id: 'Tri thức tài chính', icon: '🧠', label: 'Tri thức tài chính' },
] as const;

export type AIToolCategory = (typeof AI_TOOL_CATEGORIES)[number]['id'];

export const ALL_CATEGORY = 'ALL';

export interface AIToolItem {
  id: string;
  name: string;
  category: AIToolCategory;
  icon: string;
  description: string;
  promptExample: string;
}

export const CORE_QUICK_CHIPS = [
  { text: 'Chi 45k cafe qua MoMo', icon: '💸', category: 'Ghi chép chi' },
  { text: 'Vừa nhận lương 15tr', icon: '💰', category: 'Ghi chép thu' },
  { text: 'Số dư các ví hiện tại', icon: '💳', category: 'Tra cứu ví' },
  { text: 'Tháng này đã chi tiêu bao nhiêu?', icon: '📊', category: 'Báo cáo' },
];

export const AI_TOOLS_CATALOG: AIToolItem[] = [
  // ─── Giao dịch ───────────────────────────────────────────────
  {
    id: 'create_transaction',
    name: 'Ghi chép thu / chi tự động',
    category: 'Giao dịch',
    icon: '💸',
    description:
      'Tự động phân loại danh mục, chọn ví và tạo giao dịch thu/chi nhanh bằng ngôn ngữ tự nhiên.',
    promptExample: 'Tôi vừa chi 45k ăn sáng bánh mì qua ví MoMo',
  },
  {
    id: 'create_category',
    name: 'Tạo danh mục mới',
    category: 'Giao dịch',
    icon: '🏷️',
    description: 'Tạo danh mục chi tiêu, thu nhập hoặc đầu tư mới theo nhu cầu thực tế.',
    promptExample: 'Tạo danh mục Học tập loại chi tiêu',
  },
  {
    id: 'list_recent_transactions',
    name: 'Lịch sử giao dịch gần đây',
    category: 'Giao dịch',
    icon: '📝',
    description: 'Tra cứu danh sách các giao dịch phát sinh gần nhất.',
    promptExample: 'Lịch sử 5 giao dịch gần đây nhất của tôi',
  },
  {
    id: 'search_transactions',
    name: 'Tìm kiếm giao dịch nâng cao',
    category: 'Giao dịch',
    icon: '🔎',
    description: 'Lọc giao dịch theo danh mục, ví, khoảng thời gian, số tiền hoặc từ khóa ghi chú.',
    promptExample: 'Tìm các giao dịch ăn uống trên ví MoMo tháng này trên 100 nghìn',
  },
  {
    id: 'list_categories',
    name: 'Danh mục thu chi của tôi',
    category: 'Giao dịch',
    icon: '📂',
    description: 'Xem toàn bộ danh mục thu/chi kèm tổng tiền đã chi tiêu trong tháng hiện tại.',
    promptExample: 'Cho tôi xem tất cả danh mục chi tiêu và mức đã chi tháng này',
  },

  // ─── Ví & Tiền tệ ────────────────────────────────────────────
  {
    id: 'list_wallets',
    name: 'Danh sách & số dư các ví',
    category: 'Ví & Tiền tệ',
    icon: '💳',
    description:
      'Tra cứu số dư thực tế và danh sách toàn bộ các tài khoản ngân hàng, ví điện tử, tiền mặt.',
    promptExample: 'Xem danh sách và số dư các ví tài khoản của tôi',
  },
  {
    id: 'get_wallet_detail',
    name: 'Chi tiết một ví cụ thể',
    category: 'Ví & Tiền tệ',
    icon: '🏦',
    description: 'Xem số dư hiện tại và lịch sử giao dịch phát sinh gần nhất trên một ví cụ thể.',
    promptExample: 'Xem chi tiết ví Techcombank và giao dịch gần nhất',
  },
  {
    id: 'transfer_between_wallets',
    name: 'Chuyển tiền giữa các ví',
    category: 'Ví & Tiền tệ',
    icon: '🔄',
    description: 'Chuyển tiền nội bộ giữa các tài khoản ngân hàng, ví điện tử hoặc tiền mặt.',
    promptExample: 'Rút 1 triệu từ Techcombank về ví Tiền mặt',
  },

  // ─── Ngân sách & Mục tiêu ────────────────────────────────────
  {
    id: 'get_budget_status',
    name: 'Kiểm tra hạn mức ngân sách',
    category: 'Ngân sách & Mục tiêu',
    icon: '🛡️',
    description:
      'Theo dõi tiến độ, số tiền còn lại và nhận cảnh báo nếu chi tiêu sắp hoặc đã vượt ngân sách.',
    promptExample: 'Kiểm tra tình hình hạn mức các ngân sách chi tiêu tháng này',
  },
  {
    id: 'set_budget',
    name: 'Thiết lập ngân sách danh mục',
    category: 'Ngân sách & Mục tiêu',
    icon: '🎯',
    description: 'Tạo hoặc điều chỉnh hạn mức chi tiêu hàng tháng cho danh mục cụ thể.',
    promptExample: 'Đặt ngân sách cho danh mục Ăn uống là 3.5 triệu',
  },
  {
    id: 'get_financial_targets',
    name: 'Tiến độ mục tiêu tài chính tháng',
    category: 'Ngân sách & Mục tiêu',
    icon: '🏆',
    description:
      'Kiểm tra tiến độ thực hiện hạn mức chi tiêu tổng (EXPENSE) và mục tiêu đầu tư (INVESTMENT).',
    promptExample: 'Kiểm tra tiến độ các mục tiêu tài chính tháng này',
  },
  {
    id: 'set_financial_target',
    name: 'Thiết lập mục tiêu tháng',
    category: 'Ngân sách & Mục tiêu',
    icon: '⚙️',
    description: 'Đặt hạn mức chi tiêu tối đa hoặc mục tiêu tích lũy đầu tư trong tháng.',
    promptExample: 'Đặt mục tiêu chi tiêu tối đa tháng này là 8 triệu',
  },

  // ─── Vay & Nợ ────────────────────────────────────────────────
  {
    id: 'get_debt_summary',
    name: 'Tổng hợp nợ & khoản phải thu',
    category: 'Vay & Nợ',
    icon: '📋',
    description: 'Xem tổng hợp các khoản nợ cần trả và các khoản cho người khác mượn.',
    promptExample: 'Báo cáo tổng quan các khoản nợ và cho vay của tôi',
  },
  {
    id: 'create_debt',
    name: 'Ghi nhận khoản vay / cho mượn',
    category: 'Vay & Nợ',
    icon: '🤝',
    description: 'Ghi chép một khoản nợ phải trả (PAYABLE) hoặc cho người khác vay (RECEIVABLE).',
    promptExample: 'Cho Nam mượn 2 triệu hẹn ngày 30 trả',
  },
  {
    id: 'record_debt_repayment',
    name: 'Ghi nhận trả nợ / thu nợ',
    category: 'Vay & Nợ',
    icon: '💵',
    description: 'Cập nhật trả nợ hoặc thu hồi nợ từng phần/toàn phần cho khoản nợ hiện có.',
    promptExample: 'Nam vừa trả tôi 1 triệu tiền nợ',
  },

  // ─── Báo cáo & Phân tích ─────────────────────────────────────
  {
    id: 'get_financial_overview',
    name: 'Tổng quan tài chính tháng',
    category: 'Báo cáo & Phân tích',
    icon: '📊',
    description: 'Xem tổng số dư ví, tổng thu nhập, tổng chi tiêu và tỷ lệ tiết kiệm theo tháng.',
    promptExample: 'Tổng quan tài chính tháng này của tôi như thế nào?',
  },
  {
    id: 'get_spending_by_category',
    name: 'Cơ cấu chi tiêu danh mục',
    category: 'Báo cáo & Phân tích',
    icon: '📈',
    description: 'Phân tích tỷ trọng và số tiền chi tiêu của từng danh mục trong tháng.',
    promptExample: 'Phân tích cơ cấu chi tiêu tháng này của tôi',
  },
  {
    id: 'compare_financial_periods',
    name: 'So sánh tài chính các tháng',
    category: 'Báo cáo & Phân tích',
    icon: '⚖️',
    description: 'So sánh biến động tăng giảm thu nhập, chi tiêu giữa hai tháng bất kỳ.',
    promptExample: 'So sánh chi tiêu tháng này so với tháng trước',
  },
  {
    id: 'get_monthly_trend',
    name: 'Xu hướng thu chi nhiều tháng',
    category: 'Báo cáo & Phân tích',
    icon: '📉',
    description: 'Phân tích biến động thu nhập, chi tiêu và tiết kiệm qua các tháng gần đây.',
    promptExample: 'Phân tích xu hướng chi tiêu 6 tháng gần đây của tôi',
  },
  {
    id: 'get_investment_summary',
    name: 'Danh mục đầu tư & tài sản',
    category: 'Báo cáo & Phân tích',
    icon: '💼',
    description: 'Tổng hợp số tiền đang đầu tư, lãi/lỗ đã chốt và giao dịch đầu tư gần nhất.',
    promptExample: 'Danh mục đầu tư của tôi hiện tại thế nào rồi?',
  },

  // ─── Tri thức tài chính (RAG) ────────────────────────────────
  {
    id: 'rag_asset_allocation_pyramid',
    name: 'Mô hình Tháp Tài Sản Cá Nhân',
    category: 'Tri thức tài chính',
    icon: '🏛️',
    description:
      'Khung phân bổ 4 tầng: Đáy bảo vệ phòng vệ, Thu nhập cố định, Tăng trưởng và Mạo hiểm.',
    promptExample: 'Giải thích mô hình tháp tài sản và cách áp dụng phân bổ vốn cho tôi',
  },
  {
    id: 'rag_fire_and_4_percent_rule',
    name: 'Quy tắc 4% & Độc Lập Tài Chính FIRE',
    category: 'Tri thức tài chính',
    icon: '🔥',
    description:
      'Chiến lược nghỉ hưu sớm, tính con số tự do tài chính (Chi tiêu x 25) và tỷ lệ rút 4%/năm.',
    promptExample: 'Tính con số tự do tài chính FIRE và quy tắc 4% để nghỉ hưu sớm',
  },
  {
    id: 'rag_rule_of_72',
    name: 'Quy tắc 72 & Sức Mạnh Lãi Kép',
    category: 'Tri thức tài chính',
    icon: '⚡',
    description:
      'Công thức tính nhanh thời gian nhân đôi tài sản (Số năm = 72 / Lãi suất %) và tác động lạm phát.',
    promptExample: 'Quy tắc 72 là gì và với lãi suất 10%/năm thì sau bao lâu tiền đầu tư nhân đôi?',
  },
  {
    id: 'rag_dca_strategy',
    name: 'Chiến Lược Đầu Tư Định Kỳ DCA',
    category: 'Tri thức tài chính',
    icon: '📈',
    description:
      'Phương pháp trung bình giá định kỳ vào quỹ chỉ số, chứng khoán, vàng giúp loại bỏ tâm lý FOMO.',
    promptExample: 'Chiến lược đầu tư tích sản định kỳ DCA hoạt động như thế nào?',
  },
  {
    id: 'rag_kakeibo_method',
    name: 'Phương Pháp Kakeibo của Nhật Bản',
    category: 'Tri thức tài chính',
    icon: '📖',
    description:
      'Quản lý chi tiêu chánh niệm 4 nhóm: Thiết yếu, Hưởng thụ, Văn hóa phát triển bản thân và Phát sinh.',
    promptExample: 'Hướng dẫn cách quản lý chi tiêu theo phương pháp Kakeibo của Nhật Bản',
  },
  {
    id: 'rag_smart_credit_card',
    name: 'Quản Lý Thẻ Tín Dụng Thông Minh',
    category: 'Tri thức tài chính',
    icon: '💳',
    description:
      'Tận dụng chu kỳ miễn lãi 45-55 ngày, tối ưu hoàn tiền và tránh bẫy trả nợ tối thiểu 25-45%/năm.',
    promptExample:
      'Làm thế nào để sử dụng thẻ tín dụng thông minh, tối ưu hoàn tiền và tránh bị tính lãi?',
  },
  {
    id: 'rag_assets_vs_liabilities',
    name: 'Tư Duy Tài Sản vs Tiêu Sản',
    category: 'Tri thức tài chính',
    icon: '💰',
    description:
      'Nguyên tắc dòng tiền Cashflow của Robert Kiyosaki: Tiền vào túi vs Tiền ra khỏi túi.',
    promptExample: 'Phân biệt tài sản và tiêu sản theo trường phái dòng tiền của Robert Kiyosaki',
  },
  {
    id: 'rag_impulse_spending_control',
    name: 'Quy Tắc 24 Giờ & 30 Ngày Mua Sắm',
    category: 'Tri thức tài chính',
    icon: '⏳',
    description:
      'Kỹ thuật trì hoãn tâm lý để kiềm chế mua sắm bốc đồng và quy đổi giá trị món đồ ra giờ làm việc.',
    promptExample: 'Quy tắc 24 giờ và 30 ngày giúp kiểm soát mua sắm bốc đồng ra sao?',
  },
  {
    id: 'rag_50_30_20_rule',
    name: 'Quy Tắc Phân Bổ 50/30/20',
    category: 'Tri thức tài chính',
    icon: '⚖️',
    description:
      'Phân bổ thu nhập ròng: 50% Nhu cầu thiết yếu, 30% Mong muốn cá nhân, 20% Tiết kiệm & Đầu tư.',
    promptExample: 'Tư vấn cách phân bổ thu nhập hàng tháng theo quy tắc 50/30/20',
  },
  {
    id: 'rag_6_jars_system',
    name: 'Hệ Thống 6 Chiếc Hũ Tài Chính',
    category: 'Tri thức tài chính',
    icon: '🏺',
    description:
      'Phương pháp phân bổ 6 quỹ: NEC (55%), FFA (10%), LTSS (10%), EDU (10%), PLAY (10%), GIVE (5%).',
    promptExample: 'Cách chia thu nhập vào 6 chiếc hũ tài chính để quản lý tiền hiệu quả',
  },
  {
    id: 'rag_emergency_fund',
    name: 'Quỹ Dự Phòng Tài Chính Khẩn Cấp',
    category: 'Tri thức tài chính',
    icon: '🛡️',
    description:
      'Nguyên tắc tích lũy 3-6 tháng chi phí sinh hoạt thiết yếu để phòng vệ trước rủi ro và biến cố.',
    promptExample: 'Cần tích lũy bao nhiêu cho quỹ dự phòng khẩn cấp và gửi ở đâu an toàn?',
  },
  {
    id: 'rag_debt_payoff_strategies',
    name: 'Chiến Lược Trả Nợ Snowball & Avalanche',
    category: 'Tri thức tài chính',
    icon: '📉',
    description:
      'So sánh phương pháp trả nợ quả cầu tuyết (tâm lý) và trả nợ lãi suất cao trước (tối ưu tài chính).',
    promptExample:
      'So sánh chiến lược trả nợ Quả cầu tuyết (Snowball) và Trả nợ lãi cao (Avalanche)',
  },
  {
    id: 'rag_expense_leaks_control',
    name: 'Kiểm Soát Lỗ Rò Rỉ Chi Tiêu Ngầm',
    category: 'Tri thức tài chính',
    icon: '🔍',
    description:
      'Nhận diện hiệu ứng Latte, hủy các gói đăng ký không dùng và cắt giảm các khoản phí dịch vụ ẩn.',
    promptExample:
      'Làm thế nào để phát hiện và kiểm soát các khoản chi tiêu rò rỉ tài chính hàng tháng?',
  },
];

export interface QuickPrompt {
  text: string;
  icon: string;
}

/** Contextual quick prompts based on the day of the month/week. */
export function getDynamicQuickPrompts(): QuickPrompt[] {
  const now = moment();
  const day = now.date();
  const isWeekend = now.day() === 0 || now.day() === 6;

  const base = [
    { text: 'Giải thích mô hình tháp tài sản và cách phân bổ vốn', icon: '🏛️' },
    { text: 'Tư vấn phân bổ thu nhập theo quy tắc 50/30/20', icon: '⚖️' },
    { text: 'Cách chia thu nhập vào 6 chiếc hũ tài chính', icon: '🏺' },
  ];

  if (day <= 7) {
    return [
      { text: 'Lập kế hoạch và kiểm tra ngân sách tháng này', icon: '🎯' },
      { text: 'Tổng quan tài chính tháng này của tôi', icon: '📊' },
      ...base,
      { text: 'Xem các khoản nợ cần thanh toán trong tháng', icon: '📋' },
    ];
  } else if (isWeekend || day >= 25) {
    return [
      { text: 'Tổng kết chi tiêu và số dư tuần này', icon: '📊' },
      { text: 'Phân tích cơ cấu chi tiêu tháng này', icon: '📈' },
      ...base,
      { text: 'Tính con số tự do tài chính FIRE và quy tắc 4%', icon: '🔥' },
      { text: 'Cảnh báo ngân sách sắp hoặc đã vượt hạn mức', icon: '⚠️' },
    ];
  }

  return [
    { text: 'Tổng quan tài chính tháng này của tôi', icon: '📊' },
    { text: 'Kiểm tra tình hình hạn mức các ngân sách', icon: '🎯' },
    ...base,
    { text: 'Chiến lược đầu tư tích sản định kỳ DCA', icon: '📈' },
    { text: 'Quy tắc 72 và thời gian nhân đôi tài sản', icon: '⚡' },
  ];
}
