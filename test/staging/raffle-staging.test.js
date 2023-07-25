const { network, ethers, getNamedAccounts } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");
const { expect, assert } = require("chai");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle", async function () {
      let raffle, raffleEntranceFee, deployer;
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        raffle = await ethers.getContract("Raffle", deployer);
        raffleEntranceFee = await raffle.getEntranceFee();
      });

      describe("Raffle", async function () {
        it("should work with Chainlink VRF and Keepers and pick random winner", async function () {
          // Get the accounts
          const accounts = await ethers.getSigners();
          const getStartingTimeStamp = await raffle.getLastTimeStamp();
          console.log(`Setting up the event listeners...`);

          await new Promise(async (resolve, reject) => {
            raffle.once("WinnerPicked", async () => {
              console.log("WinnerPicked event fired!");
              try {
                const recentWinner = await raffle.getRecentWinner();
                const raffleState = await raffle.getRaffleStatus();
                const winnerEndingBalance = await accounts[0].getBalance();
                const endingTimeStamp = await raffle.getLastTimeStamp();

                await expect(raffle.getPlayer(0)).to.be.reverted;
                assert.equal(recentWinner.toString(), accounts[0].address);
                assert.equal(raffleState, 0);
                assert.equal(
                  winnerEndingBalance.toString(),
                  winnerStartingBalance.add(raffleEntranceFee).toString()
                );
                assert(endingTimeStamp > getStartingTimeStamp);
                resolve();
              } catch (error) {
                reject(error);
              }
            });
            console.log("Entering Raffle...");
            const tx = await raffle.enterRaffle({ value: raffleEntranceFee });
            await tx.wait(1);
            console.log("Ok, time to wait...");
            const winnerStartingBalance = await accounts[0].getBalance();
          });
        });
      });
    });
