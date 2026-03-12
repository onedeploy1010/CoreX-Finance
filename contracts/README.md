# CoreX Finance Smart Contracts

## Contracts

### 1. FundDistributor
- Receives USDT and distributes to configured wallets by percentage
- Supports up to 20 recipient wallets
- Default: 3 wallets at 40%/30%/30%
- Owner can add/remove wallets and adjust percentages
- Only authorized contracts or owner can trigger distribution

### 2. CoreXInvestment
- Payment collection contract only (no yield calculation on-chain)
- User invests USDT -> forwards to FundDistributor -> distributes
- Emits `InvestmentCreated` event for backend callback
- Backend calculates: daily yield, direct referral (10%), indirect referral (5%), team bonus

### 3. CoreXWithdrawal
- Batch withdrawal contract for processing user withdrawals
- Minimum withdrawal: 30 USDT, must be multiples of 10 USDT
- Fee: 1 USDT per withdrawal (sent to fee collector)
- Operator-controlled batch processing (up to 100 per batch)
- Batch ID deduplication to prevent double-processing
- Pausable for emergency situations

## Deployment (thirdweb)

### Prerequisites
```bash
npm install -g @thirdweb-dev/cli
```

### 1. Deploy FundDistributor
```bash
cd contracts
npx thirdweb deploy -f FundDistributor.sol
```
Constructor: `_usdt` = `0x55d398326f99059fF775485246999027B3197955` (BSC USDT)

### 2. Deploy CoreXInvestment
```bash
npx thirdweb deploy -f CoreXInvestment.sol
```
Constructor:
- `_usdt` = `0x55d398326f99059fF775485246999027B3197955`
- `_fundDistributor` = FundDistributor address from step 1

### 3. Deploy CoreXWithdrawal
```bash
npx thirdweb deploy -f CoreXWithdrawal.sol
```
Constructor:
- `_usdt` = `0x55d398326f99059fF775485246999027B3197955`
- `_feeCollector` = Fee collection wallet address

### 4. Configure CoreXWithdrawal

**setOperator**: Authorize backend operator wallet
- `_operator`: Backend operator address
- `_authorized`: true

**deposit**: Fund the contract with USDT for withdrawals

### 5. Configure FundDistributor

**setAuthorizedCaller**: Authorize CoreXInvestment contract
- `caller`: CoreXInvestment address
- `authorized`: true

**setRecipients**: Set fund distribution (default 3 wallets, 40/30/30)
```
wallets: ["0xOpsWallet", "0xTechWallet", "0xReserveWallet"]
percentages: [4000, 3000, 3000]
labels: ["Operations", "Technology", "Reserve"]
```

### 6. Add Products to CoreXInvestment

Call `addProduct` for each:

| Product | minAmount (18 decimals) | maxAmount |
|---------|------------------------|-----------|
| CX Peak 01 | 200000000000000000000 | 0 |
| CX Flash 01 | 500000000000000000000 | 0 |
| CX Career 01 | 1000000000000000000000 | 0 |
| CX Pro 01 | 2000000000000000000000 | 0 |
| CX Elite 01 | 3000000000000000000000 | 0 |

### 7. Update Frontend Contract Addresses

Edit `src/lib/contracts.ts`:
```typescript
export const FUND_DISTRIBUTOR_ADDRESS = "0x...";
export const COREX_INVESTMENT_ADDRESS = "0x...";
export const COREX_WITHDRAWAL_ADDRESS = "0x...";
```

## Investment Flow

```
User selects product -> enters amount
  -> Frontend: approve USDT to CoreXInvestment
  -> Frontend: call CoreXInvestment.invest(productId, amount)
  -> Contract: USDT transfers user -> CoreXInvestment -> FundDistributor
  -> Contract: FundDistributor.distribute() splits to wallets
  -> Contract: emit InvestmentCreated event
  -> Frontend: send txHash to backend API
  -> Backend: create order, start daily yield calculation
  -> Backend: auto-calculate direct(10%), indirect(5%), team bonus
```

## Withdrawal Flow

```
User requests withdrawal (min 30 USDT, multiples of 10)
  -> Backend: validate amount, check balance, create pending withdrawal
  -> Admin/Cron: collect pending withdrawals into batch
  -> Backend: call CoreXWithdrawal.batchWithdraw(batchId, recipients, amounts)
  -> Contract: deduct 1 USDT fee per withdrawal
  -> Contract: transfer net amount to each recipient
  -> Contract: send total fees to fee collector
  -> Contract: emit WithdrawalProcessed + BatchProcessed events
  -> Backend: update withdrawal records as completed
```
