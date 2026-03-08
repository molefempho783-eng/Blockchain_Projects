const hre = require("hardhat");

async function main() {
  const USDC_ADDRESS = process.env.USDC_ADDRESS;
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS;

  if (!USDC_ADDRESS || !TREASURY_ADDRESS) {
    throw new Error(
      "Set USDC_ADDRESS and TREASURY_ADDRESS in .env. " +
      "Polygon Amoy USDC (example): 0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582"
    );
  }

  const Escrow = await hre.ethers.getContractFactory("MerchantEscrow");
  const escrow = await Escrow.deploy(USDC_ADDRESS, TREASURY_ADDRESS);
  await escrow.deployed();

  console.log("MerchantEscrow deployed to:", escrow.address);
  console.log("USDC:", USDC_ADDRESS);
  console.log("Treasury:", TREASURY_ADDRESS);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
