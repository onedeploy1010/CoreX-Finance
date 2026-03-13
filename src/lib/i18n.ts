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
