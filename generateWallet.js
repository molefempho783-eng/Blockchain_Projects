import { ethers } from "ethers";

// Generate random wallet
const wallet = ethers.Wallet.createRandom();

console.log("Wallet Address:", wallet.address);
console.log("Private Key:", wallet.privateKey);
console.log("Seed Phrase:", wallet.mnemonic.phrase);