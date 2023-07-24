const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle", async function () {
      let vrfCoordinatorV2Mock, raffle, raffleEntranceFee, deployer, interval;
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        raffle = await ethers.getContract("Raffle", deployer);
        vrfCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        );
        raffleEntranceFee =
          networkConfig[network.config.chainId]["entranceFee"];

        interval = await raffle.getInterval();
      });

      describe("Constructor", async function () {
        it("should be correctly initialized", async function () {
          const raffleState = await raffle.getRaffleStatus();
          const interval = await raffle.getInterval();
          assert.equal(raffleState.toString(), "0");
          assert.equal(
            interval.toString(),
            networkConfig[network.config.chainId]["interval"]
          );
        });
      });

      describe("Raffle Testcase", async function () {
        it("should not allow to enter raffle if dont pay sufficient amount", async function () {
          await expect(raffle.enterRaffle()).to.be.revertedWith(
            "Raffle__NotEnoughETHToPlayLottery"
          );
        });

        it("should record in the players list", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          const players = await raffle.getPlayer(0);
          assert.equal(players, deployer);
        });

        it("should emit the event when enter in the raffle", async function () {
          await expect(
            raffle.enterRaffle({ value: raffleEntranceFee })
          ).to.emit(raffle, "EnterRaffle");
        });

        it("should not allow to enter raffle when it is calculating", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          // Prevent to be chainlink keeper
          await raffle.performUpkeep([]);

          await expect(
            raffle.enterRaffle({ value: raffleEntranceFee })
          ).to.be.revertedWith("Raffle__NotOpen");
        });
      });

      describe("CheckUpKeep", async function () {
        it("should return false if people have not send the ETH", async function () {
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
          assert(!upkeepNeeded);
        });

        it("should return false if raffle is not open", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await raffle.performUpkeep([]);
          const raffleState = await raffle.getRaffleStatus();
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
          assert.equal(raffleState, "1");
          assert(!upkeepNeeded);
        });

        it("should return false if interval is not passed", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() - 10,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
          assert(!upkeepNeeded);
        });

        it("should return true if interval is passed && has balance && Raffle is Open,Atleast One Player", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee }); // Enter the rafffle
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]); //Increase the time
          await network.provider.send("evm_mine", []); // mine the block
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
          assert(upkeepNeeded);
        });
      });

      describe("PerformUpKeep", async function () {
        it("should only run if checkUpkeep is true", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const tx = await raffle.performUpkeep([]);
          assert(tx);
        });

        it("should revert if isUpKeedNeed is false", async function () {
          await expect(await raffle.performUpkeep([])).to.be.revertedWith(
            "Raffle__UpkeepNotNeeded"
          );
        });

        it("should updated the raffle state and emit the RequestedRaffleId Event", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const transactionResponse = await raffle.performUpkeep([]);
          const transactionRecipt = await transactionResponse.wait(1);
          const raffleState = await raffle.getRaffleStatus();
          assert.equal(raffleState, "1");
          const requestId = transactionRecipt.events[1].args.requestId;
          assert(requestId > 0);
        });
      });
    });
