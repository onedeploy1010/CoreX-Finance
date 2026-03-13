// Lightweight i18n system using localStorage key "corex_lang"

export type Lang = "zh" | "zh-TW" | "en" | "ko" | "ja" | "vi" | "th" | "id" | "ms" | "fr" | "ar";

export function getLang(): Lang {
  try {
    return (localStorage.getItem("corex_lang") as Lang) || "zh";
  } catch {
    return "zh";
  }
}

const translations: Record<string, Partial<Record<Lang, string>>> = {
  // --- Reward types ---
  "reward.daily": {
    zh: "产品收益", "zh-TW": "產品收益", en: "Daily Earnings", ja: "日次収益", ko: "일일 수익", vi: "Thu nhập hàng ngày",
    th: "รายได้รายวัน", id: "Pendapatan Harian", ms: "Pendapatan Harian", fr: "Revenus quotidiens", ar: "الأرباح اليومية",
  },
  "reward.direct_referral": {
    zh: "直推奖励", "zh-TW": "直推獎勵", en: "Direct Referral", ja: "直接紹介報酬", ko: "직접 추천 보상", vi: "Giới thiệu trực tiếp",
    th: "โบนัสแนะนำตรง", id: "Bonus Referral Langsung", ms: "Bonus Rujukan Langsung", fr: "Parrainage direct", ar: "إحالة مباشرة",
  },
  "reward.indirect_referral": {
    zh: "间推奖励", "zh-TW": "間推獎勵", en: "Indirect Referral", ja: "間接紹介報酬", ko: "간접 추천 보상", vi: "Giới thiệu gián tiếp",
    th: "โบนัสแนะนำทางอ้อม", id: "Bonus Referral Tidak Langsung", ms: "Bonus Rujukan Tidak Langsung", fr: "Parrainage indirect", ar: "إحالة غير مباشرة",
  },
  "reward.team_bonus": {
    zh: "团队分红", "zh-TW": "團隊分紅", en: "Team Bonus", ja: "チームボーナス", ko: "팀 보너스", vi: "Thưởng đội nhóm",
    th: "โบนัสทีม", id: "Bonus Tim", ms: "Bonus Pasukan", fr: "Bonus d'équipe", ar: "مكافأة الفريق",
  },
  "reward.equal_level_bonus": {
    zh: "平级奖励", "zh-TW": "平級獎勵", en: "Equal-Level Bonus", ja: "同レベルボーナス", ko: "동급 보너스", vi: "Thưởng ngang cấp",
    th: "โบนัสระดับเท่า", id: "Bonus Level Setara", ms: "Bonus Tahap Sama", fr: "Bonus de niveau égal", ar: "مكافأة المستوى المتساوي",
  },

  // --- Reward detail labels ---
  "reward.from_account": {
    zh: "来源账户", "zh-TW": "來源帳戶", en: "From Account", ja: "ソースアカウント", ko: "출처 계정", vi: "Tài khoản nguồn",
    th: "จากบัญชี", id: "Dari Akun", ms: "Dari Akaun", fr: "Compte source", ar: "من الحساب",
  },
  "reward.product": {
    zh: "来源配套", "zh-TW": "來源配套", en: "Product", ja: "商品", ko: "상품", vi: "Sản phẩm",
    th: "สินค้า", id: "Produk", ms: "Produk", fr: "Produit", ar: "المنتج",
  },
  "reward.type": {
    zh: "奖励类型", "zh-TW": "獎勵類型", en: "Reward Type", ja: "報酬タイプ", ko: "보상 유형", vi: "Loại thưởng",
    th: "ประเภทรางวัล", id: "Jenis Hadiah", ms: "Jenis Ganjaran", fr: "Type de récompense", ar: "نوع المكافأة",
  },
  "reward.amount": {
    zh: "奖励金额", "zh-TW": "獎勵金額", en: "Amount", ja: "報酬額", ko: "보상 금액", vi: "Số tiền thưởng",
    th: "จำนวนเงินรางวัล", id: "Jumlah Hadiah", ms: "Jumlah Ganjaran", fr: "Montant", ar: "المبلغ",
  },
  "reward.order_amount": {
    zh: "配套金额", "zh-TW": "配套金額", en: "Order Amount", ja: "注文額", ko: "주문 금액", vi: "Số tiền đơn hàng",
    th: "จำนวนคำสั่ง", id: "Jumlah Pesanan", ms: "Jumlah Pesanan", fr: "Montant de la commande", ar: "مبلغ الطلب",
  },
  "reward.level_normal": {
    zh: "普通", "zh-TW": "普通", en: "Normal", ja: "普通", ko: "일반", vi: "Thường",
    th: "ปกติ", id: "Normal", ms: "Biasa", fr: "Normal", ar: "عادي",
  },
  "reward.time": {
    zh: "时间", "zh-TW": "時間", en: "Time", ja: "時間", ko: "시간", vi: "Thời gian",
    th: "เวลา", id: "Waktu", ms: "Masa", fr: "Heure", ar: "الوقت",
  },
  "reward.self": {
    zh: "自身订单", "zh-TW": "自身訂單", en: "My Order", ja: "自分の注文", ko: "내 주문", vi: "Đơn hàng của tôi",
    th: "คำสั่งของฉัน", id: "Pesanan Saya", ms: "Pesanan Saya", fr: "Ma commande", ar: "طلبي",
  },
  "reward.detail_title": {
    zh: "奖励明细", "zh-TW": "獎勵明細", en: "Reward Details", ja: "報酬明細", ko: "보상 내역", vi: "Chi tiết thưởng",
    th: "รายละเอียดรางวัล", id: "Detail Hadiah", ms: "Butiran Ganjaran", fr: "Détails des récompenses", ar: "تفاصيل المكافأة",
  },
  "reward.no_records": {
    zh: "暂无奖励记录", "zh-TW": "暫無獎勵記錄", en: "No reward records", ja: "報酬記録なし", ko: "보상 기록 없음", vi: "Không có bản ghi thưởng",
    th: "ไม่มีบันทึกรางวัล", id: "Tidak ada catatan hadiah", ms: "Tiada rekod ganjaran", fr: "Aucun enregistrement", ar: "لا توجد سجلات مكافآت",
  },

  // --- Orders page ---
  "orders.title": {
    zh: "我的订单", "zh-TW": "我的訂單", en: "My Orders", ja: "マイオーダー", ko: "내 주문", vi: "Đơn hàng của tôi",
    th: "คำสั่งของฉัน", id: "Pesanan Saya", ms: "Pesanan Saya", fr: "Mes commandes", ar: "طلباتي",
  },
  "orders.available": {
    zh: "可提现", "zh-TW": "可提現", en: "Available", ja: "引出可能", ko: "출금 가능", vi: "Có thể rút",
    th: "ถอนได้", id: "Tersedia", ms: "Tersedia", fr: "Disponible", ar: "متاح",
  },
  "orders.daily_earnings": {
    zh: "累计日收益", "zh-TW": "累計日收益", en: "Total Daily", ja: "累計日次収益", ko: "누적 일일 수익", vi: "Tổng thu nhập ngày",
    th: "รายได้รายวันสะสม", id: "Total Harian", ms: "Jumlah Harian", fr: "Total quotidien", ar: "إجمالي يومي",
  },
  "orders.withdrawn": {
    zh: "已提现", "zh-TW": "已提現", en: "Withdrawn", ja: "引出済み", ko: "출금 완료", vi: "Đã rút",
    th: "ถอนแล้ว", id: "Ditarik", ms: "Dikeluarkan", fr: "Retiré", ar: "تم السحب",
  },
  "orders.withdraw_now": {
    zh: "立即提现", "zh-TW": "立即提現", en: "Withdraw Now", ja: "今すぐ引出", ko: "지금 출금", vi: "Rút ngay",
    th: "ถอนเดี๋ยวนี้", id: "Tarik Sekarang", ms: "Keluarkan Sekarang", fr: "Retirer maintenant", ar: "اسحب الآن",
  },
  "orders.tab_orders": {
    zh: "我的订单", "zh-TW": "我的訂單", en: "My Orders", ja: "マイオーダー", ko: "내 주문", vi: "Đơn hàng",
    th: "คำสั่งของฉัน", id: "Pesanan Saya", ms: "Pesanan Saya", fr: "Commandes", ar: "الطلبات",
  },
  "orders.tab_rewards": {
    zh: "奖励明细", "zh-TW": "獎勵明細", en: "Rewards", ja: "報酬明細", ko: "보상 내역", vi: "Chi tiết thưởng",
    th: "รางวัล", id: "Hadiah", ms: "Ganjaran", fr: "Récompenses", ar: "المكافآت",
  },
  "orders.tab_withdrawals": {
    zh: "提现记录", "zh-TW": "提現記錄", en: "Withdrawals", ja: "引出履歴", ko: "출금 내역", vi: "Lịch sử rút",
    th: "ประวัติการถอน", id: "Riwayat Penarikan", ms: "Sejarah Pengeluaran", fr: "Retraits", ar: "عمليات السحب",
  },
  "orders.staking": {
    zh: "质押中", "zh-TW": "質押中", en: "Staking", ja: "ステーキング中", ko: "스테이킹 중", vi: "Đang stake",
    th: "กำลัง Stake", id: "Sedang Staking", ms: "Sedang Staking", fr: "En staking", ar: "تخزين",
  },
  "orders.expired": {
    zh: "已到期", "zh-TW": "已到期", en: "Expired", ja: "期限切れ", ko: "만료됨", vi: "Đã hết hạn",
    th: "หมดอายุ", id: "Kedaluwarsa", ms: "Tamat Tempoh", fr: "Expiré", ar: "منتهي",
  },
  "orders.principal": {
    zh: "投资本金", "zh-TW": "投資本金", en: "Principal", ja: "元本", ko: "투자 원금", vi: "Vốn đầu tư",
    th: "เงินต้น", id: "Modal", ms: "Modal", fr: "Capital", ar: "رأس المال",
  },
  "orders.daily_interest": {
    zh: "每日利息", "zh-TW": "每日利息", en: "Daily Interest", ja: "日次利息", ko: "일일 이자", vi: "Lãi hàng ngày",
    th: "ดอกเบี้ยรายวัน", id: "Bunga Harian", ms: "Faedah Harian", fr: "Intérêts quotidiens", ar: "الفائدة اليومية",
  },
  "orders.total_earned": {
    zh: "累计收益", "zh-TW": "累計收益", en: "Total Earned", ja: "累計収益", ko: "누적 수익", vi: "Tổng thu nhập",
    th: "รายได้สะสม", id: "Total Pendapatan", ms: "Jumlah Pendapatan", fr: "Total gagné", ar: "إجمالي الأرباح",
  },
  "orders.days_left": {
    zh: "剩余天数", "zh-TW": "剩餘天數", en: "Days Left", ja: "残り日数", ko: "남은 일수", vi: "Số ngày còn lại",
    th: "วันที่เหลือ", id: "Hari Tersisa", ms: "Hari Berbaki", fr: "Jours restants", ar: "الأيام المتبقية",
  },
  "orders.status": {
    zh: "状态", "zh-TW": "狀態", en: "Status", ja: "ステータス", ko: "상태", vi: "Trạng thái",
    th: "สถานะ", id: "Status", ms: "Status", fr: "Statut", ar: "الحالة",
  },
  "orders.principal_returned": {
    zh: "本金已返还", "zh-TW": "本金已返還", en: "Principal Returned", ja: "元本返還済", ko: "원금 반환됨", vi: "Đã hoàn vốn",
    th: "คืนเงินต้นแล้ว", id: "Modal Dikembalikan", ms: "Modal Dipulangkan", fr: "Capital retourné", ar: "تم إرجاع رأس المال",
  },
  "orders.daily_rate": {
    zh: "日利率", "zh-TW": "日利率", en: "Daily Rate", ja: "日次利率", ko: "일일 이율", vi: "Lãi suất ngày",
    th: "อัตราดอกเบี้ยรายวัน", id: "Tarif Harian", ms: "Kadar Harian", fr: "Taux quotidien", ar: "المعدل اليومي",
  },
  "orders.total_days": {
    zh: "总天数", "zh-TW": "總天數", en: "Total Days", ja: "総日数", ko: "총 일수", vi: "Tổng số ngày",
    th: "จำนวนวันทั้งหมด", id: "Total Hari", ms: "Jumlah Hari", fr: "Total jours", ar: "إجمالي الأيام",
  },
  "orders.est_total": {
    zh: "预计总收益", "zh-TW": "預計總收益", en: "Est. Total", ja: "予想総収益", ko: "예상 총 수익", vi: "Ước tính tổng",
    th: "ประมาณการรวม", id: "Estimasi Total", ms: "Anggaran Jumlah", fr: "Total estimé", ar: "الإجمالي المقدر",
  },
  "orders.start": {
    zh: "开始", "zh-TW": "開始", en: "Start", ja: "開始", ko: "시작", vi: "Bắt đầu",
    th: "เริ่ม", id: "Mulai", ms: "Mula", fr: "Début", ar: "البداية",
  },
  "orders.end": {
    zh: "到期", "zh-TW": "到期", en: "End", ja: "終了", ko: "만료", vi: "Kết thúc",
    th: "สิ้นสุด", id: "Berakhir", ms: "Tamat", fr: "Fin", ar: "النهاية",
  },
  "orders.no_redeem": {
    zh: "不可提前赎回 · 到期自动返还本金", "zh-TW": "不可提前贖回 · 到期自動返還本金",
    en: "No early redemption · Principal auto-returned at maturity",
    ja: "早期償還不可 · 満期時に元本自動返還", ko: "조기 상환 불가 · 만기 시 원금 자동 반환",
    vi: "Không rút sớm · Tự động hoàn vốn khi đáo hạn",
    th: "ไม่สามารถไถ่ถอนก่อนกำหนด · คืนเงินต้นอัตโนมัติเมื่อครบกำหนด",
    id: "Tidak bisa ditarik lebih awal · Modal dikembalikan otomatis saat jatuh tempo",
    ms: "Tidak boleh tebus awal · Modal dipulangkan automatik apabila matang",
    fr: "Pas de rachat anticipé · Capital retourné automatiquement à l'échéance",
    ar: "لا استرداد مبكر · يتم إرجاع رأس المال تلقائياً عند الاستحقاق",
  },
  "orders.no_orders": {
    zh: "暂无订单", "zh-TW": "暫無訂單", en: "No orders yet", ja: "注文なし", ko: "주문 없음", vi: "Chưa có đơn hàng",
    th: "ยังไม่มีคำสั่ง", id: "Belum ada pesanan", ms: "Belum ada pesanan", fr: "Aucune commande", ar: "لا توجد طلبات",
  },
  "orders.no_withdrawals": {
    zh: "暂无提现记录", "zh-TW": "暫無提現記錄", en: "No withdrawal records", ja: "引出履歴なし", ko: "출금 내역 없음", vi: "Chưa có lịch sử rút",
    th: "ไม่มีบันทึกการถอน", id: "Tidak ada riwayat penarikan", ms: "Tiada sejarah pengeluaran", fr: "Aucun retrait", ar: "لا توجد سجلات سحب",
  },
  "orders.connect_wallet": {
    zh: "请先连接钱包查看订单", "zh-TW": "請先連接錢包查看訂單", en: "Connect wallet to view orders", ja: "ウォレットを接続して注文を表示",
    ko: "지갑을 연결하여 주문 확인", vi: "Kết nối ví để xem đơn hàng",
    th: "เชื่อมต่อกระเป๋าเพื่อดูคำสั่ง", id: "Hubungkan dompet untuk melihat pesanan", ms: "Sambungkan dompet untuk melihat pesanan",
    fr: "Connectez votre portefeuille", ar: "اربط محفظتك لعرض الطلبات",
  },

  // --- Withdrawal ---
  "withdraw.title": {
    zh: "提现", "zh-TW": "提現", en: "Withdraw", ja: "引出", ko: "출금", vi: "Rút tiền",
    th: "ถอนเงิน", id: "Tarik Dana", ms: "Keluarkan Dana", fr: "Retirer", ar: "سحب",
  },
  "withdraw.desc": {
    zh: "日利润可随时提现 · 本金到期自动返还", "zh-TW": "日利潤可隨時提現 · 本金到期自動返還",
    en: "Withdraw daily profits anytime · Principal auto-returned at maturity",
    ja: "日次利益はいつでも引出可能 · 元本は満期時に自動返還", ko: "일일 수익 수시 출금 · 원금 만기 시 자동 반환",
    vi: "Rút lợi nhuận hàng ngày · Vốn tự động hoàn khi đáo hạn",
    th: "ถอนกำไรรายวันได้ตลอด · คืนเงินต้นอัตโนมัติ",
    id: "Tarik keuntungan harian kapan saja · Modal dikembalikan otomatis",
    ms: "Keluarkan keuntungan harian bila-bila · Modal dipulangkan automatik",
    fr: "Retirez vos bénéfices quotidiens · Capital retourné automatiquement",
    ar: "اسحب الأرباح اليومية في أي وقت · يتم إرجاع رأس المال تلقائياً",
  },
  "withdraw.balance": {
    zh: "可提现余额", "zh-TW": "可提現餘額", en: "Available Balance", ja: "引出可能残高", ko: "출금 가능 잔액", vi: "Số dư có thể rút",
    th: "ยอดเงินที่ถอนได้", id: "Saldo Tersedia", ms: "Baki Tersedia", fr: "Solde disponible", ar: "الرصيد المتاح",
  },
  "withdraw.amount": {
    zh: "提现金额 (USDT)", "zh-TW": "提現金額 (USDT)", en: "Withdraw Amount (USDT)", ja: "引出額 (USDT)", ko: "출금 금액 (USDT)", vi: "Số tiền rút (USDT)",
    th: "จำนวนถอน (USDT)", id: "Jumlah Penarikan (USDT)", ms: "Jumlah Pengeluaran (USDT)", fr: "Montant du retrait (USDT)", ar: "مبلغ السحب (USDT)",
  },
  "withdraw.fee": {
    zh: "手续费", "zh-TW": "手續費", en: "Fee", ja: "手数料", ko: "수수료", vi: "Phí",
    th: "ค่าธรรมเนียม", id: "Biaya", ms: "Yuran", fr: "Frais", ar: "الرسوم",
  },
  "withdraw.actual": {
    zh: "实际到账", "zh-TW": "實際到帳", en: "Actual Amount", ja: "実際入金額", ko: "실제 입금액", vi: "Thực nhận",
    th: "จำนวนจริงที่ได้รับ", id: "Jumlah Aktual", ms: "Jumlah Sebenar", fr: "Montant réel", ar: "المبلغ الفعلي",
  },
  "withdraw.min": {
    zh: "最低提现金额", "zh-TW": "最低提現金額", en: "Minimum withdrawal", ja: "最低引出額", ko: "최소 출금액", vi: "Số tiền rút tối thiểu",
    th: "จำนวนถอนขั้นต่ำ", id: "Penarikan minimum", ms: "Pengeluaran minimum", fr: "Retrait minimum", ar: "الحد الأدنى للسحب",
  },
  "withdraw.fee_per": {
    zh: "手续费: 每笔", "zh-TW": "手續費: 每筆", en: "Fee: per transaction", ja: "手数料: 毎回", ko: "수수료: 건당", vi: "Phí: mỗi giao dịch",
    th: "ค่าธรรมเนียม: ต่อรายการ", id: "Biaya: per transaksi", ms: "Yuran: setiap transaksi", fr: "Frais: par transaction", ar: "الرسوم: لكل معاملة",
  },
  "withdraw.only_profit": {
    zh: "仅可提取日利润及奖励，本金到期自动返还", "zh-TW": "僅可提取日利潤及獎勵，本金到期自動返還",
    en: "Only daily profit & rewards withdrawable, principal auto-returned",
    ja: "日次利益と報酬のみ引出可能、元本は自動返還", ko: "일일 수익 및 보상만 출금 가능, 원금 자동 반환",
    vi: "Chỉ rút lợi nhuận và thưởng, vốn tự động hoàn",
    th: "ถอนได้เฉพาะกำไรรายวันและรางวัล เงินต้นคืนอัตโนมัติ",
    id: "Hanya keuntungan harian & hadiah yang bisa ditarik, modal dikembalikan otomatis",
    ms: "Hanya keuntungan harian & ganjaran boleh dikeluarkan, modal dipulangkan automatik",
    fr: "Seuls les bénéfices quotidiens et récompenses sont retirables",
    ar: "يمكن سحب الأرباح اليومية والمكافآت فقط، يتم إرجاع رأس المال تلقائياً",
  },
  "withdraw.confirm": {
    zh: "确认提现", "zh-TW": "確認提現", en: "Confirm Withdraw", ja: "引出確認", ko: "출금 확인", vi: "Xác nhận rút",
    th: "ยืนยันการถอน", id: "Konfirmasi Penarikan", ms: "Sahkan Pengeluaran", fr: "Confirmer le retrait", ar: "تأكيد السحب",
  },
  "withdraw.processing": {
    zh: "处理中...", "zh-TW": "處理中...", en: "Processing...", ja: "処理中...", ko: "처리 중...", vi: "Đang xử lý...",
    th: "กำลังดำเนินการ...", id: "Memproses...", ms: "Memproses...", fr: "Traitement...", ar: "جاري المعالجة...",
  },
  "withdraw.pending": {
    zh: "处理中", "zh-TW": "處理中", en: "Pending", ja: "処理中", ko: "처리 중", vi: "Đang chờ",
    th: "รอดำเนินการ", id: "Menunggu", ms: "Menunggu", fr: "En attente", ar: "قيد الانتظار",
  },
  "withdraw.completed": {
    zh: "已完成", "zh-TW": "已完成", en: "Completed", ja: "完了", ko: "완료", vi: "Hoàn thành",
    th: "เสร็จสิ้น", id: "Selesai", ms: "Selesai", fr: "Terminé", ar: "مكتمل",
  },
  "withdraw.rejected": {
    zh: "已拒绝", "zh-TW": "已拒絕", en: "Rejected", ja: "拒否", ko: "거절됨", vi: "Bị từ chối",
    th: "ถูกปฏิเสธ", id: "Ditolak", ms: "Ditolak", fr: "Rejeté", ar: "مرفوض",
  },
  "withdraw.amount_label": {
    zh: "提现金额", "zh-TW": "提現金額", en: "Amount", ja: "引出額", ko: "출금액", vi: "Số tiền rút",
    th: "จำนวนถอน", id: "Jumlah", ms: "Jumlah", fr: "Montant", ar: "المبلغ",
  },
  "withdraw.all": {
    zh: "全部", "zh-TW": "全部", en: "All", ja: "全額", ko: "전액", vi: "Tất cả",
    th: "ทั้งหมด", id: "Semua", ms: "Semua", fr: "Tout", ar: "الكل",
  },

  // --- Invest toast ---
  "invest.success": {
    zh: "投资成功", "zh-TW": "投資成功", en: "Investment Successful", ja: "投資成功", ko: "투자 성공", vi: "Đầu tư thành công",
    th: "ลงทุนสำเร็จ", id: "Investasi Berhasil", ms: "Pelaburan Berjaya", fr: "Investissement réussi", ar: "استثمار ناجح",
  },
  "invest.success_desc": {
    zh: "已投资 {amount} USDT 到 {product}", "zh-TW": "已投資 {amount} USDT 到 {product}",
    en: "{amount} USDT invested in {product}", ja: "{amount} USDT を {product} に投資しました",
    ko: "{amount} USDT를 {product}에 투자했습니다", vi: "Đã đầu tư {amount} USDT vào {product}",
    th: "ลงทุน {amount} USDT ใน {product}", id: "{amount} USDT diinvestasikan di {product}",
    ms: "{amount} USDT dilaburkan dalam {product}", fr: "{amount} USDT investis dans {product}",
    ar: "تم استثمار {amount} USDT في {product}",
  },
  "invest.connect_wallet": {
    zh: "请先连接钱包", "zh-TW": "請先連接錢包", en: "Please connect wallet first", ja: "先にウォレットを接続してください",
    ko: "먼저 지갑을 연결하세요", vi: "Vui lòng kết nối ví trước",
    th: "กรุณาเชื่อมต่อกระเป๋าก่อน", id: "Silakan hubungkan dompet terlebih dahulu", ms: "Sila sambungkan dompet dahulu",
    fr: "Veuillez connecter votre portefeuille", ar: "يرجى ربط المحفظة أولاً",
  },
  "invest.min_amount": {
    zh: "最低投入 {amount} USDT", "zh-TW": "最低投入 {amount} USDT", en: "Minimum investment {amount} USDT",
    ja: "最低投資額 {amount} USDT", ko: "최소 투자 {amount} USDT", vi: "Đầu tư tối thiểu {amount} USDT",
    th: "ลงทุนขั้นต่ำ {amount} USDT", id: "Investasi minimum {amount} USDT", ms: "Pelaburan minimum {amount} USDT",
    fr: "Investissement minimum {amount} USDT", ar: "الحد الأدنى للاستثمار {amount} USDT",
  },
  "invest.multiple_amount": {
    zh: "投资金额必须是 {amount} USDT 的倍数", "zh-TW": "投資金額必須是 {amount} USDT 的倍數",
    en: "Amount must be a multiple of {amount} USDT", ja: "投資額は {amount} USDT の倍数でなければなりません",
    ko: "금액은 {amount} USDT의 배수여야 합니다", vi: "Số tiền phải là bội số của {amount} USDT",
    th: "จำนวนต้องเป็นทวีคูณของ {amount} USDT", id: "Jumlah harus kelipatan {amount} USDT",
    ms: "Jumlah mesti gandaan {amount} USDT", fr: "Le montant doit être un multiple de {amount} USDT",
    ar: "يجب أن يكون المبلغ مضاعفاً لـ {amount} USDT",
  },
  "invest.cancelled": {
    zh: "交易已取消", "zh-TW": "交易已取消", en: "Transaction Cancelled", ja: "取引キャンセル", ko: "거래 취소됨", vi: "Giao dịch đã hủy",
    th: "ยกเลิกธุรกรรม", id: "Transaksi Dibatalkan", ms: "Transaksi Dibatalkan", fr: "Transaction annulée", ar: "تم إلغاء المعاملة",
  },
  "invest.failed": {
    zh: "投资失败", "zh-TW": "投資失敗", en: "Investment Failed", ja: "投資失敗", ko: "투자 실패", vi: "Đầu tư thất bại",
    th: "ลงทุนล้มเหลว", id: "Investasi Gagal", ms: "Pelaburan Gagal", fr: "Échec de l'investissement", ar: "فشل الاستثمار",
  },
  "invest.need_referral": {
    zh: "需要邀请链接", "zh-TW": "需要邀請鏈接", en: "Referral link required", ja: "招待リンクが必要です", ko: "추천 링크 필요", vi: "Cần liên kết giới thiệu",
    th: "ต้องการลิงค์แนะนำ", id: "Diperlukan link referral", ms: "Pautan rujukan diperlukan", fr: "Lien de parrainage requis", ar: "رابط الإحالة مطلوب",
  },
  "invest.need_referral_desc": {
    zh: "请通过邀请链接注册后投资", "zh-TW": "請通過邀請鏈接註冊後投資", en: "Please register via referral link to invest",
    ja: "招待リンクから登録して投資してください", ko: "추천 링크로 등록 후 투자하세요", vi: "Vui lòng đăng ký qua liên kết giới thiệu để đầu tư",
    th: "กรุณาลงทะเบียนผ่านลิงค์แนะนำเพื่อลงทุน", id: "Silakan daftar melalui link referral untuk berinvestasi",
    ms: "Sila daftar melalui pautan rujukan untuk melabur", fr: "Veuillez vous inscrire via un lien de parrainage",
    ar: "يرجى التسجيل عبر رابط الإحالة للاستثمار",
  },
  "invest.approving": {
    zh: "授权USDT中...", "zh-TW": "授權USDT中...", en: "Approving USDT...", ja: "USDT承認中...", ko: "USDT 승인 중...", vi: "Đang phê duyệt USDT...",
    th: "กำลังอนุมัติ USDT...", id: "Menyetujui USDT...", ms: "Meluluskan USDT...", fr: "Approbation USDT...", ar: "جاري الموافقة على USDT...",
  },
  "invest.confirming_tx": {
    zh: "确认交易中...", "zh-TW": "確認交易中...", en: "Confirming Transaction...", ja: "取引確認中...", ko: "거래 확인 중...", vi: "Đang xác nhận giao dịch...",
    th: "กำลังยืนยันธุรกรรม...", id: "Mengkonfirmasi Transaksi...", ms: "Mengesahkan Transaksi...", fr: "Confirmation de la transaction...", ar: "جاري تأكيد المعاملة...",
  },
  "invest.creating_order": {
    zh: "创建订单中...", "zh-TW": "創建訂單中...", en: "Creating Order...", ja: "注文作成中...", ko: "주문 생성 중...", vi: "Đang tạo đơn hàng...",
    th: "กำลังสร้างคำสั่ง...", id: "Membuat Pesanan...", ms: "Membuat Pesanan...", fr: "Création de la commande...", ar: "جاري إنشاء الطلب...",
  },
  "invest.processing": {
    zh: "处理中...", "zh-TW": "處理中...", en: "Processing...", ja: "処理中...", ko: "처리 중...", vi: "Đang xử lý...",
    th: "กำลังดำเนินการ...", id: "Memproses...", ms: "Memproses...", fr: "Traitement...", ar: "جاري المعالجة...",
  },
  "invest.confirm": {
    zh: "确认投资", "zh-TW": "確認投資", en: "Confirm Investment", ja: "投資確認", ko: "투자 확인", vi: "Xác nhận đầu tư",
    th: "ยืนยันการลงทุน", id: "Konfirmasi Investasi", ms: "Sahkan Pelaburan", fr: "Confirmer l'investissement", ar: "تأكيد الاستثمار",
  },
  "invest.tx_failed": {
    zh: "交易失败", "zh-TW": "交易失敗", en: "Transaction Failed", ja: "取引失敗", ko: "거래 실패", vi: "Giao dịch thất bại",
    th: "ธุรกรรมล้มเหลว", id: "Transaksi Gagal", ms: "Transaksi Gagal", fr: "Échec de la transaction", ar: "فشلت المعاملة",
  },

  // --- Register ---
  "register.success": {
    zh: "注册成功", "zh-TW": "註冊成功", en: "Registration Successful", ja: "登録成功", ko: "등록 성공", vi: "Đăng ký thành công",
    th: "ลงทะเบียนสำเร็จ", id: "Pendaftaran Berhasil", ms: "Pendaftaran Berjaya", fr: "Inscription réussie", ar: "تم التسجيل بنجاح",
  },
  "register.success_desc": {
    zh: "已绑定推荐关系", "zh-TW": "已綁定推薦關係", en: "Referral relationship bound", ja: "紹介関係がバインドされました",
    ko: "추천 관계 연결됨", vi: "Đã liên kết quan hệ giới thiệu",
    th: "ผูกความสัมพันธ์แนะนำแล้ว", id: "Hubungan referral terikat", ms: "Hubungan rujukan diikat",
    fr: "Relation de parrainage liée", ar: "تم ربط علاقة الإحالة",
  },
  "register.failed": {
    zh: "注册失败", "zh-TW": "註冊失敗", en: "Registration Failed", ja: "登録失敗", ko: "등록 실패", vi: "Đăng ký thất bại",
    th: "ลงทะเบียนล้มเหลว", id: "Pendaftaran Gagal", ms: "Pendaftaran Gagal", fr: "Échec de l'inscription", ar: "فشل التسجيل",
  },
  "register.referrer_not_invested": {
    zh: "邀请人尚未投资", "zh-TW": "邀請人尚未投資", en: "Referrer has not invested", ja: "招待者がまだ投資していません",
    ko: "추천인이 아직 투자하지 않았습니다", vi: "Người giới thiệu chưa đầu tư",
    th: "ผู้แนะนำยังไม่ได้ลงทุน", id: "Pemberi referral belum berinvestasi", ms: "Perujuk belum melabur",
    fr: "Le parrain n'a pas encore investi", ar: "المُحيل لم يستثمر بعد",
  },
  "register.referrer_not_invested_desc": {
    zh: "邀请人需要先投资才能邀请他人", "zh-TW": "邀請人需要先投資才能邀請他人",
    en: "Referrer must invest before inviting others", ja: "招待者は他の人を招待する前に投資する必要があります",
    ko: "추천인은 다른 사람을 초대하기 전에 투자해야 합니다", vi: "Người giới thiệu cần đầu tư trước khi mời người khác",
    th: "ผู้แนะนำต้องลงทุนก่อนจึงจะเชิญผู้อื่นได้", id: "Pemberi referral harus berinvestasi sebelum mengundang orang lain",
    ms: "Perujuk mesti melabur sebelum menjemput orang lain", fr: "Le parrain doit investir avant d'inviter d'autres personnes",
    ar: "يجب على المُحيل الاستثمار قبل دعوة الآخرين",
  },
  "register.need_referral": {
    zh: "需要邀请链接", "zh-TW": "需要邀請鏈接", en: "Referral link required", ja: "招待リンクが必要です", ko: "추천 링크 필요", vi: "Cần liên kết giới thiệu",
    th: "ต้องการลิงค์แนะนำ", id: "Diperlukan link referral", ms: "Pautan rujukan diperlukan",
    fr: "Lien de parrainage requis", ar: "رابط الإحالة مطلوب",
  },
  "register.need_referral_desc": {
    zh: "请通过邀请链接注册", "zh-TW": "請通過邀請鏈接註冊", en: "Please register via referral link", ja: "招待リンクから登録してください",
    ko: "추천 링크로 등록하세요", vi: "Vui lòng đăng ký qua liên kết giới thiệu",
    th: "กรุณาลงทะเบียนผ่านลิงค์แนะนำ", id: "Silakan daftar melalui link referral", ms: "Sila daftar melalui pautan rujukan",
    fr: "Veuillez vous inscrire via un lien de parrainage", ar: "يرجى التسجيل عبر رابط الإحالة",
  },
  "register.referrer_not_found": {
    zh: "邀请人不存在", "zh-TW": "邀請人不存在", en: "Referrer not found", ja: "招待者が見つかりません", ko: "추천인을 찾을 수 없습니다", vi: "Không tìm thấy người giới thiệu",
    th: "ไม่พบผู้แนะนำ", id: "Pemberi referral tidak ditemukan", ms: "Perujuk tidak dijumpai",
    fr: "Parrain introuvable", ar: "لم يتم العثور على المُحيل",
  },
  "register.confirm_title": {
    zh: "确认注册", "zh-TW": "確認註冊", en: "Confirm Registration", ja: "登録確認", ko: "등록 확인", vi: "Xác nhận đăng ký",
    th: "ยืนยันการลงทะเบียน", id: "Konfirmasi Pendaftaran", ms: "Sahkan Pendaftaran", fr: "Confirmer l'inscription", ar: "تأكيد التسجيل",
  },
  "register.confirm_desc": {
    zh: "确认绑定推荐关系", "zh-TW": "確認綁定推薦關係", en: "Confirm referral binding", ja: "紹介関係のバインドを確認",
    ko: "추천 관계 연결 확인", vi: "Xác nhận liên kết giới thiệu",
    th: "ยืนยันการผูกความสัมพันธ์แนะนำ", id: "Konfirmasi pengikatan referral", ms: "Sahkan pengikatan rujukan",
    fr: "Confirmer la liaison de parrainage", ar: "تأكيد ربط الإحالة",
  },
  "register.your_referrer": {
    zh: "您的推荐人", "zh-TW": "您的推薦人", en: "Your Referrer", ja: "あなたの紹介者", ko: "추천인", vi: "Người giới thiệu của bạn",
    th: "ผู้แนะนำของคุณ", id: "Pemberi Referral Anda", ms: "Perujuk Anda", fr: "Votre parrain", ar: "المُحيل الخاص بك",
  },
  "register.bind_note": {
    zh: "绑定后推荐关系不可更改", "zh-TW": "綁定後推薦關係不可更改", en: "Referral binding cannot be changed",
    ja: "バインド後は紹介関係を変更できません", ko: "연결 후 추천 관계 변경 불가",
    vi: "Không thể thay đổi sau khi liên kết",
    th: "ไม่สามารถเปลี่ยนแปลงหลังจากผูกแล้ว", id: "Pengikatan referral tidak dapat diubah", ms: "Pengikatan rujukan tidak boleh diubah",
    fr: "La liaison de parrainage ne peut pas être modifiée", ar: "لا يمكن تغيير ربط الإحالة",
  },
  "register.invest_note": {
    zh: "注册后即可开始投资理财", "zh-TW": "註冊後即可開始投資理財", en: "Start investing after registration",
    ja: "登録後すぐに投資を開始できます", ko: "등록 후 바로 투자 시작",
    vi: "Bắt đầu đầu tư sau khi đăng ký",
    th: "เริ่มลงทุนได้หลังจากลงทะเบียน", id: "Mulai berinvestasi setelah pendaftaran", ms: "Mula melabur selepas pendaftaran",
    fr: "Commencez à investir après l'inscription", ar: "ابدأ الاستثمار بعد التسجيل",
  },
  "register.cancel": {
    zh: "取消", "zh-TW": "取消", en: "Cancel", ja: "キャンセル", ko: "취소", vi: "Hủy",
    th: "ยกเลิก", id: "Batal", ms: "Batal", fr: "Annuler", ar: "إلغاء",
  },
  "register.confirm": {
    zh: "确认注册", "zh-TW": "確認註冊", en: "Confirm", ja: "登録確認", ko: "등록 확인", vi: "Xác nhận",
    th: "ยืนยัน", id: "Konfirmasi", ms: "Sahkan", fr: "Confirmer", ar: "تأكيد",
  },
  "register.registering": {
    zh: "注册中...", "zh-TW": "註冊中...", en: "Registering...", ja: "登録中...", ko: "등록 중...", vi: "Đang đăng ký...",
    th: "กำลังลงทะเบียน...", id: "Mendaftar...", ms: "Mendaftar...", fr: "Inscription...", ar: "جاري التسجيل...",
  },

  // --- Common ---
  "common.days": {
    zh: "天", "zh-TW": "天", en: "days", ja: "日", ko: "일", vi: "ngày",
    th: "วัน", id: "hari", ms: "hari", fr: "jours", ar: "أيام",
  },
  "common.loading": {
    zh: "加载中...", "zh-TW": "載入中...", en: "Loading...", ja: "読み込み中...", ko: "로딩 중...", vi: "Đang tải...",
    th: "กำลังโหลด...", id: "Memuat...", ms: "Memuatkan...", fr: "Chargement...", ar: "جاري التحميل...",
  },

  // --- Navigation ---
  "nav.home": { zh: "首页", "zh-TW": "首頁", en: "Home", ko: "홈", ja: "ホーム", vi: "Trang chủ", th: "หน้าแรก", id: "Beranda", ms: "Laman Utama", fr: "Accueil", ar: "الرئيسية" },
  "nav.orders": { zh: "订单", "zh-TW": "訂單", en: "Orders", ko: "주문", ja: "注文", vi: "Đơn hàng", th: "คำสั่ง", id: "Pesanan", ms: "Pesanan", fr: "Commandes", ar: "الطلبات" },
  "nav.invite": { zh: "邀请", "zh-TW": "邀請", en: "Invite", ko: "초대", ja: "招待", vi: "Mời", th: "เชิญ", id: "Undang", ms: "Jemput", fr: "Inviter", ar: "دعوة" },
  "nav.profile": { zh: "我的", "zh-TW": "我的", en: "Profile", ko: "프로필", ja: "マイページ", vi: "Cá nhân", th: "โปรไฟล์", id: "Profil", ms: "Profil", fr: "Profil", ar: "حسابي" },
  "nav.connect_wallet": { zh: "连接钱包", "zh-TW": "連接錢包", en: "Connect Wallet", ko: "지갑 연결", ja: "ウォレット接続", vi: "Kết nối ví", th: "เชื่อมต่อกระเป๋า", id: "Hubungkan Dompet", ms: "Sambung Dompet", fr: "Connecter le portefeuille", ar: "ربط المحفظة" },

  // --- Landing page ---
  "landing.tagline": { zh: "新一代去中心化AI算力投资平台", "zh-TW": "新一代去中心化AI算力投資平台", en: "Next-Gen Decentralized AI Computing Investment Platform", ko: "차세대 탈중앙화 AI 컴퓨팅 투자 플랫폼", ja: "次世代分散型AIコンピューティング投資プラットフォーム", vi: "Nền tảng đầu tư điện toán AI phi tập trung thế hệ mới", th: "แพลตฟอร์มการลงทุนคอมพิวเตอร์ AI แบบกระจายอำนาจรุ่นใหม่", id: "Platform Investasi Komputasi AI Terdesentralisasi Generasi Baru", ms: "Platform Pelaburan Pengkomputeran AI Ternyahpusat Generasi Baharu", fr: "Plateforme d'investissement en calcul IA décentralisée de nouvelle génération", ar: "منصة استثمار حوسبة الذكاء الاصطناعي اللامركزية من الجيل الجديد" },
  "landing.keywords": { zh: "安全 · 透明 · 高效", "zh-TW": "安全 · 透明 · 高效", en: "Secure · Transparent · Efficient", ko: "안전 · 투명 · 효율", ja: "安全 · 透明 · 効率的", vi: "An toàn · Minh bạch · Hiệu quả", th: "ปลอดภัย · โปร่งใส · มีประสิทธิภาพ", id: "Aman · Transparan · Efisien", ms: "Selamat · Telus · Cekap", fr: "Sûr · Transparent · Efficace", ar: "آمن · شفاف · فعال" },
  "landing.blockchain": { zh: "安全区块链", "zh-TW": "安全區塊鏈", en: "Secure Blockchain", ko: "안전한 블록체인", ja: "安全なブロックチェーン", vi: "Blockchain an toàn", th: "บล็อกเชนปลอดภัย", id: "Blockchain Aman", ms: "Blockchain Selamat", fr: "Blockchain sécurisée", ar: "بلوكتشين آمن" },
  "landing.auto_settle": { zh: "自动结算", "zh-TW": "自動結算", en: "Auto Settlement", ko: "자동 정산", ja: "自動決済", vi: "Thanh toán tự động", th: "ชำระอัตโนมัติ", id: "Penyelesaian Otomatis", ms: "Penyelesaian Automatik", fr: "Règlement automatique", ar: "تسوية تلقائية" },
  "landing.stablecoin": { zh: "稳定币质押", "zh-TW": "穩定幣質押", en: "Stablecoin Staking", ko: "스테이블코인 스테이킹", ja: "ステーブルコインステーキング", vi: "Stake stablecoin", th: "Stake เหรียญ Stable", id: "Staking Stablecoin", ms: "Staking Stablecoin", fr: "Staking de stablecoin", ar: "رهن العملة المستقرة" },
  "landing.about": { zh: "关于 CoreX", "zh-TW": "關於 CoreX", en: "About CoreX", ko: "CoreX 소개", ja: "CoreXについて", vi: "Về CoreX", th: "เกี่ยวกับ CoreX", id: "Tentang CoreX", ms: "Tentang CoreX", fr: "À propos de CoreX", ar: "حول CoreX" },
  "landing.advantages": { zh: "核心优势", "zh-TW": "核心優勢", en: "Core Advantages", ko: "핵심 장점", ja: "コアアドバンテージ", vi: "Ưu điểm cốt lõi", th: "ข้อได้เปรียบหลัก", id: "Keunggulan Inti", ms: "Kelebihan Teras", fr: "Avantages clés", ar: "المزايا الأساسية" },
  "landing.feat_secure": { zh: "安全可靠", "zh-TW": "安全可靠", en: "Safe & Reliable", ko: "안전하고 신뢰할 수 있는", ja: "安全で信頼性", vi: "An toàn & Đáng tin cậy", th: "ปลอดภัยและเชื่อถือได้", id: "Aman & Terpercaya", ms: "Selamat & Boleh Dipercayai", fr: "Sûr et fiable", ar: "آمن وموثوق" },
  "landing.feat_secure_desc": { zh: "智能合约保障\n链上透明可查", "zh-TW": "智能合約保障\n鏈上透明可查", en: "Smart contract secured\nOn-chain transparency", ko: "스마트 컨트랙트 보장\n온체인 투명성", ja: "スマートコントラクト保証\nオンチェーン透明性", vi: "Bảo đảm hợp đồng thông minh\nMinh bạch trên chuỗi", th: "รับประกันด้วย Smart Contract\nโปร่งใสบนเชน", id: "Dijamin smart contract\nTransparan di blockchain", ms: "Dijamin kontrak pintar\nTelus di atas rantai", fr: "Garanti par contrat intelligent\nTransparence on-chain", ar: "مضمون بالعقد الذكي\nشفافية على السلسلة" },
  "landing.feat_profit": { zh: "稳定收益", "zh-TW": "穩定收益", en: "Stable Returns", ko: "안정적 수익", ja: "安定した収益", vi: "Lợi nhuận ổn định", th: "ผลตอบแทนมั่นคง", id: "Pendapatan Stabil", ms: "Pulangan Stabil", fr: "Rendements stables", ar: "عوائد مستقرة" },
  "landing.feat_profit_desc": { zh: "AI算力驱动\n每日自动结算", "zh-TW": "AI算力驅動\n每日自動結算", en: "AI computing powered\nDaily auto settlement", ko: "AI 컴퓨팅 기반\n매일 자동 정산", ja: "AIコンピューティング駆動\n毎日自動決済", vi: "Vận hành bởi AI\nThanh toán tự động hàng ngày", th: "ขับเคลื่อนด้วย AI\nชำระอัตโนมัติทุกวัน", id: "Didukung komputasi AI\nPenyelesaian otomatis harian", ms: "Dikuasakan pengkomputeran AI\nPenyelesaian automatik harian", fr: "Propulsé par l'IA\nRèglement quotidien automatique", ar: "مدعوم بحوسبة الذكاء الاصطناعي\nتسوية يومية تلقائية" },
  "landing.feat_withdraw": { zh: "即时提现", "zh-TW": "即時提現", en: "Instant Withdrawal", ko: "즉시 출금", ja: "即時出金", vi: "Rút tiền tức thì", th: "ถอนเงินทันที", id: "Penarikan Instan", ms: "Pengeluaran Segera", fr: "Retrait instantané", ar: "سحب فوري" },
  "landing.feat_withdraw_desc": { zh: "链上自动执行\n到账快速", "zh-TW": "鏈上自動執行\n到賬快速", en: "On-chain auto execution\nFast arrival", ko: "온체인 자동 실행\n빠른 입금", ja: "オンチェーン自動実行\n高速着金", vi: "Tự động thực thi trên chuỗi\nNhận tiền nhanh", th: "ดำเนินการอัตโนมัติบนเชน\nเงินเข้าเร็ว", id: "Eksekusi otomatis on-chain\nPencairan cepat", ms: "Pelaksanaan automatik on-chain\nMasuk cepat", fr: "Exécution automatique on-chain\nArrivée rapide", ar: "تنفيذ تلقائي على السلسلة\nوصول سريع" },
  "landing.feat_global": { zh: "全球节点", "zh-TW": "全球節點", en: "Global Nodes", ko: "글로벌 노드", ja: "グローバルノード", vi: "Nút toàn cầu", th: "โหนดทั่วโลก", id: "Node Global", ms: "Nod Global", fr: "Nœuds mondiaux", ar: "عقد عالمية" },
  "landing.feat_global_desc": { zh: "分布式算力网络\n覆盖全球", "zh-TW": "分布式算力網絡\n覆蓋全球", en: "Distributed computing\nGlobal coverage", ko: "분산 컴퓨팅 네트워크\n전 세계 지원", ja: "分散コンピューティングネットワーク\nグローバルカバレッジ", vi: "Mạng lưới tính toán phân tán\nPhủ sóng toàn cầu", th: "เครือข่ายคอมพิวเตอร์แบบกระจาย\nครอบคลุมทั่วโลก", id: "Jaringan komputasi terdistribusi\nJangkauan global", ms: "Rangkaian pengkomputeran teragih\nLiputan global", fr: "Réseau de calcul distribué\nCouverture mondiale", ar: "شبكة حوسبة موزعة\nتغطية عالمية" },
  "landing.enter": { zh: "进入平台", "zh-TW": "進入平台", en: "Enter Platform", ko: "플랫폼 입장", ja: "プラットフォームへ", vi: "Vào nền tảng", th: "เข้าสู่แพลตฟอร์ม", id: "Masuk Platform", ms: "Masuk Platform", fr: "Entrer dans la plateforme", ar: "دخول المنصة" },
  "landing.connect_wallet": { zh: "连接钱包", "zh-TW": "連接錢包", en: "Connect Wallet", ko: "지갑 연결", ja: "ウォレット接続", vi: "Kết nối ví", th: "เชื่อมต่อกระเป๋า", id: "Hubungkan Dompet", ms: "Sambung Dompet", fr: "Connecter le portefeuille", ar: "ربط المحفظة" },
  "landing.connecting": { zh: "连接中...", "zh-TW": "連接中...", en: "Connecting...", ko: "연결 중...", ja: "接続中...", vi: "Đang kết nối...", th: "กำลังเชื่อมต่อ...", id: "Menghubungkan...", ms: "Menyambung...", fr: "Connexion...", ar: "...جاري الاتصال" },
  "landing.subtitle": { zh: "AI算力基础设施", "zh-TW": "AI算力基礎設施", en: "AI Computing Infrastructure", ko: "AI 컴퓨팅 인프라", ja: "AIコンピューティングインフラ", vi: "Hạ tầng điện toán AI", th: "โครงสร้างพื้นฐานคอมพิวเตอร์ AI", id: "Infrastruktur Komputasi AI", ms: "Infrastruktur Pengkomputeran AI", fr: "Infrastructure de calcul IA", ar: "البنية التحتية لحوسبة الذكاء الاصطناعي" },
  "landing.trust_bsc": { zh: "BSC 链", "zh-TW": "BSC 鏈", en: "BSC Chain", ko: "BSC 체인", ja: "BSCチェーン", vi: "Chuỗi BSC", th: "เชน BSC", id: "Rantai BSC", ms: "Rantaian BSC", fr: "Chaîne BSC", ar: "سلسلة BSC" },
  "landing.trust_contract": { zh: "智能合约", "zh-TW": "智能合約", en: "Smart Contract", ko: "스마트 컨트랙트", ja: "スマートコントラクト", vi: "Hợp đồng thông minh", th: "สัญญาอัจฉริยะ", id: "Kontrak Pintar", ms: "Kontrak Pintar", fr: "Contrat intelligent", ar: "العقد الذكي" },
  "landing.trust_staking": { zh: "USDT 质押", "zh-TW": "USDT 質押", en: "USDT Staking", ko: "USDT 스테이킹", ja: "USDTステーキング", vi: "Stake USDT", th: "Stake USDT", id: "Staking USDT", ms: "Staking USDT", fr: "Staking USDT", ar: "رهن USDT" },
  "landing.trust_defi": { zh: "去中心化平台", "zh-TW": "去中心化平台", en: "Decentralized Platform", ko: "탈중앙화 플랫폼", ja: "分散型プラットフォーム", vi: "Nền tảng phi tập trung", th: "แพลตฟอร์มกระจายอำนาจ", id: "Platform Terdesentralisasi", ms: "Platform Ternyahpusat", fr: "Plateforme décentralisée", ar: "منصة لامركزية" },
  "landing.footer_desc": { zh: "BSC 链 · USDT 质押 · 去中心化平台", "zh-TW": "BSC 鏈 · USDT 質押 · 去中心化平台", en: "BSC Chain · USDT Staking · Decentralized Platform", ko: "BSC 체인 · USDT 스테이킹 · 탈중앙화 플랫폼", ja: "BSCチェーン · USDTステーキング · 分散型プラットフォーム", vi: "Chuỗi BSC · Stake USDT · Nền tảng phi tập trung", th: "เชน BSC · Stake USDT · แพลตฟอร์มกระจายอำนาจ", id: "Rantai BSC · Staking USDT · Platform Terdesentralisasi", ms: "Rantaian BSC · Staking USDT · Platform Ternyahpusat", fr: "Chaîne BSC · Staking USDT · Plateforme décentralisée", ar: "سلسلة BSC · رهن USDT · منصة لامركزية" },

  // --- Home / Product ---
  "home.products": { zh: "CoreX投资产品", "zh-TW": "CoreX投資產品", en: "CoreX Investment Products", ko: "CoreX 투자 상품", ja: "CoreX投資商品", vi: "Sản phẩm đầu tư CoreX", th: "ผลิตภัณฑ์การลงทุน CoreX", id: "Produk Investasi CoreX", ms: "Produk Pelaburan CoreX", fr: "Produits d'investissement CoreX", ar: "منتجات استثمار CoreX" },
  "home.invest": { zh: "投资", "zh-TW": "投資", en: "Invest", ko: "투자", ja: "投資", vi: "Đầu tư", th: "ลงทุน", id: "Investasi", ms: "Labur", fr: "Investir", ar: "استثمر" },
  "home.cycle": { zh: "投资周期", "zh-TW": "投資周期", en: "Investment Period", ko: "투자 기간", ja: "投資期間", vi: "Kỳ hạn đầu tư", th: "ระยะเวลาลงทุน", id: "Periode Investasi", ms: "Tempoh Pelaburan", fr: "Période d'investissement", ar: "مدة الاستثمار" },
  "home.amount": { zh: "投资金额", "zh-TW": "投資金額", en: "Investment Amount", ko: "투자 금액", ja: "投資額", vi: "Số tiền đầu tư", th: "จำนวนเงินลงทุน", id: "Jumlah Investasi", ms: "Jumlah Pelaburan", fr: "Montant d'investissement", ar: "مبلغ الاستثمار" },
  "home.total_profit": { zh: "总利润", "zh-TW": "總利潤", en: "Total Profit", ko: "총 수익", ja: "総利益", vi: "Tổng lợi nhuận", th: "กำไรรวม", id: "Total Keuntungan", ms: "Jumlah Keuntungan", fr: "Profit total", ar: "إجمالي الربح" },
  "home.total_return": { zh: "总收益率", "zh-TW": "總收益率", en: "Total Return", ko: "총 수익률", ja: "総収益率", vi: "Tổng tỷ suất", th: "อัตราผลตอบแทนรวม", id: "Total Imbal Hasil", ms: "Jumlah Pulangan", fr: "Rendement total", ar: "إجمالي العائد" },
  "home.min_invest": { zh: "最低投入", "zh-TW": "最低投入", en: "Min. Investment", ko: "최소 투자", ja: "最低投資額", vi: "Đầu tư tối thiểu", th: "ลงทุนขั้นต่ำ", id: "Investasi Minimum", ms: "Pelaburan Minimum", fr: "Investissement min.", ar: "الحد الأدنى للاستثمار" },
  "home.redeem_time": { zh: "赎回时间", "zh-TW": "贖回時間", en: "Redemption Time", ko: "상환 시간", ja: "償還時間", vi: "Thời gian đáo hạn", th: "เวลาไถ่ถอน", id: "Waktu Penebusan", ms: "Masa Penebusan", fr: "Date de rachat", ar: "وقت الاسترداد" },
  "home.shares": { zh: "投资份数", "zh-TW": "投資份數", en: "Investment Shares", ko: "투자 지분", ja: "投資口数", vi: "Cổ phần đầu tư", th: "หุ้นลงทุน", id: "Saham Investasi", ms: "Saham Pelaburan", fr: "Parts d'investissement", ar: "حصص الاستثمار" },
  "home.invest_times": { zh: "投资次数", "zh-TW": "投資次數", en: "Investment Rounds", ko: "투자 횟수", ja: "投資回数", vi: "Số lần đầu tư", th: "จำนวนครั้งที่ลงทุน", id: "Putaran Investasi", ms: "Pusingan Pelaburan", fr: "Rounds d'investissement", ar: "جولات الاستثمار" },
  "home.repurchase": { zh: "到期复购", "zh-TW": "到期復購", en: "Repurchase at maturity", ko: "만기 시 재투자", ja: "満期時に再投資", vi: "Tái đầu tư khi đáo hạn", th: "ซื้อซ้ำเมื่อครบกำหนด", id: "Beli ulang saat jatuh tempo", ms: "Beli semula apabila matang", fr: "Rachat à l'échéance", ar: "إعادة الشراء عند الاستحقاق" },
  "home.invest_amount_usdt": { zh: "投资金额 (USDT)", "zh-TW": "投資金額 (USDT)", en: "Investment Amount (USDT)", ko: "투자 금액 (USDT)", ja: "投資額 (USDT)", vi: "Số tiền đầu tư (USDT)", th: "จำนวนเงินลงทุน (USDT)", id: "Jumlah Investasi (USDT)", ms: "Jumlah Pelaburan (USDT)", fr: "Montant d'investissement (USDT)", ar: "مبلغ الاستثمار (USDT)" },
  "home.each_step": { zh: "每次", "zh-TW": "每次", en: "Each step", ko: "단위", ja: "1回", vi: "Mỗi lần", th: "ต่อครั้ง", id: "Setiap langkah", ms: "Setiap langkah", fr: "Par étape", ar: "لكل خطوة" },
  "home.times": { zh: "倍", "zh-TW": "倍", en: "x", ko: "배", ja: "倍", vi: "lần", th: "เท่า", id: "kali", ms: "kali", fr: "fois", ar: "مرة" },
  "home.est_daily": { zh: "预计每日收益", "zh-TW": "預計每日收益", en: "Est. Daily Earnings", ko: "예상 일일 수익", ja: "予想日次収益", vi: "Thu nhập hàng ngày ước tính", th: "รายได้รายวันโดยประมาณ", id: "Estimasi Pendapatan Harian", ms: "Anggaran Pendapatan Harian", fr: "Revenus quotidiens estimés", ar: "الأرباح اليومية المقدرة" },
  "home.est_total_profit": { zh: "到期总收益", "zh-TW": "到期總收益", en: "Total Return at Maturity", ko: "만기 총 수익", ja: "満期時総収益", vi: "Tổng thu nhập khi đáo hạn", th: "ผลตอบแทนรวมเมื่อครบกำหนด", id: "Total Pendapatan Saat Jatuh Tempo", ms: "Jumlah Pulangan Apabila Matang", fr: "Rendement total à l'échéance", ar: "إجمالي العائد عند الاستحقاق" },
  "home.total_return_amount": { zh: "到期返还", "zh-TW": "到期返還", en: "Return at Maturity", ko: "만기 반환", ja: "満期時返還", vi: "Hoàn trả khi đáo hạn", th: "คืนเมื่อครบกำหนด", id: "Pengembalian Saat Jatuh Tempo", ms: "Pulangan Apabila Matang", fr: "Retour à l'échéance", ar: "الإرجاع عند الاستحقاق" },
  "home.no_early_redeem": { zh: "不可提前赎回 · 到期自动返还本金", "zh-TW": "不可提前贖回 · 到期自動返還本金", en: "No early redemption · Principal auto-returned at maturity", ko: "조기 상환 불가 · 만기 시 원금 자동 반환", ja: "早期償還不可 · 満期時に元本自動返還", vi: "Không rút sớm · Tự động hoàn vốn khi đáo hạn", th: "ไม่สามารถไถ่ถอนก่อนกำหนด · คืนเงินต้นอัตโนมัติ", id: "Tidak bisa ditarik lebih awal · Modal dikembalikan otomatis", ms: "Tidak boleh tebus awal · Modal dipulangkan automatik", fr: "Pas de rachat anticipé · Capital retourné automatiquement", ar: "لا استرداد مبكر · يتم إرجاع رأس المال تلقائياً" },
  "home.daily_withdraw_note": { zh: "日利润可提现 · 每笔最低30U · 手续费1U", "zh-TW": "日利潤可提現 · 每筆最低30U · 手續費1U", en: "Daily profit withdrawable · Min 30U per tx · Fee 1U", ko: "일일 수익 출금 가능 · 건당 최소 30U · 수수료 1U", ja: "日次利益引出可能 · 1回最低30U · 手数料1U", vi: "Rút lợi nhuận hàng ngày · Tối thiểu 30U/lần · Phí 1U", th: "ถอนกำไรรายวันได้ · ขั้นต่ำ 30U/ครั้ง · ค่าธรรมเนียม 1U", id: "Keuntungan harian bisa ditarik · Min 30U/transaksi · Biaya 1U", ms: "Keuntungan harian boleh dikeluarkan · Min 30U/transaksi · Yuran 1U", fr: "Bénéfice quotidien retirable · Min 30U/tx · Frais 1U", ar: "يمكن سحب الربح اليومي · الحد الأدنى 30U/معاملة · رسوم 1U" },
  "home.day_cycle": { zh: "天周期", "zh-TW": "天周期", en: "day cycle", ko: "일 주기", ja: "日サイクル", vi: "ngày chu kỳ", th: "วัน รอบ", id: "hari siklus", ms: "hari kitaran", fr: "jours cycle", ar: "دورة أيام" },
  "home.daily_rate": { zh: "日利率", "zh-TW": "日利率", en: "Daily Rate", ko: "일일 이율", ja: "日利率", vi: "Lãi suất ngày", th: "อัตราดอกเบี้ยรายวัน", id: "Tarif Harian", ms: "Kadar Harian", fr: "Taux quotidien", ar: "المعدل اليومي" },
  "home.normal": { zh: "普通", "zh-TW": "普通", en: "Normal", ko: "일반", ja: "普通", vi: "Thường", th: "ปกติ", id: "Normal", ms: "Biasa", fr: "Normal", ar: "عادي" },
  "product.desc_1": { zh: "入门级稳健理财", "zh-TW": "入門級穩健理財", en: "Entry-level stable investment", ko: "입문급 안정 투자", ja: "入門レベルの安定投資", vi: "Đầu tư ổn định cấp cơ bản", th: "การลงทุนเบื้องต้นมั่นคง", id: "Investasi stabil pemula", ms: "Pelaburan stabil peringkat permulaan", fr: "Investissement stable débutant", ar: "استثمار مستقر للمبتدئين" },
  "product.desc_2": { zh: "进阶稳健增值", "zh-TW": "進階穩健增值", en: "Advanced stable growth", ko: "고급 안정 성장", ja: "上級安定成長", vi: "Tăng trưởng ổn định nâng cao", th: "การเติบโตมั่นคงขั้นสูง", id: "Pertumbuhan stabil lanjutan", ms: "Pertumbuhan stabil lanjutan", fr: "Croissance stable avancée", ar: "نمو مستقر متقدم" },
  "product.desc_3": { zh: "中期复利增长", "zh-TW": "中期複利增長", en: "Mid-term compound growth", ko: "중기 복리 성장", ja: "中期複利成長", vi: "Tăng trưởng lãi kép trung hạn", th: "การเติบโตทบต้นระยะกลาง", id: "Pertumbuhan bunga majemuk jangka menengah", ms: "Pertumbuhan faedah kompaun jangka sederhana", fr: "Croissance composée à moyen terme", ar: "نمو مركب متوسط الأجل" },
  "product.desc_4": { zh: "高收益专业级", "zh-TW": "高收益專業級", en: "High-yield professional", ko: "고수익 전문가급", ja: "高利回りプロフェッショナル", vi: "Chuyên nghiệp lợi nhuận cao", th: "ระดับมืออาชีพผลตอบแทนสูง", id: "Profesional hasil tinggi", ms: "Profesional pulangan tinggi", fr: "Professionnel haut rendement", ar: "محترف عائد مرتفع" },
  "product.desc_5": { zh: "顶级年化收益", "zh-TW": "頂級年化收益", en: "Premium annual returns", ko: "최고급 연간 수익", ja: "最高年間利回り", vi: "Lợi nhuận hàng năm cao cấp", th: "ผลตอบแทนรายปีระดับพรีเมียม", id: "Pengembalian tahunan premium", ms: "Pulangan tahunan premium", fr: "Rendements annuels premium", ar: "عوائد سنوية ممتازة" },

  // --- Orders page extra ---
  "orders.daily_income": { zh: "日收益", "zh-TW": "日收益", en: "Daily Income", ko: "일일 수익", ja: "日次収益", vi: "Thu nhập ngày", th: "รายได้รายวัน", id: "Pendapatan Harian", ms: "Pendapatan Harian", fr: "Revenu quotidien", ar: "الدخل اليومي" },
  "orders.total_income": { zh: "总收益", "zh-TW": "總收益", en: "Total Income", ko: "총 수익", ja: "総収益", vi: "Tổng thu nhập", th: "รายได้รวม", id: "Total Pendapatan", ms: "Jumlah Pendapatan", fr: "Revenu total", ar: "إجمالي الدخل" },
  "orders.earnings_detail": { zh: "收益明细", "zh-TW": "收益明細", en: "Earnings Detail", ko: "수익 내역", ja: "収益明細", vi: "Chi tiết thu nhập", th: "รายละเอียดรายได้", id: "Detail Pendapatan", ms: "Butiran Pendapatan", fr: "Détail des revenus", ar: "تفاصيل الأرباح" },
  "orders.all": { zh: "全部", "zh-TW": "全部", en: "All", ko: "전체", ja: "すべて", vi: "Tất cả", th: "ทั้งหมด", id: "Semua", ms: "Semua", fr: "Tout", ar: "الكل" },
  "orders.active": { zh: "进行中", "zh-TW": "進行中", en: "Active", ko: "진행 중", ja: "進行中", vi: "Đang hoạt động", th: "กำลังดำเนินการ", id: "Aktif", ms: "Aktif", fr: "Actif", ar: "نشط" },
  "orders.completed": { zh: "已完成", "zh-TW": "已完成", en: "Completed", ko: "완료", ja: "完了", vi: "Hoàn thành", th: "เสร็จสิ้น", id: "Selesai", ms: "Selesai", fr: "Terminé", ar: "مكتمل" },
  "orders.no_type_orders": { zh: "没有{type}的订单", "zh-TW": "沒有{type}的訂單", en: "No {type} orders", ko: "{type} 주문 없음", ja: "{type}注文なし", vi: "Không có đơn hàng {type}", th: "ไม่มีคำสั่ง{type}", id: "Tidak ada pesanan {type}", ms: "Tiada pesanan {type}", fr: "Aucune commande {type}", ar: "لا توجد طلبات {type}" },

  // --- Profile ---
  "profile.title": { zh: "我的", "zh-TW": "我的", en: "Profile", ko: "프로필", ja: "マイページ", vi: "Cá nhân", th: "โปรไฟล์", id: "Profil", ms: "Profil", fr: "Profil", ar: "حسابي" },
  "profile.not_connected": { zh: "尚未连接钱包", "zh-TW": "尚未連接錢包", en: "Wallet not connected", ko: "지갑이 연결되지 않았습니다", ja: "ウォレット未接続", vi: "Ví chưa kết nối", th: "ยังไม่ได้เชื่อมต่อกระเป๋า", id: "Dompet belum terhubung", ms: "Dompet belum disambung", fr: "Portefeuille non connecté", ar: "المحفظة غير متصلة" },
  "profile.connect_desc": { zh: "连接钱包以使用全部功能", "zh-TW": "連接錢包以使用全部功能", en: "Connect wallet to use all features", ko: "모든 기능을 사용하려면 지갑을 연결하세요", ja: "すべての機能を使用するにはウォレットを接続してください", vi: "Kết nối ví để sử dụng tất cả tính năng", th: "เชื่อมต่อกระเป๋าเพื่อใช้ทุกฟีเจอร์", id: "Hubungkan dompet untuk menggunakan semua fitur", ms: "Sambungkan dompet untuk menggunakan semua ciri", fr: "Connectez votre portefeuille pour utiliser toutes les fonctionnalités", ar: "اربط محفظتك لاستخدام جميع الميزات" },
  "profile.bsc_network": { zh: "BSC 网络", "zh-TW": "BSC 網絡", en: "BSC Network", ko: "BSC 네트워크", ja: "BSCネットワーク", vi: "Mạng BSC", th: "เครือข่าย BSC", id: "Jaringan BSC", ms: "Rangkaian BSC", fr: "Réseau BSC", ar: "شبكة BSC" },
  "profile.daily_earnings_amount": { zh: "投资收益金额", "zh-TW": "投資收益金額", en: "Investment Earnings", ko: "투자 수익 금액", ja: "投資収益額", vi: "Thu nhập đầu tư", th: "รายได้จากการลงทุน", id: "Pendapatan Investasi", ms: "Pendapatan Pelaburan", fr: "Revenus d'investissement", ar: "أرباح الاستثمار" },
  "profile.referral_earnings_amount": { zh: "推荐收益金额", "zh-TW": "推薦收益金額", en: "Referral Earnings", ko: "추천 수익 금액", ja: "紹介収益額", vi: "Thu nhập giới thiệu", th: "รายได้จากการแนะนำ", id: "Pendapatan Referral", ms: "Pendapatan Rujukan", fr: "Revenus de parrainage", ar: "أرباح الإحالة" },
  "profile.total_earnings": { zh: "合计收益金额", "zh-TW": "合計收益金額", en: "Total Earnings", ko: "총 수익 금액", ja: "合計収益額", vi: "Tổng thu nhập", th: "รายได้รวม", id: "Total Pendapatan", ms: "Jumlah Pendapatan", fr: "Total des revenus", ar: "إجمالي الأرباح" },
  "profile.total_withdrawn": { zh: "累计提现金额", "zh-TW": "累計提現金額", en: "Total Withdrawn", ko: "누적 출금 금액", ja: "累計引出額", vi: "Tổng đã rút", th: "ยอดถอนสะสม", id: "Total Penarikan", ms: "Jumlah Pengeluaran", fr: "Total retiré", ar: "إجمالي المسحوب" },
  "profile.withdraw_records": { zh: "提现明细", "zh-TW": "提現明細", en: "Withdrawal Records", ko: "출금 내역", ja: "引出明細", vi: "Lịch sử rút tiền", th: "ประวัติการถอน", id: "Riwayat Penarikan", ms: "Sejarah Pengeluaran", fr: "Historique des retraits", ar: "سجلات السحب" },
  "profile.withdraw_records_desc": { zh: "查看提现记录", "zh-TW": "查看提現記錄", en: "View withdrawal records", ko: "출금 내역 보기", ja: "引出履歴を表示", vi: "Xem lịch sử rút tiền", th: "ดูประวัติการถอน", id: "Lihat riwayat penarikan", ms: "Lihat sejarah pengeluaran", fr: "Voir l'historique des retraits", ar: "عرض سجلات السحب" },
  "profile.history": { zh: "历史明细", "zh-TW": "歷史明細", en: "Transaction History", ko: "거래 내역", ja: "取引履歴", vi: "Lịch sử giao dịch", th: "ประวัติธุรกรรม", id: "Riwayat Transaksi", ms: "Sejarah Transaksi", fr: "Historique des transactions", ar: "سجل المعاملات" },
  "profile.history_desc": { zh: "收益记录详情", "zh-TW": "收益記錄詳情", en: "Earnings record details", ko: "수익 기록 상세", ja: "収益記録の詳細", vi: "Chi tiết hồ sơ thu nhập", th: "รายละเอียดบันทึกรายได้", id: "Detail catatan pendapatan", ms: "Butiran rekod pendapatan", fr: "Détails des enregistrements de revenus", ar: "تفاصيل سجل الأرباح" },
  "profile.lang_switch": { zh: "语言切换", "zh-TW": "語言切換", en: "Language", ko: "언어", ja: "言語", vi: "Ngôn ngữ", th: "ภาษา", id: "Bahasa", ms: "Bahasa", fr: "Langue", ar: "اللغة" },
  "profile.notifications": { zh: "消息通知", "zh-TW": "消息通知", en: "Notifications", ko: "알림", ja: "通知", vi: "Thông báo", th: "การแจ้งเตือน", id: "Notifikasi", ms: "Pemberitahuan", fr: "Notifications", ar: "الإشعارات" },
  "profile.help": { zh: "帮助中心", "zh-TW": "幫助中心", en: "Help Center", ko: "도움말 센터", ja: "ヘルプセンター", vi: "Trung tâm trợ giúp", th: "ศูนย์ช่วยเหลือ", id: "Pusat Bantuan", ms: "Pusat Bantuan", fr: "Centre d'aide", ar: "مركز المساعدة" },
  "profile.help_desc": { zh: "使用教程和常见问题", "zh-TW": "使用教程和常見問題", en: "Tutorials and FAQ", ko: "튜토리얼 및 FAQ", ja: "チュートリアルとFAQ", vi: "Hướng dẫn và câu hỏi thường gặp", th: "บทเรียนและคำถามที่พบบ่อย", id: "Tutorial dan FAQ", ms: "Tutorial dan Soalan Lazim", fr: "Tutoriels et FAQ", ar: "الدروس والأسئلة الشائعة" },
  "profile.coming_soon": { zh: "功能开发中，敬请期待", "zh-TW": "功能開發中，敬請期待", en: "Coming soon", ko: "곧 출시 예정", ja: "近日公開予定", vi: "Sắp ra mắt", th: "เร็วๆ นี้", id: "Segera hadir", ms: "Akan datang", fr: "Bientôt disponible", ar: "قريباً" },
  "profile.disconnect": { zh: "断开连接", "zh-TW": "斷開連接", en: "Disconnect", ko: "연결 해제", ja: "切断", vi: "Ngắt kết nối", th: "ยกเลิกการเชื่อมต่อ", id: "Putuskan", ms: "Putuskan", fr: "Déconnecter", ar: "قطع الاتصال" },
  "profile.address_copied": { zh: "地址已复制", "zh-TW": "地址已複製", en: "Address copied", ko: "주소 복사됨", ja: "アドレスがコピーされました", vi: "Đã sao chép địa chỉ", th: "คัดลอกที่อยู่แล้ว", id: "Alamat disalin", ms: "Alamat disalin", fr: "Adresse copiée", ar: "تم نسخ العنوان" },
  "profile.disconnected": { zh: "已断开连接", "zh-TW": "已斷開連接", en: "Disconnected", ko: "연결 해제됨", ja: "切断されました", vi: "Đã ngắt kết nối", th: "ยกเลิกการเชื่อมต่อแล้ว", id: "Terputus", ms: "Terputus", fr: "Déconnecté", ar: "تم قطع الاتصال" },
  "profile.invest_label": { zh: "投资", "zh-TW": "投資", en: "Investment", ko: "투자", ja: "投資", vi: "Đầu tư", th: "การลงทุน", id: "Investasi", ms: "Pelaburan", fr: "Investissement", ar: "استثمار" },
  "profile.reward_label": { zh: "奖励", "zh-TW": "獎勵", en: "Reward", ko: "보상", ja: "報酬", vi: "Thưởng", th: "รางวัล", id: "Hadiah", ms: "Ganjaran", fr: "Récompense", ar: "مكافأة" },
  "profile.withdraw_success": { zh: "提现成功", "zh-TW": "提現成功", en: "Withdrawal successful", ko: "출금 성공", ja: "引出成功", vi: "Rút tiền thành công", th: "ถอนเงินสำเร็จ", id: "Penarikan berhasil", ms: "Pengeluaran berjaya", fr: "Retrait réussi", ar: "تم السحب بنجاح" },
  "profile.withdraw_rejected": { zh: "提现拒绝", "zh-TW": "提現拒絕", en: "Withdrawal rejected", ko: "출금 거절", ja: "引出拒否", vi: "Rút tiền bị từ chối", th: "ถอนเงินถูกปฏิเสธ", id: "Penarikan ditolak", ms: "Pengeluaran ditolak", fr: "Retrait rejeté", ar: "تم رفض السحب" },
  "profile.withdraw_request": { zh: "提现申请", "zh-TW": "提現申請", en: "Withdrawal request", ko: "출금 신청", ja: "引出申請", vi: "Yêu cầu rút tiền", th: "คำร้องถอนเงิน", id: "Permintaan penarikan", ms: "Permintaan pengeluaran", fr: "Demande de retrait", ar: "طلب سحب" },
  "profile.actual_received": { zh: "实到", "zh-TW": "實到", en: "Received", ko: "실수령", ja: "実受取", vi: "Thực nhận", th: "ได้รับจริง", id: "Diterima", ms: "Diterima", fr: "Reçu", ar: "المبلغ المستلم" },
  "profile.returned": { zh: "已退回", "zh-TW": "已退回", en: "Returned", ko: "반환됨", ja: "返金済", vi: "Đã hoàn", th: "คืนแล้ว", id: "Dikembalikan", ms: "Dipulangkan", fr: "Retourné", ar: "تم الإرجاع" },
  "profile.processing": { zh: "处理中", "zh-TW": "處理中", en: "Processing", ko: "처리 중", ja: "処理中", vi: "Đang xử lý", th: "กำลังดำเนินการ", id: "Memproses", ms: "Memproses", fr: "En traitement", ar: "قيد المعالجة" },
  "profile.history_invest_earn_withdraw": { zh: "投资·收益·提现记录", "zh-TW": "投資·收益·提現記錄", en: "Investment · Earnings · Withdrawal records", ko: "투자·수익·출금 기록", ja: "投資·収益·引出記録", vi: "Hồ sơ đầu tư · Thu nhập · Rút tiền", th: "บันทึกการลงทุน·รายได้·การถอน", id: "Catatan investasi · pendapatan · penarikan", ms: "Rekod pelaburan · pendapatan · pengeluaran", fr: "Historique investissement · revenus · retraits", ar: "سجل الاستثمار · الأرباح · السحب" },
  "profile.notification_order_expire": { zh: "订单到期提醒", "zh-TW": "訂單到期提醒", en: "Order expiry reminder", ko: "주문 만료 알림", ja: "注文期限リマインダー", vi: "Nhắc nhở đơn hàng hết hạn", th: "แจ้งเตือนคำสั่งหมดอายุ", id: "Pengingat pesanan kedaluwarsa", ms: "Peringatan pesanan tamat tempoh", fr: "Rappel d'expiration de commande", ar: "تذكير بانتهاء الطلب" },
  "profile.notification_order_expire_desc": { zh: "质押到期时通知您", "zh-TW": "質押到期時通知您", en: "Notify when staking expires", ko: "스테이킹 만료 시 알림", ja: "ステーキング満期時に通知", vi: "Thông báo khi stake hết hạn", th: "แจ้งเตือนเมื่อ Stake หมดอายุ", id: "Notifikasi saat staking berakhir", ms: "Maklumkan apabila staking tamat", fr: "Notifier à l'expiration du staking", ar: "إشعار عند انتهاء التخزين" },
  "profile.notification_daily": { zh: "每日收益通知", "zh-TW": "每日收益通知", en: "Daily earnings notification", ko: "일일 수익 알림", ja: "日次収益通知", vi: "Thông báo thu nhập hàng ngày", th: "การแจ้งเตือนรายได้รายวัน", id: "Notifikasi pendapatan harian", ms: "Pemberitahuan pendapatan harian", fr: "Notification de revenus quotidiens", ar: "إشعار الأرباح اليومية" },
  "profile.notification_daily_desc": { zh: "每日结算后推送收益", "zh-TW": "每日結算後推送收益", en: "Push earnings after daily settlement", ko: "일일 정산 후 수익 알림", ja: "日次決済後に収益を通知", vi: "Đẩy thu nhập sau thanh toán hàng ngày", th: "แจ้งรายได้หลังชำระรายวัน", id: "Push pendapatan setelah penyelesaian harian", ms: "Tolak pendapatan selepas penyelesaian harian", fr: "Notification des revenus après règlement quotidien", ar: "إرسال الأرباح بعد التسوية اليومية" },
  "profile.notification_referral": { zh: "推荐奖励通知", "zh-TW": "推薦獎勵通知", en: "Referral reward notification", ko: "추천 보상 알림", ja: "紹介報酬通知", vi: "Thông báo thưởng giới thiệu", th: "การแจ้งเตือนรางวัลแนะนำ", id: "Notifikasi hadiah referral", ms: "Pemberitahuan ganjaran rujukan", fr: "Notification de récompense de parrainage", ar: "إشعار مكافأة الإحالة" },
  "profile.notification_referral_desc": { zh: "获得推荐奖励时通知", "zh-TW": "獲得推薦獎勵時通知", en: "Notify when receiving referral rewards", ko: "추천 보상 수령 시 알림", ja: "紹介報酬を受け取った時に通知", vi: "Thông báo khi nhận thưởng giới thiệu", th: "แจ้งเตือนเมื่อได้รับรางวัลแนะนำ", id: "Notifikasi saat menerima hadiah referral", ms: "Maklumkan apabila menerima ganjaran rujukan", fr: "Notifier lors de la réception de récompenses de parrainage", ar: "إشعار عند استلام مكافآت الإحالة" },
  "profile.notification_system": { zh: "系统公告", "zh-TW": "系統公告", en: "System announcements", ko: "시스템 공지", ja: "システム公告", vi: "Thông báo hệ thống", th: "ประกาศระบบ", id: "Pengumuman sistem", ms: "Pengumuman sistem", fr: "Annonces système", ar: "إعلانات النظام" },
  "profile.notification_system_desc": { zh: "平台重要通知和公告", "zh-TW": "平台重要通知和公告", en: "Important platform notifications", ko: "플랫폼 중요 알림", ja: "プラットフォームの重要な通知", vi: "Thông báo quan trọng từ nền tảng", th: "การแจ้งเตือนสำคัญของแพลตฟอร์ม", id: "Notifikasi penting platform", ms: "Pemberitahuan penting platform", fr: "Notifications importantes de la plateforme", ar: "إشعارات المنصة المهمة" },
  "profile.lang_setting": { zh: "语言设置", "zh-TW": "語言設置", en: "Language Settings", ko: "언어 설정", ja: "言語設定", vi: "Cài đặt ngôn ngữ", th: "ตั้งค่าภาษา", id: "Pengaturan Bahasa", ms: "Tetapan Bahasa", fr: "Paramètres de langue", ar: "إعدادات اللغة" },
  "profile.select_lang": { zh: "选择您的界面语言", "zh-TW": "選擇您的界面語言", en: "Select your interface language", ko: "인터페이스 언어 선택", ja: "インターフェース言語を選択", vi: "Chọn ngôn ngữ giao diện", th: "เลือกภาษาอินเทอร์เฟซ", id: "Pilih bahasa antarmuka", ms: "Pilih bahasa antara muka", fr: "Sélectionnez votre langue d'interface", ar: "اختر لغة الواجهة" },

  // --- Invite page ---
  "invite.center": { zh: "邀请中心", "zh-TW": "邀請中心", en: "Invite Center", ko: "초대 센터", ja: "招待センター", vi: "Trung tâm mời", th: "ศูนย์เชิญ", id: "Pusat Undangan", ms: "Pusat Jemputan", fr: "Centre d'invitation", ar: "مركز الدعوات" },
  "invite.connect_first": { zh: "请先连接钱包", "zh-TW": "請先連接錢包", en: "Please connect wallet first", ko: "먼저 지갑을 연결하세요", ja: "先にウォレットを接続してください", vi: "Vui lòng kết nối ví trước", th: "กรุณาเชื่อมต่อกระเป๋าก่อน", id: "Silakan hubungkan dompet terlebih dahulu", ms: "Sila sambungkan dompet dahulu", fr: "Veuillez connecter votre portefeuille", ar: "يرجى ربط المحفظة أولاً" },
  "invite.my_link": { zh: "我的推荐链接", "zh-TW": "我的推薦鏈接", en: "My Referral Link", ko: "내 추천 링크", ja: "マイ招待リンク", vi: "Liên kết giới thiệu của tôi", th: "ลิงค์แนะนำของฉัน", id: "Link Referral Saya", ms: "Pautan Rujukan Saya", fr: "Mon lien de parrainage", ar: "رابط الإحالة الخاص بي" },
  "invite.copy": { zh: "复制", "zh-TW": "複製", en: "Copy", ko: "복사", ja: "コピー", vi: "Sao chép", th: "คัดลอก", id: "Salin", ms: "Salin", fr: "Copier", ar: "نسخ" },
  "invite.direct": { zh: "直推", "zh-TW": "直推", en: "Direct", ko: "직접", ja: "直接", vi: "Trực tiếp", th: "ตรง", id: "Langsung", ms: "Langsung", fr: "Direct", ar: "مباشر" },
  "invite.indirect": { zh: "间推", "zh-TW": "間推", en: "Indirect", ko: "간접", ja: "間接", vi: "Gián tiếp", th: "ทางอ้อม", id: "Tidak langsung", ms: "Tidak langsung", fr: "Indirect", ar: "غير مباشر" },
  "invite.current_level": { zh: "当前等级", "zh-TW": "當前等級", en: "Current Level", ko: "현재 등급", ja: "現在のレベル", vi: "Cấp hiện tại", th: "ระดับปัจจุบัน", id: "Level Saat Ini", ms: "Tahap Semasa", fr: "Niveau actuel", ar: "المستوى الحالي" },
  "invite.active_accounts": { zh: "有效账户", "zh-TW": "有效帳戶", en: "Active Accounts", ko: "활성 계정", ja: "有効アカウント", vi: "Tài khoản hoạt động", th: "บัญชีที่ใช้งาน", id: "Akun Aktif", ms: "Akaun Aktif", fr: "Comptes actifs", ar: "الحسابات النشطة" },
  "invite.team_performance": { zh: "团队总业绩", "zh-TW": "團隊總業績", en: "Total Team Performance", ko: "팀 총 실적", ja: "チーム総実績", vi: "Tổng hiệu suất đội", th: "ผลงานรวมของทีม", id: "Total Kinerja Tim", ms: "Jumlah Prestasi Pasukan", fr: "Performance totale de l'équipe", ar: "إجمالي أداء الفريق" },
  "invite.rewards": { zh: "奖励", "zh-TW": "獎勵", en: "Rewards", ko: "보상", ja: "報酬", vi: "Phần thưởng", th: "รางวัล", id: "Hadiah", ms: "Ganjaran", fr: "Récompenses", ar: "المكافآت" },
  "invite.tab_referrals": { zh: "推荐", "zh-TW": "推薦", en: "Referrals", ko: "추천", ja: "紹介", vi: "Giới thiệu", th: "การแนะนำ", id: "Referral", ms: "Rujukan", fr: "Parrainages", ar: "الإحالات" },
  "invite.tab_team": { zh: "团队", "zh-TW": "團隊", en: "Team", ko: "팀", ja: "チーム", vi: "Đội nhóm", th: "ทีม", id: "Tim", ms: "Pasukan", fr: "Équipe", ar: "الفريق" },
  "invite.tab_rewards": { zh: "奖励明细", "zh-TW": "獎勵明細", en: "Reward Details", ko: "보상 내역", ja: "報酬明細", vi: "Chi tiết thưởng", th: "รายละเอียดรางวัล", id: "Detail Hadiah", ms: "Butiran Ganjaran", fr: "Détails des récompenses", ar: "تفاصيل المكافآت" },
  "invite.tab_levels": { zh: "等级制度", "zh-TW": "等級制度", en: "Level System", ko: "등급 시스템", ja: "レベル制度", vi: "Hệ thống cấp bậc", th: "ระบบระดับ", id: "Sistem Level", ms: "Sistem Tahap", fr: "Système de niveaux", ar: "نظام المستويات" },
  "invite.direct_members": { zh: "直推会员", "zh-TW": "直推會員", en: "Direct Members", ko: "직접 추천 회원", ja: "直接紹介メンバー", vi: "Thành viên trực tiếp", th: "สมาชิกแนะนำตรง", id: "Anggota Langsung", ms: "Ahli Langsung", fr: "Membres directs", ar: "الأعضاء المباشرون" },
  "invite.indirect_members": { zh: "间推会员", "zh-TW": "間推會員", en: "Indirect Members", ko: "간접 추천 회원", ja: "間接紹介メンバー", vi: "Thành viên gián tiếp", th: "สมาชิกแนะนำทางอ้อม", id: "Anggota Tidak Langsung", ms: "Ahli Tidak Langsung", fr: "Membres indirects", ar: "الأعضاء غير المباشرين" },
  "invite.no_direct": { zh: "暂无直推会员", "zh-TW": "暫無直推會員", en: "No direct members yet", ko: "직접 추천 회원 없음", ja: "直接紹介メンバーなし", vi: "Chưa có thành viên trực tiếp", th: "ยังไม่มีสมาชิกแนะนำตรง", id: "Belum ada anggota langsung", ms: "Belum ada ahli langsung", fr: "Pas encore de membres directs", ar: "لا يوجد أعضاء مباشرون بعد" },
  "invite.no_indirect": { zh: "暂无间推会员", "zh-TW": "暫無間推會員", en: "No indirect members yet", ko: "간접 추천 회원 없음", ja: "間接紹介メンバーなし", vi: "Chưa có thành viên gián tiếp", th: "ยังไม่มีสมาชิกแนะนำทางอ้อม", id: "Belum ada anggota tidak langsung", ms: "Belum ada ahli tidak langsung", fr: "Pas encore de membres indirects", ar: "لا يوجد أعضاء غير مباشرين بعد" },
  "invite.share_link": { zh: "分享推荐链接邀请好友加入", "zh-TW": "分享推薦鏈接邀請好友加入", en: "Share your referral link to invite friends", ko: "추천 링크를 공유하여 친구를 초대하세요", ja: "招待リンクを共有して友達を招待", vi: "Chia sẻ liên kết giới thiệu để mời bạn bè", th: "แชร์ลิงค์แนะนำเพื่อเชิญเพื่อน", id: "Bagikan link referral untuk mengundang teman", ms: "Kongsi pautan rujukan untuk menjemput rakan", fr: "Partagez votre lien pour inviter des amis", ar: "شارك رابط الإحالة لدعوة الأصدقاء" },
  "invite.indirect_appear": { zh: "直推会员邀请的好友将出现在这里", "zh-TW": "直推會員邀請的好友將出現在這裡", en: "Friends invited by your direct members appear here", ko: "직접 추천 회원이 초대한 친구가 여기에 표시됩니다", ja: "直接紹介メンバーが招待した友達がここに表示されます", vi: "Bạn bè được mời bởi thành viên trực tiếp sẽ xuất hiện ở đây", th: "เพื่อนที่เชิญโดยสมาชิกแนะนำตรงจะปรากฏที่นี่", id: "Teman yang diundang oleh anggota langsung Anda muncul di sini", ms: "Rakan yang dijemput oleh ahli langsung anda akan muncul di sini", fr: "Les amis invités par vos membres directs apparaissent ici", ar: "الأصدقاء الذين دعاهم أعضاؤك المباشرون يظهرون هنا" },
  "invite.need_invest_first": { zh: "需要先投资才能邀请", "zh-TW": "需要先投資才能邀請", en: "Must invest before inviting", ko: "초대 전에 먼저 투자해야 합니다", ja: "招待する前に投資が必要です", vi: "Cần đầu tư trước khi mời", th: "ต้องลงทุนก่อนจึงจะเชิญได้", id: "Harus berinvestasi sebelum mengundang", ms: "Mesti melabur sebelum menjemput", fr: "Doit investir avant d'inviter", ar: "يجب الاستثمار قبل الدعوة" },
  "invite.link_copied": { zh: "推荐链接已复制", "zh-TW": "推薦鏈接已複製", en: "Referral link copied", ko: "추천 링크가 복사되었습니다", ja: "招待リンクがコピーされました", vi: "Đã sao chép liên kết giới thiệu", th: "คัดลอกลิงค์แนะนำแล้ว", id: "Link referral disalin", ms: "Pautan rujukan disalin", fr: "Lien de parrainage copié", ar: "تم نسخ رابط الإحالة" },
  "invite.staking": { zh: "质押中", "zh-TW": "質押中", en: "Staking", ko: "스테이킹", ja: "ステーキング中", vi: "Đang stake", th: "กำลัง Stake", id: "Staking", ms: "Staking", fr: "En staking", ar: "تخزين" },
  "invite.joined": { zh: "加入", "zh-TW": "加入", en: "Joined", ko: "가입", ja: "参加", vi: "Đã tham gia", th: "เข้าร่วม", id: "Bergabung", ms: "Menyertai", fr: "Rejoint", ar: "انضم" },
  "invite.view_downline": { zh: "查看下线", "zh-TW": "查看下線", en: "View Downline", ko: "하위 회원 보기", ja: "ダウンラインを見る", vi: "Xem tuyến dưới", th: "ดูสายล่าง", id: "Lihat Downline", ms: "Lihat Downline", fr: "Voir les filleuls", ar: "عرض المستوى الأدنى" },
  "invite.persons": { zh: "人", "zh-TW": "人", en: "members", ko: "명", ja: "人", vi: "người", th: "คน", id: "orang", ms: "orang", fr: "personnes", ar: "أعضاء" },
  "invite.back": { zh: "返回上级", "zh-TW": "返回上級", en: "Go Back", ko: "상위로 돌아가기", ja: "上位に戻る", vi: "Quay lại", th: "กลับ", id: "Kembali", ms: "Kembali", fr: "Retour", ar: "رجوع" },
  "invite.my_direct": { zh: "我的直推", "zh-TW": "我的直推", en: "My Direct Referrals", ko: "내 직접 추천", ja: "マイ直接紹介", vi: "Giới thiệu trực tiếp của tôi", th: "แนะนำตรงของฉัน", id: "Referral Langsung Saya", ms: "Rujukan Langsung Saya", fr: "Mes parrainages directs", ar: "إحالاتي المباشرة" },
  "invite.search_address": { zh: "搜索地址...", "zh-TW": "搜索地址...", en: "Search address...", ko: "주소 검색...", ja: "アドレスを検索...", vi: "Tìm địa chỉ...", th: "ค้นหาที่อยู่...", id: "Cari alamat...", ms: "Cari alamat...", fr: "Rechercher une adresse...", ar: "بحث عن عنوان..." },
  "invite.all_levels": { zh: "全部等级", "zh-TW": "全部等級", en: "All Levels", ko: "모든 등급", ja: "全レベル", vi: "Tất cả cấp", th: "ทุกระดับ", id: "Semua Level", ms: "Semua Tahap", fr: "Tous les niveaux", ar: "جميع المستويات" },
  "invite.no_direct_downline": { zh: "该会员暂无直推下线", "zh-TW": "該會員暫無直推下線", en: "No direct referrals for this member", ko: "이 회원의 직접 추천 없음", ja: "このメンバーの直接紹介なし", vi: "Thành viên này chưa có tuyến dưới trực tiếp", th: "สมาชิกนี้ยังไม่มีสายล่างตรง", id: "Anggota ini belum memiliki downline langsung", ms: "Ahli ini belum mempunyai downline langsung", fr: "Pas de filleuls directs pour ce membre", ar: "لا إحالات مباشرة لهذا العضو" },
  "invite.no_match": { zh: "没有匹配的会员", "zh-TW": "沒有匹配的會員", en: "No matching members", ko: "일치하는 회원 없음", ja: "一致するメンバーなし", vi: "Không có thành viên phù hợp", th: "ไม่มีสมาชิกที่ตรงกัน", id: "Tidak ada anggota yang cocok", ms: "Tiada ahli yang sepadan", fr: "Aucun membre correspondant", ar: "لا يوجد أعضاء مطابقون" },
  "invite.total_members": { zh: "共{count}位会员", "zh-TW": "共{count}位會員", en: "{count} members total", ko: "총 {count}명 회원", ja: "合計{count}メンバー", vi: "Tổng {count} thành viên", th: "สมาชิกทั้งหมด {count} คน", id: "Total {count} anggota", ms: "Jumlah {count} ahli", fr: "{count} membres au total", ar: "إجمالي {count} عضو" },
  "invite.filtered_from": { zh: "筛选自{total}位", "zh-TW": "篩選自{total}位", en: "filtered from {total}", ko: "{total}명에서 필터링", ja: "{total}からフィルタ", vi: "lọc từ {total}", th: "กรองจาก {total}", id: "difilter dari {total}", ms: "ditapis dari {total}", fr: "filtré de {total}", ar: "تمت التصفية من {total}" },
  "invite.no_team_bonus": { zh: "暂无团队奖励", "zh-TW": "暫無團隊獎勵", en: "No team bonuses yet", ko: "팀 보너스 없음", ja: "チームボーナスなし", vi: "Chưa có thưởng đội nhóm", th: "ยังไม่มีโบนัสทีม", id: "Belum ada bonus tim", ms: "Belum ada bonus pasukan", fr: "Pas encore de bonus d'équipe", ar: "لا مكافآت فريق بعد" },
  "invite.team_bonus_unlock": { zh: "达到V1以上等级后可获得团队奖励", "zh-TW": "達到V1以上等級後可獲得團隊獎勵", en: "Reach V1 or above to earn team bonuses", ko: "V1 이상 등급 달성 시 팀 보너스 획득", ja: "V1以上のレベルに達するとチームボーナスを獲得", vi: "Đạt V1 trở lên để nhận thưởng đội nhóm", th: "ถึงระดับ V1 ขึ้นไปเพื่อรับโบนัสทีม", id: "Capai V1 atau lebih untuk mendapatkan bonus tim", ms: "Capai V1 atau lebih untuk mendapat bonus pasukan", fr: "Atteignez V1 ou plus pour gagner des bonus d'équipe", ar: "حقق V1 أو أعلى للحصول على مكافآت الفريق" },
  "invite.date": { zh: "日期", "zh-TW": "日期", en: "Date", ko: "날짜", ja: "日付", vi: "Ngày", th: "วันที่", id: "Tanggal", ms: "Tarikh", fr: "Date", ar: "التاريخ" },
  "invite.performance": { zh: "业绩", "zh-TW": "業績", en: "Performance", ko: "실적", ja: "実績", vi: "Hiệu suất", th: "ผลงาน", id: "Kinerja", ms: "Prestasi", fr: "Performance", ar: "الأداء" },
  "invite.max_rate": { zh: "最高利率", "zh-TW": "最高利率", en: "Max Rate", ko: "최대 이율", ja: "最高利率", vi: "Lãi suất tối đa", th: "อัตราสูงสุด", id: "Tarif Maks", ms: "Kadar Maks", fr: "Taux max", ar: "أقصى معدل" },
  "invite.no_reward_records": { zh: "暂无奖励记录", "zh-TW": "暫無獎勵記錄", en: "No reward records", ko: "보상 기록 없음", ja: "報酬記録なし", vi: "Chưa có bản ghi thưởng", th: "ไม่มีบันทึกรางวัล", id: "Belum ada catatan hadiah", ms: "Tiada rekod ganjaran", fr: "Aucun enregistrement de récompense", ar: "لا توجد سجلات مكافآت" },
  "invite.direct_reward": { zh: "直推奖励", "zh-TW": "直推獎勵", en: "Direct Reward", ko: "직접 보상", ja: "直接紹介報酬", vi: "Thưởng trực tiếp", th: "โบนัสแนะนำตรง", id: "Bonus Langsung", ms: "Bonus Langsung", fr: "Récompense directe", ar: "مكافأة مباشرة" },
  "invite.equal_reward": { zh: "同级奖励", "zh-TW": "同級獎勵", en: "Equal-Level Reward", ko: "동급 보상", ja: "同レベル報酬", vi: "Thưởng ngang cấp", th: "โบนัสระดับเท่า", id: "Bonus Level Setara", ms: "Bonus Tahap Sama", fr: "Récompense de niveau égal", ar: "مكافأة المستوى المتساوي" },
  "invite.indirect_reward": { zh: "间推奖励", "zh-TW": "間推獎勵", en: "Indirect Reward", ko: "간접 보상", ja: "間接紹介報酬", vi: "Thưởng gián tiếp", th: "โบนัสแนะนำทางอ้อม", id: "Bonus Tidak Langsung", ms: "Bonus Tidak Langsung", fr: "Récompense indirecte", ar: "مكافأة غير مباشرة" },
  "invite.source_account": { zh: "来源账户", "zh-TW": "來源帳戶", en: "Source Account", ko: "출처 계정", ja: "ソースアカウント", vi: "Tài khoản nguồn", th: "บัญชีต้นทาง", id: "Akun Sumber", ms: "Akaun Sumber", fr: "Compte source", ar: "الحساب المصدر" },
  "invite.source_product": { zh: "来源配套", "zh-TW": "來源配套", en: "Source Product", ko: "출처 상품", ja: "ソース商品", vi: "Sản phẩm nguồn", th: "สินค้าต้นทาง", id: "Produk Sumber", ms: "Produk Sumber", fr: "Produit source", ar: "المنتج المصدر" },
  "invite.product_amount": { zh: "配套金额", "zh-TW": "配套金額", en: "Product Amount", ko: "상품 금액", ja: "商品金額", vi: "Số tiền sản phẩm", th: "จำนวนเงินสินค้า", id: "Jumlah Produk", ms: "Jumlah Produk", fr: "Montant du produit", ar: "مبلغ المنتج" },
  "invite.time": { zh: "时间", "zh-TW": "時間", en: "Time", ko: "시간", ja: "時間", vi: "Thời gian", th: "เวลา", id: "Waktu", ms: "Masa", fr: "Heure", ar: "الوقت" },
  "invite.member_v": { zh: "会员 V", "zh-TW": "會員 V", en: "Member V", ko: "회원 V", ja: "メンバー V", vi: "Thành viên V", th: "สมาชิก V", id: "Anggota V", ms: "Ahli V", fr: "Membre V", ar: "عضو V" },
  "invite.team_bonus_rate": { zh: "团队奖励比例", "zh-TW": "團隊獎勵比例", en: "Team Bonus Rate", ko: "팀 보너스 비율", ja: "チームボーナス率", vi: "Tỷ lệ thưởng đội", th: "อัตราโบนัสทีม", id: "Tarif Bonus Tim", ms: "Kadar Bonus Pasukan", fr: "Taux de bonus d'équipe", ar: "معدل مكافأة الفريق" },
  "invite.requirement": { zh: "下级要求", "zh-TW": "下級要求", en: "Requirements", ko: "하위 요건", ja: "下位要件", vi: "Yêu cầu cấp dưới", th: "ข้อกำหนดสายล่าง", id: "Persyaratan", ms: "Keperluan", fr: "Exigences", ar: "المتطلبات" },
  "invite.team_formula": { zh: "团队奖励公式", "zh-TW": "團隊獎勵公式", en: "Team Bonus Formula", ko: "팀 보너스 공식", ja: "チームボーナス計算式", vi: "Công thức thưởng đội", th: "สูตรโบนัสทีม", id: "Rumus Bonus Tim", ms: "Formula Bonus Pasukan", fr: "Formule de bonus d'équipe", ar: "معادلة مكافأة الفريق" },
  "invite.team_formula_desc": { zh: "团队总业绩 x 个人最高日利率 x 等级%", "zh-TW": "團隊總業績 x 個人最高日利率 x 等級%", en: "Team Performance × Max Daily Rate × Level %", ko: "팀 총 실적 × 최대 일일 이율 × 등급%", ja: "チーム総実績 × 最高日利率 × レベル%", vi: "Hiệu suất đội × Lãi suất ngày tối đa × Cấp%", th: "ผลงานทีม × อัตราสูงสุดรายวัน × ระดับ%", id: "Kinerja Tim × Tarif Harian Maks × Level%", ms: "Prestasi Pasukan × Kadar Harian Maks × Tahap%", fr: "Performance équipe × Taux quotidien max × Niveau%", ar: "أداء الفريق × أقصى معدل يومي × المستوى%" },
  "invite.equal_bonus": { zh: "同级奖励", "zh-TW": "同級獎勵", en: "Equal-Level Bonus", ko: "동급 보너스", ja: "同レベルボーナス", vi: "Thưởng ngang cấp", th: "โบนัสระดับเท่า", id: "Bonus Level Setara", ms: "Bonus Tahap Sama", fr: "Bonus de niveau égal", ar: "مكافأة المستوى المتساوي" },
  "invite.equal_bonus_desc": { zh: "推荐线上遇到同等级领导，可拿其团队奖励的10%，逐层递减，最多5层。", "zh-TW": "推薦線上遇到同等級領導，可拿其團隊獎勵的10%，逐層遞減，最多5層。", en: "When encountering same-level leaders in your referral chain, earn 10% of their team bonus, decreasing per layer, up to 5 layers.", ko: "추천 라인에서 같은 등급의 리더를 만나면 그 팀 보너스의 10%를 받으며, 레이어당 감소, 최대 5레이어.", ja: "紹介ラインで同レベルリーダーに遭遇した場合、そのチームボーナスの10%を獲得、層ごとに逓減、最大5層。", vi: "Khi gặp lãnh đạo cùng cấp trong chuỗi giới thiệu, nhận 10% thưởng đội của họ, giảm dần theo tầng, tối đa 5 tầng.", th: "เมื่อพบผู้นำระดับเดียวกันในสายแนะนำ จะได้รับ 10% ของโบนัสทีม ลดลงตามชั้น สูงสุด 5 ชั้น", id: "Saat bertemu pemimpin level sama di rantai referral, dapatkan 10% dari bonus tim mereka, berkurang per lapisan, maks 5 lapisan.", ms: "Apabila bertemu pemimpin tahap sama dalam rantai rujukan, peroleh 10% bonus pasukan mereka, berkurang setiap lapisan, maks 5 lapisan.", fr: "En rencontrant des leaders de même niveau dans votre chaîne de parrainage, gagnez 10% de leur bonus d'équipe, décroissant par couche, jusqu'à 5 couches.", ar: "عند مقابلة قادة من نفس المستوى في سلسلة الإحالة، احصل على 10% من مكافأة فريقهم، تتناقص لكل طبقة، حتى 5 طبقات." },
};

export function t(key: string, lang?: Lang, vars?: Record<string, string | number>): string {
  const l = lang || getLang();
  // zh-TW falls back to zh, other languages fall back to en then zh
  let text = translations[key]?.[l]
    || (l === "zh-TW" ? translations[key]?.["zh"] : translations[key]?.["en"])
    || translations[key]?.["zh"]
    || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

export function shortAddr(addr: string): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
