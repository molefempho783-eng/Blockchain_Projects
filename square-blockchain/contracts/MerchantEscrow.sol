// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MerchantEscrow is ReentrancyGuard {

    using SafeERC20 for IERC20;

    IERC20 public usdc;
    address public treasury;

    uint256 public platformFee = 100; // 1%

    struct Order {
        address buyer;
        address merchant;
        uint256 amount;
        bool released;
    }

    mapping(uint256 => Order) public orders;
    uint256 public orderCounter;

    event PaymentCreated(uint256 indexed orderId, address indexed buyer, address indexed merchant, uint256 amount);
    event PaymentReleased(uint256 indexed orderId, address indexed merchant, uint256 merchantAmount, uint256 fee);

    constructor(address _usdc, address _treasury) {
        usdc = IERC20(_usdc);
        treasury = _treasury;
    }

    function createPayment(address merchant, uint256 amount) external nonReentrant {
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        orderCounter++;

        orders[orderCounter] = Order(
            msg.sender,
            merchant,
            amount,
            false
        );

        emit PaymentCreated(orderCounter, msg.sender, merchant, amount);
    }

    function releasePayment(uint256 orderId) external nonReentrant {

        Order storage order = orders[orderId];

        require(order.buyer != address(0), "Order does not exist");
        require(msg.sender == order.merchant, "Only merchant");
        require(!order.released, "Already released");

        uint256 fee = (order.amount * platformFee) / 10000;
        uint256 merchantAmount = order.amount - fee;

        order.released = true;

        usdc.safeTransfer(order.merchant, merchantAmount);
        usdc.safeTransfer(treasury, fee);

        emit PaymentReleased(orderId, order.merchant, merchantAmount, fee);
    }
}