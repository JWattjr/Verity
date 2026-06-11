// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC1155 } from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title ConditionalTokenVault
/// @notice ERC1155 vault that mints/burns YES+NO outcome tokens for prediction markets,
///         backed 1:1 by USDC collateral. One contract manages all markets.
contract ConditionalTokenVault is ERC1155 {
    using SafeERC20 for IERC20;

    // ─── State ───────────────────────────────────────────────────────────
    IERC20 public immutable USDC;
    address public admin;
    address public fpmm; // Authorized VerityFPMM contract
    address public factory; // Authorized VerityMarketFactory contract

    struct MarketOutcome {
        bool resolved;
        uint256 winningOutcomeIndex;
        uint256 totalCollateral; // Total USDC locked for this market
        uint256 outcomeCount;
    }

    mapping(bytes32 => MarketOutcome) public markets;

    // Track total supply per token ID (ERC1155 doesn't track this natively)
    mapping(uint256 => uint256) public totalSupply;

    // ─── Events ──────────────────────────────────────────────────────────
    event PairMinted(
        bytes32 indexed marketId,
        address indexed to,
        uint256 amount
    );
    event PairBurned(
        bytes32 indexed marketId,
        address indexed from,
        uint256 amount
    );
    event MarketResolved(bytes32 indexed marketId, bool winningIsYes);
    event WinningsRedeemed(
        bytes32 indexed marketId,
        address indexed user,
        uint256 tokens,
        uint256 usdcPayout
    );

    // ─── Errors ──────────────────────────────────────────────────────────
    error Unauthorized();
    error MarketAlreadyResolved();
    error MarketNotResolved();
    error InsufficientBalance();
    error ZeroAmount();

    // ─── Modifiers ───────────────────────────────────────────────────────
    modifier onlyFpmm() {
        _onlyFpmm();
        _;
    }

    function _onlyFpmm() internal view {
        if (msg.sender != fpmm) revert Unauthorized();
    }

    modifier onlyFactory() {
        _onlyFactory();
        _;
    }

    function _onlyFactory() internal view {
        if (msg.sender != factory) revert Unauthorized();
    }

    modifier onlyAdmin() {
        _onlyAdmin();
        _;
    }

    function _onlyAdmin() internal view {
        if (msg.sender != admin) revert Unauthorized();
    }

    // ─── Constructor ─────────────────────────────────────────────────────
    constructor(address _usdc) ERC1155("") {
        USDC = IERC20(_usdc);
        admin = msg.sender;
    }

    // ─── Admin Setup ─────────────────────────────────────────────────────
    function setFpmm(address _fpmm) external onlyAdmin {
        fpmm = _fpmm;
    }

    function setFactory(address _factory) external onlyAdmin {
        factory = _factory;
    }

    function transferAdmin(address _newAdmin) external onlyAdmin {
        admin = _newAdmin;
    }

    // ─── Token ID Helpers ────────────────────────────────────────────────
    function outcomeTokenId(bytes32 marketId, uint256 outcomeIndex) public pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(marketId, outcomeIndex)));
    }

    function yesTokenId(bytes32 marketId) public pure returns (uint256) {
        return outcomeTokenId(marketId, 0);
    }

    function noTokenId(bytes32 marketId) public pure returns (uint256) {
        return outcomeTokenId(marketId, 1);
    }

    // ─── Core Functions ──────────────────────────────────────────────────

    /// @notice Lock USDC and mint equal outcome tokens. Called by Fpmm.
    function mintOutcomeTokens(
        bytes32 marketId,
        address to,
        uint256 amount,
        uint256 outcomeCount
    ) public onlyFpmm {
        if (amount == 0) revert ZeroAmount();
        if (markets[marketId].resolved) revert MarketAlreadyResolved();

        MarketOutcome storage outcome = markets[marketId];
        if (outcome.outcomeCount == 0) {
            outcome.outcomeCount = outcomeCount;
        } else {
            require(outcome.outcomeCount == outcomeCount, "Outcome count mismatch");
        }

        // Pull USDC from the caller (Fpmm contract)
        USDC.safeTransferFrom(msg.sender, address(this), amount);

        // Update collateral tracking
        outcome.totalCollateral += amount;

        // Mint tokens for all outcomes
        for (uint256 i = 0; i < outcomeCount; i++) {
            uint256 tokenId = outcomeTokenId(marketId, i);
            _mint(to, tokenId, amount, "");
            totalSupply[tokenId] += amount;
        }

        emit PairMinted(marketId, to, amount);
    }

    /// @notice Lock USDC and mint equal YES + NO tokens. Called by Fpmm.
    /// @dev Caller (Fpmm) must have already transferred USDC to this contract,
    ///      or `from` must have approved this contract for the USDC amount.
    /// @param marketId The market identifier
    /// @param to Address to receive the minted tokens
    /// @param amount Number of token pairs to mint (in USDC base units, 6 decimals)
    function mintPair(
        bytes32 marketId,
        address to,
        uint256 amount
    ) external onlyFpmm {
        mintOutcomeTokens(marketId, to, amount, 2);
    }

    /// @notice Burn equal outcome tokens and release USDC. Called by Fpmm.
    function burnOutcomeTokens(
        bytes32 marketId,
        address from,
        uint256 amount,
        uint256 outcomeCount
    ) public onlyFpmm {
        if (amount == 0) revert ZeroAmount();
        if (markets[marketId].resolved) revert MarketAlreadyResolved();

        MarketOutcome storage outcome = markets[marketId];
        require(outcome.outcomeCount == outcomeCount, "Outcome count mismatch");

        // Verify balances
        for (uint256 i = 0; i < outcomeCount; i++) {
            uint256 tokenId = outcomeTokenId(marketId, i);
            if (balanceOf(from, tokenId) < amount) {
                revert InsufficientBalance();
            }
        }

        // Burn tokens
        for (uint256 i = 0; i < outcomeCount; i++) {
            uint256 tokenId = outcomeTokenId(marketId, i);
            _burn(from, tokenId, amount);
            totalSupply[tokenId] -= amount;
        }

        // Release USDC
        outcome.totalCollateral -= amount;
        USDC.safeTransfer(from, amount);

        emit PairBurned(marketId, from, amount);
    }

    /// @notice Burn equal YES + NO tokens and release USDC. Called by Fpmm.
    /// @param marketId The market identifier
    /// @param from Address to burn tokens from (must have approved this contract)
    /// @param amount Number of token pairs to burn
    function burnPair(
        bytes32 marketId,
        address from,
        uint256 amount
    ) external onlyFpmm {
        burnOutcomeTokens(marketId, from, amount, 2);
    }

    /// @notice Set the winning outcome for a market by outcome index. Called by Factory.
    function resolveOutcome(bytes32 marketId, uint256 winningOutcomeIndex) external onlyFactory {
        MarketOutcome storage outcome = markets[marketId];
        if (outcome.resolved) revert MarketAlreadyResolved();
        if (outcome.outcomeCount == 0) {
            outcome.outcomeCount = 2; // default fallback if uninitialized
        }
        require(winningOutcomeIndex < outcome.outcomeCount, "Invalid winning index");

        outcome.resolved = true;
        outcome.winningOutcomeIndex = winningOutcomeIndex;

        emit MarketResolved(marketId, winningOutcomeIndex == 0);
    }

    /// @notice Set the winning outcome for a market. Called by Factory (admin).
    /// @param marketId The market identifier
    /// @param winningIsYes true if YES wins, false if NO wins
    function resolve(bytes32 marketId, bool winningIsYes) external onlyFactory {
        MarketOutcome storage outcome = markets[marketId];
        if (outcome.resolved) revert MarketAlreadyResolved();
        if (outcome.outcomeCount == 0) {
            outcome.outcomeCount = 2;
        }

        outcome.resolved = true;
        outcome.winningOutcomeIndex = winningIsYes ? 0 : 1;

        emit MarketResolved(marketId, winningIsYes);
    }

    /// @notice After resolution, burn winning tokens and receive 1 USDC per token.
    /// @param marketId The market identifier
    function redeem(bytes32 marketId) external {
        MarketOutcome storage outcome = markets[marketId];
        if (!outcome.resolved) revert MarketNotResolved();

        uint256 winningId = outcomeTokenId(marketId, outcome.winningOutcomeIndex);

        uint256 userBalance = balanceOf(msg.sender, winningId);
        if (userBalance == 0) revert InsufficientBalance();

        // Burn the winning tokens
        _burn(msg.sender, winningId, userBalance);
        totalSupply[winningId] -= userBalance;

        // Reduce collateral and pay out
        outcome.totalCollateral -= userBalance;
        USDC.safeTransfer(msg.sender, userBalance);

        emit WinningsRedeemed(marketId, msg.sender, userBalance, userBalance);
    }

    // ─── View Helpers ────────────────────────────────────────────────────

    function isResolved(bytes32 marketId) external view returns (bool) {
        return markets[marketId].resolved;
    }

    function getCollateral(bytes32 marketId) external view returns (uint256) {
        return markets[marketId].totalCollateral;
    }
}
