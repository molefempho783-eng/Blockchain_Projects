// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * Minimal ERC20 for local testing only. Do not deploy to mainnet.
 */
contract MockERC20 is ERC20 {
    uint8 private _decimals;

    constructor(uint256 initialSupply) ERC20("Mock USDC", "USDC") {
        _decimals = 6;
        _mint(msg.sender, initialSupply);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}
