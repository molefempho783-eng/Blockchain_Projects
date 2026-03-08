/**
 * Test flow: USDC approve -> createPayment -> releasePayment
 * Requires .env: PRIVATE_KEY (buyer), MERCHANT_PRIVATE_KEY, ESCROW_ADDRESS, USDC_ADDRESS
 * Run after deploy: npm run test:escrow
 */
const hre = require("hardhat");
const { ethers } = hre;

const USDC_DECIMALS = 6;
const TEST_AMOUNT = ethers.utils.parseUnits("1", USDC_DECIMALS); // 1 USDC

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

async function main() {
  const escrowAddress = process.env.ESCROW_ADDRESS;
  const usdcAddress = process.env.USDC_ADDRESS;
  const merchantKey = process.env.MERCHANT_PRIVATE_KEY;

  if (!escrowAddress || !usdcAddress) {
    throw new Error("Set ESCROW_ADDRESS and USDC_ADDRESS in .env (from deploy output).");
  }
  if (!merchantKey) {
    throw new Error("Set MERCHANT_PRIVATE_KEY in .env (a second wallet; can be another test wallet).");
  }

  const [buyer] = await ethers.getSigners();
  const provider = ethers.provider;
  const merchantWallet = new ethers.Wallet(merchantKey, provider);
  const merchantAddress = merchantWallet.address;

  const escrow = await ethers.getContractAt("MerchantEscrow", escrowAddress);
  const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, buyer);

  console.log("Buyer:", buyer.address);
  console.log("Merchant:", merchantAddress);
  console.log("Escrow:", escrowAddress);
  console.log("Test amount: 1 USDC");

  const buyerBalanceBefore = await usdc.balanceOf(buyer.address);
  if (buyerBalanceBefore.lt(TEST_AMOUNT)) {
    throw new Error(`Buyer needs at least 1 USDC. Balance: ${ethers.utils.formatUnits(buyerBalanceBefore, USDC_DECIMALS)}`);
  }

  // 1) Approve escrow to spend USDC
  console.log("\n1) Approving USDC...");
  const approveTx = await usdc.approve(escrowAddress, TEST_AMOUNT);
  await approveTx.wait();
  console.log("   Approved.");

  // 2) Create payment (buyer -> escrow, order for merchant)
  console.log("\n2) Creating payment (createPayment)...");
  const createTx = await escrow.connect(buyer).createPayment(merchantAddress, TEST_AMOUNT);
  await createTx.wait();
  const orderId = await escrow.orderCounter();
  console.log("   Order ID:", orderId.toString());

  // 3) Merchant releases payment (gas overrides for Polygon Amoy minimum)
  console.log("\n3) Merchant releasing payment (releasePayment)...");
  const escrowAsMerchant = escrow.connect(merchantWallet);
  const releaseTx = await escrowAsMerchant.releasePayment(orderId, {
    maxPriorityFeePerGas: ethers.utils.parseUnits("30", "gwei"),
    maxFeePerGas: ethers.utils.parseUnits("50", "gwei"),
  });
  await releaseTx.wait();
  console.log("   Released.");

  const merchantBalance = await usdc.balanceOf(merchantAddress);
  console.log("\nMerchant USDC balance after:", ethers.utils.formatUnits(merchantBalance, USDC_DECIMALS), "USDC");
  console.log("Done. Escrow flow OK.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
