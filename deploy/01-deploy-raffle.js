const { network, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../helper-hardhat-config");

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { log, deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  let vrfV2CoordinatorAddress, subscriptionId, vrfcoordinatorV2Mock;

  const VRF_FUND_AMOUNT = ethers.utils.parseEther("1");

  // Check if deployment on development chains
  if (developmentChains.includes(network.name)) {
    // Deploy the mocks
    vrfcoordinatorV2Mock = await ethers.getContract(
      "VRFCoordinatorV2Mock",
      deployer
    );

    vrfV2CoordinatorAddress = vrfcoordinatorV2Mock.address;

    const transactionResponse = await vrfcoordinatorV2Mock.createSubscription();
    const transactionRecipt = await transactionResponse.wait(1);
    subscriptionId = transactionRecipt.events[0].args.subId;

    await vrfcoordinatorV2Mock.fundSubscription(
      subscriptionId,
      VRF_FUND_AMOUNT
    );
  } else {
    vrfV2CoordinatorAddress = networkConfig[chainId]["vrfV2Coordinator"];
    subscriptionId = networkConfig[chainId]["subscriptionId"];
  }
  const ENTRANCE_FEE = networkConfig[chainId]["entranceFee"];
  const GAS_LANE = networkConfig[chainId]["gasLane"];
  const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
  const interval = networkConfig[chainId]["interval"];

  const args = [
    vrfV2CoordinatorAddress,
    ENTRANCE_FEE,
    GAS_LANE,
    subscriptionId,
    callbackGasLimit,
    interval,
  ];

  const raffle = await deploy("Raffle", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  if (developmentChains.includes(network.name)) {
    const vrfCoordinatorV2Mock = await ethers.getContract(
      "VRFCoordinatorV2Mock"
    );
    await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address);
  }

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log("Verifying...");
    await verify(raffle.address, args);
  }

  log("Enter lottery with command:");
  const networkName = network.name == "hardhat" ? "localhost" : network.name;
  log(`yarn hardhat run scripts/enterRaffle.js --network ${networkName}`);
  log("----------------------------------------------------");
};
module.exports.tags = ["all", "raffle"];
