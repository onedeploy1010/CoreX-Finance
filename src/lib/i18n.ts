// Lightweight i18n system using localStorage key "corex_lang"

export type Lang = "zh" | "en" | "ja" | "ko" | "vi";

export function getLang(): Lang {
  try {
    return (localStorage.getItem("corex_lang") as Lang) || "zh";
  } catch {
    return "zh";
  }
}

const translations: Record<string, Record<Lang, string>> = {
  // --- Reward types ---
  "reward.daily": {
    zh: "产品收益", en: "Daily Earnings", ja: "日次収益", ko: "일일 수익", vi: "Thu nhập hàng ngày",
  },
  "reward.direct_referral": {
    zh: "直推奖励", en: "Direct Referral", ja: "直接紹介報酬", ko: "직접 추천 보상", vi: "Giới thiệu trực tiếp",
  },
  "reward.indirect_referral": {
    zh: "间推奖励", en: "Indirect Referral", ja: "間接紹介報酬", ko: "간접 추천 보상", vi: "Giới thiệu gián tiếp",
  },
  "reward.team_bonus": {
    zh: "团队分红", en: "Team Bonus", ja: "チームボーナス", ko: "팀 보너스", vi: "Thưởng đội nhóm",
  },
  "reward.equal_level_bonus": {
    zh: "平级奖励", en: "Equal-Level Bonus", ja: "同レベルボーナス", ko: "동급 보너스", vi: "Thưởng ngang cấp",
  },

  // --- Reward detail labels ---
  "reward.from_account": {
    zh: "来源账户", en: "From Account", ja: "ソースアカウント", ko: "출처 계정", vi: "Tài khoản nguồn",
  },
  "reward.product": {
    zh: "来源配套", en: "Product", ja: "商品", ko: "상품", vi: "Sản phẩm",
  },
  "reward.type": {
    zh: "奖励类型", en: "Reward Type", ja: "報酬タイプ", ko: "보상 유형", vi: "Loại thưởng",
  },
  "reward.amount": {
    zh: "奖励金额", en: "Amount", ja: "報酬額", ko: "보상 금액", vi: "Số tiền thưởng",
  },
  "reward.order_amount": {
    zh: "配套金额", en: "Order Amount", ja: "注文額", ko: "주문 금액", vi: "Số tiền đơn hàng",
  },
  "reward.time": {
    zh: "时间", en: "Time", ja: "時間", ko: "시간", vi: "Thời gian",
  },
  "reward.self": {
    zh: "自身订单", en: "My Order", ja: "自分の注文", ko: "내 주문", vi: "Đơn hàng của tôi",
  },
  "reward.detail_title": {
    zh: "奖励明细", en: "Reward Details", ja: "報酬明細", ko: "보상 내역", vi: "Chi tiết thưởng",
  },
  "reward.no_records": {
    zh: "暂无奖励记录", en: "No reward records", ja: "報酬記録なし", ko: "보상 기록 없음", vi: "Không có bản ghi thưởng",
  },

  // --- Orders page ---
  "orders.title": {
    zh: "我的订单", en: "My Orders", ja: "マイオーダー", ko: "내 주문", vi: "Đơn hàng của tôi",
  },
  "orders.available": {
    zh: "可提现", en: "Available", ja: "引出可能", ko: "출금 가능", vi: "Có thể rút",
  },
  "orders.daily_earnings": {
    zh: "累计日收益", en: "Total Daily", ja: "累計日次収益", ko: "누적 일일 수익", vi: "Tổng thu nhập ngày",
  },
  "orders.withdrawn": {
    zh: "已提现", en: "Withdrawn", ja: "引出済み", ko: "출금 완료", vi: "Đã rút",
  },
  "orders.withdraw_now": {
    zh: "立即提现", en: "Withdraw Now", ja: "今すぐ引出", ko: "지금 출금", vi: "Rút ngay",
  },
  "orders.tab_orders": {
    zh: "我的订单", en: "My Orders", ja: "マイオーダー", ko: "내 주문", vi: "Đơn hàng",
  },
  "orders.tab_rewards": {
    zh: "奖励明细", en: "Rewards", ja: "報酬明細", ko: "보상 내역", vi: "Chi tiết thưởng",
  },
  "orders.tab_withdrawals": {
    zh: "提现记录", en: "Withdrawals", ja: "引出履歴", ko: "출금 내역", vi: "Lịch sử rút",
  },
  "orders.staking": {
    zh: "质押中", en: "Staking", ja: "ステーキング中", ko: "스테이킹 중", vi: "Đang stake",
  },
  "orders.expired": {
    zh: "已到期", en: "Expired", ja: "期限切れ", ko: "만료됨", vi: "Đã hết hạn",
  },
  "orders.principal": {
    zh: "投资本金", en: "Principal", ja: "元本", ko: "투자 원금", vi: "Vốn đầu tư",
  },
  "orders.daily_interest": {
    zh: "每日利息", en: "Daily Interest", ja: "日次利息", ko: "일일 이자", vi: "Lãi hàng ngày",
  },
  "orders.total_earned": {
    zh: "累计收益", en: "Total Earned", ja: "累計収益", ko: "누적 수익", vi: "Tổng thu nhập",
  },
  "orders.days_left": {
    zh: "剩余天数", en: "Days Left", ja: "残り日数", ko: "남은 일수", vi: "Số ngày còn lại",
  },
  "orders.status": {
    zh: "状态", en: "Status", ja: "ステータス", ko: "상태", vi: "Trạng thái",
  },
  "orders.principal_returned": {
    zh: "本金已返还", en: "Principal Returned", ja: "元本返還済", ko: "원금 반환됨", vi: "Đã hoàn vốn",
  },
  "orders.daily_rate": {
    zh: "日利率", en: "Daily Rate", ja: "日次利率", ko: "일일 이율", vi: "Lãi suất ngày",
  },
  "orders.total_days": {
    zh: "总天数", en: "Total Days", ja: "総日数", ko: "총 일수", vi: "Tổng số ngày",
  },
  "orders.est_total": {
    zh: "预计总收益", en: "Est. Total", ja: "予想総収益", ko: "예상 총 수익", vi: "Ước tính tổng",
  },
  "orders.start": {
    zh: "开始", en: "Start", ja: "開始", ko: "시작", vi: "Bắt đầu",
  },
  "orders.end": {
    zh: "到期", en: "End", ja: "終了", ko: "만료", vi: "Kết thúc",
  },
  "orders.no_redeem": {
    zh: "不可提前赎回 · 到期自动返还本金", en: "No early redemption · Principal auto-returned at maturity",
    ja: "早期償還不可 · 満期時に元本自動返還", ko: "조기 상환 불가 · 만기 시 원금 자동 반환",
    vi: "Không rút sớm · Tự động hoàn vốn khi đáo hạn",
  },
  "orders.no_orders": {
    zh: "暂无订单", en: "No orders yet", ja: "注文なし", ko: "주문 없음", vi: "Chưa có đơn hàng",
  },
  "orders.no_withdrawals": {
    zh: "暂无提现记录", en: "No withdrawal records", ja: "引出履歴なし", ko: "출금 내역 없음", vi: "Chưa có lịch sử rút",
  },
  "orders.connect_wallet": {
    zh: "请先连接钱包查看订单", en: "Connect wallet to view orders", ja: "ウォレットを接続して注文を表示",
    ko: "지갑을 연결하여 주문 확인", vi: "Kết nối ví để xem đơn hàng",
  },

  // --- Withdrawal ---
  "withdraw.title": {
    zh: "提现", en: "Withdraw", ja: "引出", ko: "출금", vi: "Rút tiền",
  },
  "withdraw.desc": {
    zh: "日利润可随时提现 · 本金到期自动返还", en: "Withdraw daily profits anytime · Principal auto-returned at maturity",
    ja: "日次利益はいつでも引出可能 · 元本は満期時に自動返還", ko: "일일 수익 수시 출금 · 원금 만기 시 자동 반환",
    vi: "Rút lợi nhuận hàng ngày · Vốn tự động hoàn khi đáo hạn",
  },
  "withdraw.balance": {
    zh: "可提现余额", en: "Available Balance", ja: "引出可能残高", ko: "출금 가능 잔액", vi: "Số dư có thể rút",
  },
  "withdraw.amount": {
    zh: "提现金额 (USDT)", en: "Withdraw Amount (USDT)", ja: "引出額 (USDT)", ko: "출금 금액 (USDT)", vi: "Số tiền rút (USDT)",
  },
  "withdraw.fee": {
    zh: "手续费", en: "Fee", ja: "手数料", ko: "수수료", vi: "Phí",
  },
  "withdraw.actual": {
    zh: "实际到账", en: "Actual Amount", ja: "実際入金額", ko: "실제 입금액", vi: "Thực nhận",
  },
  "withdraw.min": {
    zh: "最低提现金额", en: "Minimum withdrawal", ja: "最低引出額", ko: "최소 출금액", vi: "Số tiền rút tối thiểu",
  },
  "withdraw.fee_per": {
    zh: "手续费: 每笔", en: "Fee: per transaction", ja: "手数料: 毎回", ko: "수수료: 건당", vi: "Phí: mỗi giao dịch",
  },
  "withdraw.only_profit": {
    zh: "仅可提取日利润及奖励，本金到期自动返还", en: "Only daily profit & rewards withdrawable, principal auto-returned",
    ja: "日次利益と報酬のみ引出可能、元本は自動返還", ko: "일일 수익 및 보상만 출금 가능, 원금 자동 반환",
    vi: "Chỉ rút lợi nhuận và thưởng, vốn tự động hoàn",
  },
  "withdraw.confirm": {
    zh: "确认提现", en: "Confirm Withdraw", ja: "引出確認", ko: "출금 확인", vi: "Xác nhận rút",
  },
  "withdraw.processing": {
    zh: "处理中...", en: "Processing...", ja: "処理中...", ko: "처리 중...", vi: "Đang xử lý...",
  },
  "withdraw.pending": {
    zh: "处理中", en: "Pending", ja: "処理中", ko: "처리 중", vi: "Đang chờ",
  },
  "withdraw.completed": {
    zh: "已完成", en: "Completed", ja: "完了", ko: "완료", vi: "Hoàn thành",
  },
  "withdraw.rejected": {
    zh: "已拒绝", en: "Rejected", ja: "拒否", ko: "거절됨", vi: "Bị từ chối",
  },
  "withdraw.amount_label": {
    zh: "提现金额", en: "Amount", ja: "引出額", ko: "출금액", vi: "Số tiền rút",
  },
  "withdraw.all": {
    zh: "全部", en: "All", ja: "全額", ko: "전액", vi: "Tất cả",
  },

  // --- Common ---
  "common.days": {
    zh: "天", en: "days", ja: "日", ko: "일", vi: "ngày",
  },
  "common.loading": {
    zh: "加载中...", en: "Loading...", ja: "読み込み中...", ko: "로딩 중...", vi: "Đang tải...",
  },
};

export function t(key: string, lang?: Lang): string {
  const l = lang || getLang();
  return translations[key]?.[l] || translations[key]?.["zh"] || key;
}

export function shortAddr(addr: string): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
