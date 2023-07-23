// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";

error Raffle__NotEnoughETHToPlayLottery();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle__UpkeepNotNeeded(
    uint256 currentBalance,
    uint256 numOfPlayers,
    uint256 raffleStatus
);

/**
 * @title A Raffle Contract
 * @author  iamnayan1
 * @dev This contract implements the chainlink VRF & Automation for Randomness and Automation
 */

contract Raffle is VRFConsumerBaseV2, AutomationCompatible {
    /** Type Declaration */
    enum RaffleState {
        OPEN,
        CALCULATING
    }
    /** State Variables */
    uint256 private s_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinatorV2;
    bytes32 private immutable i_gasLane; //maximum price willing to pay for a request
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATION = 3; //number of confirmations to wait for chainlink node to respond
    uint32 private constant NUM_WORDS = 1;

    // Lottery Variables
    address private s_recentWinner;
    RaffleState private s_raffleState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    /**Events */
    event EnterRaffle(address indexed player);
    event RequestedRaffleId(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    constructor(
        address _vrfCoordinatorV2,
        uint256 _entranceFee,
        bytes32 _keyHash,
        uint64 _subscriptionId,
        uint32 _callbackGasLimit,
        uint256 _interval
    ) VRFConsumerBaseV2(_vrfCoordinatorV2) {
        s_entranceFee = _entranceFee;
        i_vrfCoordinatorV2 = VRFCoordinatorV2Interface(_vrfCoordinatorV2);
        i_gasLane = _keyHash;
        i_subscriptionId = _subscriptionId;
        i_callbackGasLimit = _callbackGasLimit;
        s_raffleState = RaffleState.OPEN;
        i_interval = _interval;
        s_lastTimeStamp = block.timestamp;
    }

    function enterRaffle() public payable {
        if (msg.value < s_entranceFee) {
            revert Raffle__NotEnoughETHToPlayLottery();
        }
        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__NotOpen();
        }
        s_players.push(payable(msg.sender));

        emit EnterRaffle(msg.sender);
    }

    /**
     *
     * @dev This function is called by Chainlink Keeper node
     * they check for `upkeepNeeded` to return true
     * Workflow
     * 1. Interval should be passed
     * 2. The lottery should have atleast one player and some ETH
     * 3. Our subscription should be funded with Link
     * 4. The lottery should be in `open state`
     *
     */

    function checkUpkeep(
        bytes calldata /* checkData*/
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory /* performData */)
    {
        bool isTimePassed = (block.timestamp - s_lastTimeStamp > i_interval);
        bool isAtleastOnePlayer = (s_players.length > 0);
        bool hasBalance = (address(this).balance > 0);
        bool isOpen = (s_raffleState == RaffleState.OPEN);

        upkeepNeeded = (isTimePassed &&
            isAtleastOnePlayer &&
            hasBalance &&
            isOpen);
    }

    // Keepers will call the requestRandomWinner Function
    function performUpkeep(bytes calldata /*performData*/) external override {
        (bool isUpkeepNeeded, ) = this.checkUpkeep("");

        if (!isUpkeepNeeded)
            revert Raffle__UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState)
            );
        // Request the random number
        s_raffleState = RaffleState.CALCULATING;
        uint256 requestId = i_vrfCoordinatorV2.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATION,
            i_callbackGasLimit,
            NUM_WORDS
        );

        emit RequestedRaffleId(requestId);
        // once we get it do something with it
        // 2 transaction process
    }

    function fulfillRandomWords(
        uint256 /*_requestId*/,
        uint256[] memory _randomWords
    ) internal override {
        uint256 indexOfWinner = _randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp;
        s_players = new address payable[](0);
        (bool ok, ) = recentWinner.call{value: address(this).balance}("");
        if (!ok) revert Raffle__TransferFailed();

        emit WinnerPicked(recentWinner);
    }

    //View Pure
    function getRecentWinner() external view returns (address) {
        return s_recentWinner;
    }

    function getTotalPlayers() external view returns (uint256) {
        return s_players.length;
    }

    function getPlayer(uint256 _index) external view returns (address) {
        return s_players[_index];
    }

    function getRaffleStatus() external view returns (RaffleState) {
        return s_raffleState;
    }

    function getInterval() external view returns (uint256) {
        return i_interval;
    }

    function getNumberOfWords() external pure returns (uint32) {
        return NUM_WORDS;
    }

    function getLastTimeStamp() external view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getEntranceFee() external view returns (uint256) {
        return s_entranceFee;
    }
}
