const { ethers } = require("hardhat");

const networkConfig = {
  31337: {
    name: "localhost",
    vrfV2Coordinator: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
    entranceFee: ethers.utils.parseEther("0.25"),
    gasLane:
      "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
    subscriptionId: "0",
    callbackGasLimit: "500000",
    interval: "30",
  },
  5: {
    name: "goreli",
    vrfV2Coordinator: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
    entranceFee: ethers.utils.parseEther("0.25"),
    gasLane:
      "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
    subscriptionId: "0",
    callbackGasLimit: "500000",
    interval: "30",
  },
  11155111: {
    name: "sepolia",
    vrfV2Coordinator: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
    entranceFee: ethers.utils.parseEther("0.25"),
    gasLane:
      "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
    subscriptionId: "3906",
    callbackGasLimit: "500000",
    interval: "30",
  },
  80001: {
    name: "mumbai",
    vrfV2Coordinator: "0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed",
    entranceFee: ethers.utils.parseEther("0.0005"),
    gasLane:
      "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f",
    subscriptionId: "0",
    callbackGasLimit: "500000",
    interval: "30",
  },
};

const developmentChains = ["localhost", "hardhat"];

module.exports = { networkConfig, developmentChains };
