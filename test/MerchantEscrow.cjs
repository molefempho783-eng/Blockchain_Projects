/**
 * Hardhat tests for MerchantEscrow (run: npm test)
 * Uses local Hardhat network - no .env or testnet needed.
 */
const { expect } = require("chai");
const { ethers } = require("hardhat");

const USDC_DECIMALS = 6;
const parseUSDC = (n) => ethers.utils.parseUnits(String(n), USDC_DECIMALS);
const PLATFORM_FEE_BPS = 100; // 1%

describe("MerchantEscrow", function () {
  let escrow, token, treasury;
  let owner, buyer, merchant;

  beforeEach(async function () {
    [owner, buyer, merchant, treasury] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy(parseUSDC("1000000"));
    await token.deployed();
    await token.transfer(buyer.address, parseUSDC("1000"));

    const MerchantEscrow = await ethers.getContractFactory("MerchantEscrow");
    escrow = await MerchantEscrow.deploy(token.address, treasury.address);
    await escrow.deployed();
  });

  describe("createPayment", function () {
    it("should pull USDC and create order", async function () {
      const amount = parseUSDC("100");
      await token.connect(buyer).approve(escrow.address, amount);

      const tx = await escrow.connect(buyer).createPayment(merchant.address, amount);
      const receipt = await tx.wait();

      const event = receipt.events.find((e) => e.event === "PaymentCreated");
      expect(event).to.not.be.undefined;
      expect(event.args.orderId.toString()).to.equal("1");
      expect(event.args.buyer).to.equal(buyer.address);
      expect(event.args.merchant).to.equal(merchant.address);
      expect(event.args.amount.eq(amount)).to.equal(true);

      expect((await escrow.orderCounter()).toString()).to.equal("1");
      const order = await escrow.orders(1);
      expect(order.buyer).to.equal(buyer.address);
      expect(order.merchant).to.equal(merchant.address);
      expect(order.amount.eq(amount)).to.equal(true);
      expect(order.released).to.equal(false);
      expect((await token.balanceOf(escrow.address)).toString()).to.equal(amount.toString());
    });

    it("should revert if insufficient allowance", async function () {
      let reverted = false;
      try {
        await escrow.connect(buyer).createPayment(merchant.address, parseUSDC("100"));
      } catch (e) {
        reverted = true;
      }
      expect(reverted).to.equal(true);
    });
  });

  describe("releasePayment", function () {
    it("should send merchant amount and fee to treasury", async function () {
      const amount = parseUSDC("100");
      await token.connect(buyer).approve(escrow.address, amount);
      await escrow.connect(buyer).createPayment(merchant.address, amount);

      const fee = amount.mul(PLATFORM_FEE_BPS).div(10000);
      const merchantAmount = amount.sub(fee);

      const tx = await escrow.connect(merchant).releasePayment(1);
      const receipt = await tx.wait();

      const event = receipt.events.find((e) => e.event === "PaymentReleased");
      expect(event).to.not.be.undefined;
      expect(event.args.orderId.toString()).to.equal("1");
      expect(event.args.merchant).to.equal(merchant.address);
      expect(event.args.merchantAmount.toString()).to.equal(merchantAmount.toString());
      expect(event.args.fee.toString()).to.equal(fee.toString());

      expect((await token.balanceOf(merchant.address)).toString()).to.equal(merchantAmount.toString());
      expect((await token.balanceOf(treasury.address)).toString()).to.equal(fee.toString());
      expect((await token.balanceOf(escrow.address)).toString()).to.equal("0");

      const order = await escrow.orders(1);
      expect(order.released).to.equal(true);
    });

    it("should revert if caller is not merchant", async function () {
      const amount = parseUSDC("100");
      await token.connect(buyer).approve(escrow.address, amount);
      await escrow.connect(buyer).createPayment(merchant.address, amount);

      let reverted = false;
      try {
        await escrow.connect(buyer).releasePayment(1);
      } catch (e) {
        reverted = true;
        expect(e.message).to.include("Only merchant");
      }
      expect(reverted).to.equal(true);
    });

    it("should revert if order does not exist", async function () {
      let reverted = false;
      try {
        await escrow.connect(merchant).releasePayment(999);
      } catch (e) {
        reverted = true;
        expect(e.message).to.include("Order does not exist");
      }
      expect(reverted).to.equal(true);
    });

    it("should revert if already released", async function () {
      const amount = parseUSDC("100");
      await token.connect(buyer).approve(escrow.address, amount);
      await escrow.connect(buyer).createPayment(merchant.address, amount);
      await escrow.connect(merchant).releasePayment(1);

      let reverted = false;
      try {
        await escrow.connect(merchant).releasePayment(1);
      } catch (e) {
        reverted = true;
        expect(e.message).to.include("Already released");
      }
      expect(reverted).to.equal(true);
    });
  });
});
