import moment from 'moment';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { User } from '../../commons/types';
import {
  authService,
  chatService,
  transactionService,
  type ActionCard,
  type ChatMessage,
  type ChatSession,
} from '../../services/api';
import './AIChatWidget.css';

interface AIChatWidgetProps {
  user?: User | null;
}

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

const ALL_CATEGORY = 'ALL';

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

export const AIChatWidget: React.FC<AIChatWidgetProps> = ({ user: initialUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(initialUser || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeToolTitle, setActiveToolTitle] = useState<string | null>(null);
  const [showSessionsList, setShowSessionsList] = useState(false);
  const [showToolsDrawer, setShowToolsDrawer] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORY);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<Record<string, string>>({});

  // Mobile touch drag-to-dismiss states
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);

  // Catalog grouped by category, following AI_TOOL_CATEGORIES order.
  const groupedTools = useMemo(() => {
    return AI_TOOL_CATEGORIES.map((cat) => ({
      ...cat,
      tools: AI_TOOLS_CATALOG.filter((t) => t.category === cat.id),
    })).filter((group) => selectedCategory === ALL_CATEGORY || group.id === selectedCategory);
  }, [selectedCategory]);

  const speechRecognitionRef = useRef<any>(null);

  // Dynamic Contextual Quick Prompts based on day of month/week
  const dynamicQuickPrompts = useMemo(() => {
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
  }, []);

  // Initialize Web Speech API for Voice Input
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'vi-VN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsListening(false);
      };

      recognition.onerror = (e: any) => {
        console.warn('Voice recognition error:', e);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      speechRecognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!speechRecognitionRef.current) return;
    if (isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        speechRecognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  useEffect(() => {
    if (initialUser) {
      setCurrentUser(initialUser);
    } else {
      authService
        .whoami()
        .then(setCurrentUser)
        .catch(() => {});
    }
  }, [initialUser]);

  const getUserInitial = () => {
    if (currentUser?.username && currentUser.username.trim().length > 0) {
      return currentUser.username.trim()[0].toUpperCase();
    }
    return 'U';
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessageRef = useRef<(textToSend?: string) => Promise<void>>(async () => {});

  // Listen to open-ai-chat custom event triggered by header button or external action
  useEffect(() => {
    const handleOpenAIChat = (e?: any) => {
      const prompt = e?.detail?.prompt;
      const autoSend = e?.detail?.autoSend;

      if (prompt) {
        setIsOpen(true);
        if (autoSend) {
          handleSendMessageRef.current(prompt);
        } else {
          setInput(prompt);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
              textareaRef.current.style.height = 'auto';
              textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
            }
          }, 100);
        }
      } else {
        setIsOpen((prev) => !prev);
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 100);
      }
    };

    window.addEventListener('open-ai-chat', handleOpenAIChat);
    return () => {
      window.removeEventListener('open-ai-chat', handleOpenAIChat);
    };
  }, []);

  // Click outside & Escape key to close chat window on desktop
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        window.innerWidth > 768 &&
        chatWindowRef.current &&
        !chatWindowRef.current.contains(target)
      ) {
        const isHeaderAiBtn = (target as HTMLElement).closest?.('.header-ai-btn');
        if (!isHeaderAiBtn) {
          setIsOpen(false);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const sessionData = await chatService.getSessionMessages(sessionId);
      setCurrentSessionId(sessionData.id);
      setMessages(sessionData.messages || []);
      setShowSessionsList(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
    } catch (err) {
      console.error('Failed to load session messages:', err);
    }
  };

  const loadSessions = async () => {
    try {
      const sessList = await chatService.listSessions();
      setSessions(sessList);
      if (sessList.length > 0 && !currentSessionId) {
        loadSessionMessages(sessList[0].id);
      }
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeToolTitle]);

  useEffect(() => {
    if (isOpen) {
      loadSessions();
      // Scroll to bottom when opening chat
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleNewChat = () => {
    setCurrentSessionId(undefined);
    setMessages([]);
    setShowSessionsList(false);
    setShowToolsDrawer(false);
    setActiveToolTitle(null);
    setInput('');
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      await chatService.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        handleNewChat();
      }
    } catch (err) {
      console.error('Failed to delete chat session:', err);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện không?')) {
      try {
        await chatService.clearSessions();
        setSessions([]);
        handleNewChat();
      } catch (err) {
        console.error('Failed to clear sessions:', err);
      }
    }
  };

  // Confirm transaction proposed by Action Card
  const handleConfirmTransaction = async (cardData: any, msgIdx: number) => {
    try {
      if (cardData) {
        await transactionService.create({
          amount: Number(cardData.amount) || 0,
          type: cardData.type || 'EXPENSE',
          categoryId: cardData.categoryId || cardData.category_id || '',
          walletId: cardData.walletId || cardData.wallet_id,
          transactionDate: cardData.date
            ? moment(cardData.date).format('YYYY-MM-DD')
            : moment().format('YYYY-MM-DD'),
          description: cardData.note || cardData.description || '',
        });
        setActionFeedback((prev) => ({
          ...prev,
          [msgIdx]: 'Đã xác nhận và ghi chép giao dịch thành công!',
        }));
        window.dispatchEvent(new CustomEvent('transaction-created'));
        window.dispatchEvent(new CustomEvent('transactions-changed'));
      }
    } catch (err: any) {
      console.error('Failed to confirm transaction:', err);
      setActionFeedback((prev) => ({
        ...prev,
        [msgIdx]: `Lỗi ghi chép: ${err.message || 'Không thể tạo giao dịch'}`,
      }));
    }
  };

  // Cancel action card
  const handleCancelAction = (msgIdx: number) => {
    setActionFeedback((prev) => ({
      ...prev,
      [msgIdx]: 'Đã hủy thao tác này.',
    }));
  };

  // Undo transaction created by Action Card
  const handleUndoTransaction = async (cardData: any, msgIdx: number) => {
    const transactionId = cardData?.id || cardData?.transactionId || cardData?.transaction_id;
    if (!transactionId) {
      setActionFeedback((prev) => ({
        ...prev,
        [msgIdx]: 'Đã hoàn tác thao tác.',
      }));
      return;
    }
    try {
      await transactionService.delete(transactionId);
      setActionFeedback((prev) => ({
        ...prev,
        [msgIdx]: 'Đã hoàn tác và xóa giao dịch thành công.',
      }));
      window.dispatchEvent(new CustomEvent('transaction-deleted'));
      window.dispatchEvent(new CustomEvent('transactions-changed'));
    } catch (err) {
      console.error('Failed to undo transaction:', err);
      setActionFeedback((prev) => ({ ...prev, [msgIdx]: 'Lỗi khi hoàn tác giao dịch.' }));
    }
  };

  const handleRetry = (modelMsgIdx: number) => {
    let promptToRetry = '';
    for (let i = modelMsgIdx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        promptToRetry = messages[i].content;
        break;
      }
    }
    if (promptToRetry) {
      handleSendMessage(promptToRetry);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || input).trim();
    if (!messageText || isLoading) return;

    setInput('');
    setIsLoading(true);
    setActiveToolTitle(null);

    const userMsg: ChatMessage = {
      role: 'user',
      content: messageText,
      status: 'SUCCESS',
      createdAt: moment().toISOString(),
    };

    const modelMsg: ChatMessage = {
      role: 'model',
      content: '',
      status: 'STREAMING',
      createdAt: moment().toISOString(),
    };

    setMessages((prev) => {
      const sanitized = prev.map((m) => {
        if (m.role === 'model' && !m.content) {
          return {
            ...m,
            content: '⚠️ Phiên trò chuyện này đã bị gián đoạn.',
            status: 'ERROR' as const,
          };
        }
        return m;
      });
      return [...sanitized, userMsg, modelMsg];
    });

    let accumulatedContent = '';
    let latestActionCard: ActionCard | undefined = undefined;

    await chatService.sendStreamMessage(
      {
        sessionId: currentSessionId,
        message: messageText,
      },
      (event) => {
        if (event.type === 'session_info' && event.sessionId) {
          setCurrentSessionId(event.sessionId);
        } else if (event.type === 'tool_start') {
          setActiveToolTitle(event.toolTitle || 'Đang xử lý...');
        } else if (event.type === 'tool_done') {
          setActiveToolTitle(null);
        } else if (event.type === 'action_card' && event.actionCard) {
          latestActionCard = event.actionCard;
          if (event.actionCard.actionType === 'TRANSACTION_CREATED') {
            window.dispatchEvent(new CustomEvent('transaction-created'));
            window.dispatchEvent(new CustomEvent('transactions-changed'));
            if ((event.actionCard.data as any)?.isNewCategoryCreated) {
              window.dispatchEvent(new CustomEvent('categories-changed'));
            }
          } else if (event.actionCard.actionType === 'CATEGORY_CREATED') {
            window.dispatchEvent(new CustomEvent('categories-changed'));
          }
        } else if (event.type === 'text_delta' && event.delta) {
          accumulatedContent += event.delta;
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === 'model') {
              updated[lastIdx] = {
                ...updated[lastIdx],
                id: event.messageId || updated[lastIdx].id,
                content: accumulatedContent,
                status: 'STREAMING',
                actionCard: latestActionCard,
              };
            }
            return updated;
          });
        } else if (event.type === 'error') {
          const errDetail = event.errorMessage || 'Lỗi xử lý';
          accumulatedContent = accumulatedContent
            ? `${accumulatedContent}\n\n⚠️ ${errDetail}`
            : `⚠️ ${errDetail}`;
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === 'model') {
              updated[lastIdx] = {
                ...updated[lastIdx],
                id: event.messageId || updated[lastIdx].id,
                content: accumulatedContent,
                status: 'ERROR',
              };
            }
            return updated;
          });
        }
      },
      () => {
        setIsLoading(false);
        setActiveToolTitle(null);
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === 'model') {
            if (!updated[lastIdx].content) {
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: '⚠️ Không nhận được phản hồi từ AI hoặc phiên xử lý đã kết thúc.',
                status: 'ERROR',
              };
            } else if (updated[lastIdx].status !== 'ERROR') {
              updated[lastIdx] = {
                ...updated[lastIdx],
                status: 'SUCCESS',
              };
            }
          }
          return updated;
        });
        loadSessions();
      },
      (err) => {
        setIsLoading(false);
        setActiveToolTitle(null);
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === 'model') {
            const currentContent = updated[lastIdx].content;
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: currentContent
                ? `${currentContent}\n\n⚠️ Có lỗi kết nối: ${err.message}`
                : `⚠️ Có lỗi kết nối: ${err.message}`,
              status: 'ERROR',
            };
          }
          return updated;
        });
      }
    );
  };

  handleSendMessageRef.current = handleSendMessage;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Mobile Touch Gestures for Drag-to-Dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY;
    if (diff > 0) {
      setDragOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    if (dragOffset > 90) {
      setIsOpen(false);
    }
    setTouchStartY(null);
    setDragOffset(0);
  };

  // Desktop Resizing state
  const [chatDimensions, setChatDimensions] = useState<{ width: number; height: number }>(() => {
    if (typeof window !== 'undefined') {
      const savedW = localStorage.getItem('nexo_chat_width');
      const savedH = localStorage.getItem('nexo_chat_height');
      return {
        width: savedW ? Math.min(Math.max(parseInt(savedW), 380), window.innerWidth - 32) : 460,
        height: savedH ? Math.min(Math.max(parseInt(savedH), 480), window.innerHeight - 100) : 640,
      };
    }
    return { width: 460, height: 640 };
  });
  const [isResizing, setIsResizing] = useState(false);

  const resizeStartRef = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: chatDimensions.width,
      startH: chatDimensions.height,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !resizeStartRef.current) return;
      const deltaX = resizeStartRef.current.startX - e.clientX;
      const deltaY = resizeStartRef.current.startY - e.clientY;

      const maxWidth = window.innerWidth - 48;
      const maxHeight = window.innerHeight - 100;
      const minWidth = 380;
      const minHeight = 460;

      const newWidth = Math.min(
        Math.max(resizeStartRef.current.startW + deltaX, minWidth),
        maxWidth
      );
      const newHeight = Math.min(
        Math.max(resizeStartRef.current.startH + deltaY, minHeight),
        maxHeight
      );

      setChatDimensions({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        localStorage.setItem('nexo_chat_width', chatDimensions.width.toString());
        localStorage.setItem('nexo_chat_height', chatDimensions.height.toString());
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, chatDimensions]);

  // Helper to format inline bold, code, highlights
  const formatInlineText = (text: string) => {
    if (!text) return '';
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, partIdx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return (
          <code key={partIdx} className="chat-inline-code">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  // Helper function to render text with Markdown styling (Tables, Headings, Lists, Blockquotes)
  const renderFormattedText = (text: string) => {
    if (!text) return null;

    // Defense-in-depth: Strip any thinking / reasoning tags (<think>...</think>) from text
    const cleanText = text
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
      .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
      .replace(/<think>[\s\S]*$/gi, '')
      .replace(/<thought>[\s\S]*$/gi, '')
      .replace(/<thinking>[\s\S]*$/gi, '')
      .trim();

    if (!cleanText) return null;

    const rawLines = cleanText.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < rawLines.length) {
      const line = rawLines[i];
      const trimmed = line.trim();

      // Check if this line is part of a markdown table (starts and contains '|')
      if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|')) {
        const tableLines: string[] = [];
        while (
          i < rawLines.length &&
          rawLines[i].trim().startsWith('|') &&
          rawLines[i].trim().endsWith('|')
        ) {
          tableLines.push(rawLines[i].trim());
          i++;
        }

        if (tableLines.length >= 2) {
          const headerCells = tableLines[0]
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim());

          let bodyStartIndex = 1;
          if (tableLines[1].replace(/[\s|:-]/g, '').length === 0) {
            bodyStartIndex = 2;
          }

          const rows = tableLines.slice(bodyStartIndex).map((rowLine) => {
            return rowLine
              .slice(1, -1)
              .split('|')
              .map((c) => c.trim());
          });

          elements.push(
            <div key={`table-${i}`} className="chat-markdown-table-wrapper">
              <table className="chat-markdown-table">
                <thead>
                  <tr>
                    {headerCells.map((th, thIdx) => (
                      <th key={thIdx}>{formatInlineText(th)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx}>{formatInlineText(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          continue;
        }
      }

      // Headings
      if (line.startsWith('# ')) {
        elements.push(
          <h3 key={`h3-${i}`} className="chat-md-h3">
            {formatInlineText(line.slice(2))}
          </h3>
        );
        i++;
        continue;
      }
      if (line.startsWith('## ') || line.startsWith('### ')) {
        elements.push(
          <h4 key={`h4-${i}`} className="chat-md-h4">
            {formatInlineText(line.replace(/^#{2,3}\s+/, ''))}
          </h4>
        );
        i++;
        continue;
      }

      // Bullet lists
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        elements.push(
          <li key={`li-${i}`} className="chat-md-li">
            {formatInlineText(trimmed.slice(2))}
          </li>
        );
        i++;
        continue;
      }

      // Blockquotes
      if (trimmed.startsWith('> ')) {
        elements.push(
          <blockquote key={`bq-${i}`} className="chat-md-blockquote">
            {formatInlineText(trimmed.slice(2))}
          </blockquote>
        );
        i++;
        continue;
      }

      // Regular paragraph
      if (line === '') {
        elements.push(<div key={`sp-${i}`} className="chat-md-spacer" />);
      } else {
        elements.push(
          <p key={`p-${i}`} className="chat-md-p">
            {formatInlineText(line)}
          </p>
        );
      }
      i++;
    }

    return elements;
  };

  return createPortal(
    <>
      {/* Backdrop Overlay with Blur Effect */}
      {isOpen && (
        <div
          className="ai-backdrop"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
          title="Nhấn để đóng chat"
        />
      )}

      {/* Chat Window / Drawer / Bottom Sheet */}
      {isOpen && (
        <div
          ref={chatWindowRef}
          className={`nexo-chat-window ${isResizing ? 'resizing' : ''}`}
          style={{
            ...(window.innerWidth > 768
              ? {
                  width: `${chatDimensions.width}px`,
                  height: `${chatDimensions.height}px`,
                }
              : {
                  transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
                  transition: dragOffset > 0 ? 'none' : undefined,
                }),
          }}
        >
          {/* Top Mobile Drag Handle Bar */}
          <div
            className="chat-mobile-drag-bar"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={() => setIsOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Kéo xuống hoặc nhấn để đóng"
          >
            <div className="chat-drag-indicator" />
          </div>

          {/* Desktop Top-Left Resize Handle */}
          <div
            className="chat-resize-handle-nw"
            onMouseDown={startResizing}
            title="Kéo để thay đổi kích thước khung chat"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="2" y1="2" x2="16" y2="2" />
              <line x1="2" y1="2" x2="2" y2="16" />
              <line x1="2" y1="2" x2="22" y2="22" />
            </svg>
          </div>

          {/* Prominent Header inside Chat Drawer */}
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar-wrapper">
                <div className="chat-avatar">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2v4" />
                    <path d="m19.07 4.93-2.83 2.83" />
                    <path d="M20 12h-4" />
                    <path d="m16.24 16.24 2.83 2.83" />
                    <path d="M12 18v4" />
                    <path d="m4.93 19.07 2.83-2.83" />
                    <path d="M4 12h4" />
                    <path d="m7.76 7.76-2.83-2.83" />
                  </svg>
                </div>
                <span className="online-indicator-dot" />
              </div>
              <div className="chat-header-title">
                <div className="chat-header-name-row">
                  <h3>Nexo AI</h3>
                  <span className="chat-mode-badge">Trợ lý tài chính AI</span>
                </div>
                <div className="chat-status-indicator">
                  <span className="online-dot" />
                  <span>Sẵn sàng hỗ trợ</span>
                </div>
              </div>
            </div>

            <div className="chat-header-actions">
              <button className="chat-icon-btn" onClick={handleNewChat} title="Tạo hội thoại mới">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>

              <button
                className={`chat-icon-btn ${showToolsDrawer ? 'active' : ''}`}
                onClick={() => {
                  setShowToolsDrawer(!showToolsDrawer);
                  if (showSessionsList) setShowSessionsList(false);
                }}
                title="Danh sách công cụ AI (Financial Tools)"
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </button>

              <button
                className={`chat-icon-btn ${showSessionsList ? 'active' : ''}`}
                onClick={() => {
                  setShowSessionsList(!showSessionsList);
                  if (showToolsDrawer) setShowToolsDrawer(false);
                }}
                title="Lịch sử trò chuyện"
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>

              <button
                className="chat-icon-btn chat-close-btn"
                onClick={() => setIsOpen(false)}
                title="Đóng"
                aria-label="Close"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Main Body with Chat Area & Right Sidebar */}
          <div className="chat-body-layout">
            <div className="chat-main-column">
              {/* Messages Area */}
              <div className="chat-messages-container">
                {messages.length === 0 ? (
                  <div className="chat-empty-state">
                    <div className="empty-icon">
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
                        <path d="M12 6v6l4 2" />
                      </svg>
                    </div>
                    <h4>Xin chào! Tôi là Nexo AI Copilot</h4>
                    <p>
                      Tôi có thể giúp bạn tự động ghi nhận thu chi, tra cứu số dư ví, đối soát ngân
                      sách và phân tích chi tiêu ngay tức thì.
                    </p>

                    {/* Primary 1-Tap Quick Prompt Chips */}
                    <div className="core-quick-chips-section">
                      <span className="quick-chips-title">⚡ Gợi ý thử nghiệm nhanh</span>
                      <div className="core-quick-chips-grid">
                        {CORE_QUICK_CHIPS.map((chip, idx) => (
                          <button
                            key={idx}
                            className="core-quick-chip-card"
                            onClick={() => handleSendMessage(chip.text)}
                          >
                            <div className="chip-card-top">
                              <span className="chip-card-icon">{chip.icon}</span>
                              <span className="chip-card-badge">{chip.category}</span>
                            </div>
                            <span className="chip-card-text">{chip.text}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Contextual Prompts */}
                    <div className="quick-prompts-grid">
                      <span className="quick-chips-title">💡 Gợi ý theo thời gian</span>
                      {dynamicQuickPrompts.map((prompt, idx) => (
                        <button
                          key={idx}
                          className="quick-prompt-btn"
                          onClick={() => handleSendMessage(prompt.text)}
                        >
                          <span>{prompt.icon}</span>
                          <span>{prompt.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isCurrentTurnLoading = isLoading && idx === messages.length - 1;
                    const cardData = msg.actionCard?.data as any;
                    return (
                      <div key={idx} className={`chat-message-row ${msg.role}`}>
                        <div
                          className={`message-avatar ${msg.role === 'user' ? 'user-avatar' : 'model-avatar'}`}
                        >
                          {msg.role === 'user' ? getUserInitial() : 'AI'}
                        </div>
                        <div
                          className={`message-bubble ${msg.role === 'model' && !msg.content ? 'thinking-bubble' : ''} ${isCurrentTurnLoading && msg.role === 'model' ? 'is-streaming' : ''} ${msg.status === 'ERROR' ? 'status-error' : ''}`}
                        >
                          {msg.role === 'model' && !msg.content ? (
                            isCurrentTurnLoading ? (
                              <div className="typing-dots">
                                <span className="dot"></span>
                                <span className="dot"></span>
                                <span className="dot"></span>
                              </div>
                            ) : (
                              <p style={{ color: '#ef4444', margin: 0 }}>
                                ⚠️ Không nhận được phản hồi từ máy chủ.
                              </p>
                            )
                          ) : (
                            <>
                              {renderFormattedText(msg.content)}
                              {isCurrentTurnLoading && <span className="streaming-cursor" />}
                            </>
                          )}

                          {/* Interactive Action Card if present */}
                          {msg.actionCard && (
                            <div className={`chat-action-card ${msg.actionCard.actionType}`}>
                              <div className="action-card-top-bar">
                                <div className="action-card-badge">
                                  <span>
                                    {msg.actionCard.actionType === 'TRANSACTION_CREATED' &&
                                      '💸 Ghi chép thành công'}
                                    {msg.actionCard.actionType === 'TRANSACTION_PROPOSED' &&
                                      '📝 Đề xuất ghi chép'}
                                    {msg.actionCard.actionType === 'PENDING_CONFIRMATION' &&
                                      '⏳ Chờ xác nhận'}
                                    {msg.actionCard.actionType === 'CATEGORY_CREATED' &&
                                      '🏷️ Danh mục mới'}
                                    {msg.actionCard.actionType === 'WALLET_TRANSFER' &&
                                      '🔄 Chuyển tiền ví'}
                                    {msg.actionCard.actionType === 'DEBT_CREATED' &&
                                      '🤝 Ghi nhận vay/nợ'}
                                    {msg.actionCard.actionType === 'DEBT_REPAID' && '💵 Trả/Thu nợ'}
                                    {msg.actionCard.actionType === 'BUDGET_SET' &&
                                      '🎯 Thiết lập ngân sách'}
                                    {msg.actionCard.actionType === 'BUDGET_ALERT' &&
                                      '⚠️ Cảnh báo ngân sách'}
                                    {msg.actionCard.actionType === 'KNOWLEDGE_SOURCE' &&
                                      '📖 Tri thức tài chính'}
                                    {msg.actionCard.actionType === 'FINANCIAL_SUMMARY' &&
                                      '📊 Tổng quan tài chính'}
                                    {![
                                      'TRANSACTION_CREATED',
                                      'TRANSACTION_PROPOSED',
                                      'PENDING_CONFIRMATION',
                                      'CATEGORY_CREATED',
                                      'WALLET_TRANSFER',
                                      'DEBT_CREATED',
                                      'DEBT_REPAID',
                                      'BUDGET_SET',
                                      'BUDGET_ALERT',
                                      'KNOWLEDGE_SOURCE',
                                      'FINANCIAL_SUMMARY',
                                    ].includes(msg.actionCard.actionType) && '⚡ Hành động AI'}
                                  </span>
                                </div>
                                <span className="action-card-timestamp">
                                  {moment(msg.createdAt).format('HH:mm')}
                                </span>
                              </div>

                              <div className="action-card-title">{msg.actionCard.title}</div>
                              {msg.actionCard.description && (
                                <div className="action-card-desc">{msg.actionCard.description}</div>
                              )}

                              {/* Transaction Details Meta Grid */}
                              {cardData &&
                                (cardData.amount !== undefined ||
                                  cardData.categoryName ||
                                  cardData.walletName) && (
                                  <div className="action-card-meta-grid">
                                    {cardData.amount !== undefined && (
                                      <div className="action-meta-item amount">
                                        <span className="meta-label">Số tiền:</span>
                                        <span
                                          className={`meta-value ${cardData.type === 'INCOME' ? 'income' : 'expense'}`}
                                        >
                                          {cardData.type === 'INCOME' ? '+' : '-'}
                                          {new Intl.NumberFormat('vi-VN').format(
                                            Math.abs(Number(cardData.amount))
                                          )}{' '}
                                          ₫
                                        </span>
                                      </div>
                                    )}
                                    {cardData.categoryName && (
                                      <div className="action-meta-item">
                                        <span className="meta-label">Danh mục:</span>
                                        <span className="meta-value tag">
                                          {cardData.categoryName}
                                        </span>
                                      </div>
                                    )}
                                    {cardData.walletName && (
                                      <div className="action-meta-item">
                                        <span className="meta-label">Ví / TK:</span>
                                        <span className="meta-value tag">
                                          {cardData.walletName}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}

                              {/* Interactive Action Controls */}
                              {actionFeedback[idx] ? (
                                <div className="action-card-feedback-banner">
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                  <span>{actionFeedback[idx]}</span>
                                </div>
                              ) : (
                                <div className="action-card-buttons-row">
                                  {(msg.actionCard.actionType === 'TRANSACTION_PROPOSED' ||
                                    msg.actionCard.actionType === 'PENDING_CONFIRMATION') && (
                                    <>
                                      <button
                                        className="action-card-btn action-confirm-btn"
                                        onClick={() => handleConfirmTransaction(cardData, idx)}
                                      >
                                        <svg
                                          width="13"
                                          height="13"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        Xác nhận ghi chép
                                      </button>
                                      <button
                                        className="action-card-btn action-cancel-btn"
                                        onClick={() => handleCancelAction(idx)}
                                      >
                                        Hủy
                                      </button>
                                    </>
                                  )}

                                  {msg.actionCard.actionType === 'TRANSACTION_CREATED' && (
                                    <button
                                      className="action-card-btn action-undo-btn"
                                      onClick={() => handleUndoTransaction(cardData, idx)}
                                      title="Hoàn tác và xóa giao dịch vừa tạo"
                                    >
                                      <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <path d="M3 7v6h6" />
                                        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                                      </svg>
                                      Hoàn tác / Hủy
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Retry button for error state */}
                          {msg.role === 'model' && msg.status === 'ERROR' && !isLoading && (
                            <div>
                              <button className="chat-retry-btn" onClick={() => handleRetry(idx)}>
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                                </svg>
                                Thử lại
                              </button>
                            </div>
                          )}

                          {/* Only display timestamp when message has content / finished loading */}
                          {!(msg.role === 'model' && !msg.content) && msg.createdAt && (
                            <span className="message-time">
                              {moment(msg.createdAt).format('HH:mm')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Active Tool Execution Indicator */}
                {activeToolTitle && (
                  <div className="tool-status-badge">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ animation: 'spin 1.5s linear infinite' }}
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    <span>{activeToolTitle}</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Horizontal Quick Chips Bar (Above Input) */}
              {messages.length > 0 && (
                <div className="chat-quick-chips-bar" aria-label="Gợi ý nhanh">
                  {CORE_QUICK_CHIPS.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="chat-quick-chip-item"
                      onClick={() => handleSendMessage(chip.text)}
                      title={`Gửi: "${chip.text}"`}
                    >
                      <span className="chip-icon">{chip.icon}</span>
                      <span className="chip-text">{chip.text}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Input Footer */}
              <div className="chat-input-container">
                {voiceSupported && (
                  <button
                    type="button"
                    className={`chat-voice-btn ${isListening ? 'listening' : ''}`}
                    onClick={toggleVoiceInput}
                    title={
                      isListening
                        ? 'Đang lắng nghe... Nhấn để dừng'
                        : 'Nhập bằng giọng nói (Tiếng Việt)'
                    }
                    aria-label="Voice input"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                    </svg>
                  </button>
                )}
                <textarea
                  ref={textareaRef}
                  className="chat-input-textarea"
                  placeholder={
                    isListening
                      ? '🎙️ Đang nghe giọng nói của bạn...'
                      : 'Nhập yêu cầu (ví dụ: Chi 45k cafe, Số dư các ví, Ngân sách...)'
                  }
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    // Auto-resize height
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={handleKeyDown}
                  rows={1}
                />
                <button
                  className="chat-send-btn"
                  onClick={() => handleSendMessage()}
                  disabled={!input.trim() || isLoading}
                  aria-label="Send message"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Blur overlay backdrop over main chat when history sidebar or tools drawer is open */}
            {(showSessionsList || showToolsDrawer) && (
              <div
                className="chat-sessions-overlay-backdrop"
                onClick={() => {
                  setShowSessionsList(false);
                  setShowToolsDrawer(false);
                }}
                title="Nhấn để đóng bảng điều khiển"
              />
            )}

            {/* Tools Catalog Drawer */}
            {showToolsDrawer && (
              <div className="chat-sessions-sidebar chat-tools-catalog-drawer">
                <div className="sessions-sidebar-header">
                  <div className="sessions-sidebar-title">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                    </svg>
                    <span>Công cụ AI ({AI_TOOLS_CATALOG.length})</span>
                  </div>
                  <button
                    className="sessions-close-btn"
                    onClick={() => setShowToolsDrawer(false)}
                    title="Đóng danh sách công cụ"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Categories Filter Tabs */}
                <div className="tools-categories-filter">
                  {[ALL_CATEGORY, ...AI_TOOL_CATEGORIES.map((c) => c.id)].map((cat) => (
                    <button
                      key={cat}
                      className={`tool-category-tab ${selectedCategory === cat ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat)}
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
                          onClick={() => {
                            setShowToolsDrawer(false);
                            handleSendMessage(tool.promptExample);
                          }}
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
            )}

            {/* Right Sidebar for Chat Sessions */}
            {showSessionsList && (
              <div className="chat-sessions-sidebar">
                <div className="sessions-sidebar-header">
                  <div className="sessions-sidebar-title">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                    <span>Lịch sử chat</span>
                  </div>
                  <button
                    className="sessions-close-btn"
                    onClick={() => setShowSessionsList(false)}
                    title="Đóng danh sách lịch sử"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <div className="sessions-sidebar-actions">
                  <button className="sessions-new-btn" onClick={handleNewChat}>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Đoạn chat mới</span>
                  </button>
                  {sessions.length > 0 && (
                    <button
                      className="sessions-clear-btn"
                      onClick={handleClearAll}
                      title="Xóa tất cả lịch sử"
                    >
                      Xóa tất cả
                    </button>
                  )}
                </div>

                {sessions.length === 0 ? (
                  <div className="sessions-empty">
                    <p>Chưa có lịch sử trò chuyện.</p>
                  </div>
                ) : (
                  <div className="sessions-list-items">
                    {sessions.map((sess) => {
                      const isSelected = sess.id === currentSessionId;
                      return (
                        <div
                          key={sess.id}
                          className={`session-item-row ${isSelected ? 'selected' : ''}`}
                          onClick={() => loadSessionMessages(sess.id)}
                        >
                          <div className="session-item-title">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke={isSelected ? '#a5b4fc' : '#94a3b8'}
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            <span title={sess.title}>{sess.title}</span>
                          </div>
                          <div className="session-item-actions">
                            <button
                              className="session-delete-btn"
                              onClick={(e) => handleDeleteSession(e, sess.id)}
                              title="Xóa đoạn chat này"
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>,
    document.body
  );
};
