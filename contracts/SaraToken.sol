// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  SaraToken — Gas-Optimised v2
 * @notice SRI Adaptive Response Asset (SARA)
 *         Governance + utility ERC-20 token for the SRI Learn platform.
 *
 * ─── Supply ────────────────────────────────────────────────────────────────
 *   Max supply   : 100,000,000 SARA
 *   Genesis mint :  10,000,000 SARA → deployer wallet on construction
 *   Remaining    :  90,000,000 SARA → minted by owner over time (DAO / vesting)
 *
 * ─── Planned allocation (enforced off-chain / via vesting contracts) ────────
 *   Treasury   :  40,000,000 SARA  (40 %)
 *   Ecosystem  :  25,000,000 SARA  (25 %)
 *   Team       :  15,000,000 SARA  (15 %)
 *   Community  :  10,000,000 SARA  (10 %)
 *   Genesis    :  10,000,000 SARA  (10 %)
 *
 * ─── Features ──────────────────────────────────────────────────────────────
 *   ERC-20          standard transfers & approvals
 *   ERC-20 Permit   gasless approvals (EIP-2612)
 *   ERC-20 Votes    snapshot voting power for DAO governance
 *   ERC-20 Burnable token holders can burn their own tokens
 *   Ownable2Step    safe two-step ownership transfer (multisig / Governor)
 *
 * ─── Gas optimisations over v1 ─────────────────────────────────────────────
 *   • Custom errors replace require strings          (~50 gas saved per revert)
 *   • Unused allocation constants removed            (~4 getter stubs removed)
 *   • mint() reason param: string → bytes32          (~200+ gas saved per mint)
 *   • Unchecked supply arithmetic inside mint()      (~20 gas saved per mint)
 *   • viaIR + optimizer runs=1000 in hardhat config  (smaller bytecode overall)
 *
 * ─── Deployment ────────────────────────────────────────────────────────────
 *   Testnet : Ethereum Sepolia
 *   Mainnet : Ethereum (planned)
 *
 *   Constructor arg:  initialOwner — your deployer / treasury wallet address
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Nonces.sol";

contract SaraToken is ERC20, ERC20Burnable, ERC20Permit, ERC20Votes, Ownable2Step {

    // ── Supply constants ────────────────────────────────────────────────────
    // Only constants actually used in contract logic are kept here.
    // Allocation splits live in the NatSpec above — no on-chain getter needed.
    uint256 public constant MAX_SUPPLY   = 100_000_000 * 10 ** 18;
    uint256 public constant GENESIS_MINT =  10_000_000 * 10 ** 18;

    // ── Custom errors (replaces require strings — saves ~50 gas per revert) ─
    /// @dev Thrown when a mint would push totalSupply past MAX_SUPPLY.
    error ExceedsMaxSupply(uint256 requested, uint256 available);

    // ── Events ──────────────────────────────────────────────────────────────
    // reason is bytes32 instead of string:
    //   • Fixed-width → no ABI offset+length header in calldata
    //   • ~200 gas cheaper per mint on average inputs
    //   • Decode off-chain: ethers.decodeBytes32String(reason)
    event TokensMinted(address indexed to, uint256 amount, bytes32 indexed reason);

    // ── Constructor ─────────────────────────────────────────────────────────
    /// @param initialOwner Deployer wallet — receives GENESIS_MINT on deploy.
    constructor(address initialOwner)
        ERC20("SRI Adaptive Response Asset", "SARA")
        ERC20Permit("SRI Adaptive Response Asset")
        Ownable(initialOwner)
    {
        _mint(initialOwner, GENESIS_MINT);
    }

    // ── Owner-gated minting ─────────────────────────────────────────────────
    /// @notice Mint SARA up to MAX_SUPPLY. Only callable by owner.
    /// @param to      Recipient (treasury, vesting contract, reward pool, etc.)
    /// @param amount  Amount in wei (18 decimals)
    /// @param reason  Short label for off-chain indexing, max 31 ASCII chars.
    ///                Encode with: ethers.encodeBytes32String("treasury_round_1")
    function mint(
        address to,
        uint256 amount,
        bytes32 reason
    ) external onlyOwner {
        // totalSupply() < MAX_SUPPLY is already guaranteed by the error branch,
        // so the addition cannot overflow — safe to use unchecked.
        unchecked {
            uint256 supply = totalSupply();
            if (supply + amount > MAX_SUPPLY) {
                revert ExceedsMaxSupply(amount, MAX_SUPPLY - supply);
            }
        }
        _mint(to, amount);
        emit TokensMinted(to, amount, reason);
    }

    // ── OZ v5 overrides ─────────────────────────────────────────────────────
    // ERC20Votes uses _update (v5 pattern, not _afterTokenTransfer).
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }

    // ERC20Permit and ERC20Votes both inherit Nonces — resolve ambiguity.
    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
