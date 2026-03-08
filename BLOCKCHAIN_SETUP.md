# Blockchain Backend – Deploy & Test (PowerShell)

## 1. Hardhat v2 environment

- **Hardhat**: `^2.22.3` (v2)
- **ethers**: v5 (`@nomiclabs/hardhat-ethers` + `ethers`)
- Config: `hardhat.config.cjs` (CommonJS for ESM projects)
- Contracts use OpenZeppelin and SafeERC20 for USDC.

**Compile:**

```powershell
cd C:\Users\User\Documents\Blockchain_stuff\square-blockchain
npm run compile
```

Or:
 
```powershell
npx hardhat compile
```

---

## 2. .env

Copy `.env.example` to `.env` and set:

- `PRIVATE_KEY` – deployer (and test buyer) wallet.
- `RPC_URL` – Polygon Amoy RPC (e.g. `https://rpc-amoy.polygon.technology`).
- `USDC_ADDRESS` – Polygon Amoy USDC, e.g. `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582`.
- `TREASURY_ADDRESS` – your treasury wallet (receives platform fee).
- After deploy: set `ESCROW_ADDRESS` to the deployed contract.
- For `test-escrow`: set `MERCHANT_PRIVATE_KEY` (second test wallet).

**Never commit `.env` or real private keys.**

---

## 3. Deploy MerchantEscrow to Polygon Amoy

```powershell
cd C:\Users\User\Documents\Blockchain_stuff\square-blockchain
npm run deploy
```

Or:

```powershell
npx hardhat run scripts/deploy.cjs --network polygonAmoy
```

- Requires: `PRIVATE_KEY`, `RPC_URL`, `USDC_ADDRESS`, `TREASURY_ADDRESS` in `.env`.
- Copy the printed **MerchantEscrow** address into `.env` as `ESCROW_ADDRESS`.

---

## 4. Test: USDC approve → escrow → release

Uses 1 USDC: buyer approves, creates payment to merchant, merchant releases.

**Prerequisites:**

- Deployer (buyer) has test USDC on Polygon Amoy.
- `.env` has `ESCROW_ADDRESS`, `USDC_ADDRESS`, `MERCHANT_PRIVATE_KEY` (merchant = second wallet).

**Run:**

```powershell
npm run test:escrow
```

Or:

```powershell
npx hardhat run scripts/test-escrow.cjs --network polygonAmoy
```

Flow:

1. **Approve** – buyer approves escrow to spend 1 USDC.
2. **createPayment** – buyer creates order for merchant (1 USDC).
3. **releasePayment** – merchant calls release; receives amount minus 1% fee; treasury gets fee.

---

## 5. Connect to React Native wallet app (later)

- **Contract**: use `ESCROW_ADDRESS` and the same ABI (from `artifacts/contracts/MerchantEscrow.sol/MerchantEscrow.json`).
- **RPC**: same Polygon Amoy RPC (or your own).
- **Non-custodial**: private keys stay on device (e.g. Expo SecureStore); app only signs via ethers.js / wagmi / viem.
- **Actions**: USDC `approve(escrow, amount)` then `escrow.createPayment(merchantAddress, amount)`; merchant app calls `escrow.releasePayment(orderId)`.

---

## Quick reference

| Task        | Command |
|------------|---------|
| Compile    | `npm run compile` |
| Deploy     | `npm run deploy`   |
| Test escrow| `npm run test:escrow` |
