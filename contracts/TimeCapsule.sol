// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title TimeCapsule
/// @notice A neutral, content-agnostic registry of opaque time-lock ciphertext.
/// @dev Ciphertext is public immediately and is never interpreted or decrypted here.
/// The unlock time is enforced cryptographically by the off-chain time-lock
/// (for example, browser-produced drand tlock), not by this contract. This contract
/// neither verifies encryption nor checks that its time-lock matches unlockAt.
/// Fees go directly from the creator to the immutable recipient, without custody
/// by this contract. A blocklisted USDC sender or feeRecipient makes createCapsule
/// revert. There are no administrative powers, withdrawals, upgrades or refunds.
contract TimeCapsule {
    using SafeERC20 for IERC20;

    /// @notice Flat fee of 0.01 USDC, expressed in six-decimal ERC-20 units.
    uint256 public constant FEE = 10_000;

    /// @notice Maximum accepted ciphertext size in bytes.
    uint256 public constant MAX_CIPHERTEXT_BYTES = 4096;

    /// @notice USDC ERC-20 interface selected permanently at deployment.
    IERC20 public immutable usdc;

    /// @notice Address receiving fees directly from creators.
    address public immutable feeRecipient;

    /// @notice The supplied USDC address must not be zero.
    error ZeroUsdcAddress();

    /// @notice The supplied fee recipient must not be zero.
    error ZeroFeeRecipient();

    /// @notice The requested unlock time must be strictly in the future.
    error InvalidUnlockTime();

    /// @notice Ciphertext must contain between 1 and MAX_CIPHERTEXT_BYTES bytes.
    error InvalidCiphertextLength();

    /// @notice No capsule exists for the supplied identifier.
    error CapsuleNotFound(uint256 id);

    /// @notice Emitted when a capsule and its fee transfer have been recorded.
    /// @param id The capsule identifier, starting at 1.
    /// @param creator The address that created the capsule and paid the fee.
    /// @param unlockAt The declared unlock timestamp in seconds.
    event CapsuleSealed(uint256 indexed id, address indexed creator, uint64 unlockAt);

    struct Capsule {
        address creator;
        uint64 createdAt;
        uint64 unlockAt;
        bytes ciphertext;
    }

    uint256 private _capsuleCount;
    mapping(uint256 => Capsule) private _capsules;
    mapping(address => uint256[]) private _capsuleIdsByCreator;

    /// @notice Permanently select the fee token and recipient.
    /// @param usdc_ The six-decimal USDC ERC-20 interface for the target network.
    /// @param feeRecipient_ The address to receive each fee directly.
    constructor(IERC20 usdc_, address feeRecipient_) {
        if (address(usdc_) == address(0)) revert ZeroUsdcAddress();
        if (feeRecipient_ == address(0)) revert ZeroFeeRecipient();
        usdc = usdc_;
        feeRecipient = feeRecipient_;
    }

    /// @notice Register opaque ciphertext and pay the flat USDC fee.
    /// @dev Requires sufficient USDC balance and allowance. All storage effects
    /// precede the token interaction; a failed transfer reverts the entire creation.
    /// A blocklisted USDC sender or feeRecipient causes this call to revert.
    /// @param unlockAt A declared unlock timestamp strictly after the current block.
    /// @param ciphertext Arbitrary encrypted bytes; encryption is not verified.
    /// @return id The newly assigned capsule identifier.
    function createCapsule(uint64 unlockAt, bytes calldata ciphertext) external returns (uint256 id) {
        if (unlockAt <= block.timestamp) revert InvalidUnlockTime();
        if (ciphertext.length == 0 || ciphertext.length > MAX_CIPHERTEXT_BYTES) {
            revert InvalidCiphertextLength();
        }

        id = ++_capsuleCount;
        _capsules[id] = Capsule({
            creator: msg.sender,
            createdAt: uint64(block.timestamp),
            unlockAt: unlockAt,
            ciphertext: ciphertext
        });
        _capsuleIdsByCreator[msg.sender].push(id);

        usdc.safeTransferFrom(msg.sender, feeRecipient, FEE);

        emit CapsuleSealed(id, msg.sender, unlockAt);
    }

    /// @notice Return the number of capsules created successfully.
    function capsuleCount() external view returns (uint256) {
        return _capsuleCount;
    }

    /// @notice Read a capsule, including its publicly available ciphertext.
    /// @dev Reverts with CapsuleNotFound if id does not exist. Reading is not
    /// gated by unlockAt; confidentiality depends entirely on off-chain encryption.
    /// @param id The capsule identifier.
    /// @return creator The creator and fee payer.
    /// @return createdAt The creation block timestamp in seconds.
    /// @return unlockAt The declared unlock timestamp in seconds.
    /// @return ciphertext The unmodified opaque payload.
    function getCapsule(uint256 id)
        external
        view
        returns (address creator, uint64 createdAt, uint64 unlockAt, bytes memory ciphertext)
    {
        Capsule storage capsule = _getCapsule(id);
        return (capsule.creator, capsule.createdAt, capsule.unlockAt, capsule.ciphertext);
    }

    /// @notice Return whether the declared unlock timestamp has been reached.
    /// @dev This is informational and does not guarantee decryptability.
    /// Reverts with CapsuleNotFound if id does not exist.
    /// @param id The capsule identifier.
    function isUnlocked(uint256 id) external view returns (bool) {
        return block.timestamp >= _getCapsule(id).unlockAt;
    }

    /// @notice Return all capsule identifiers for a creator in creation order.
    /// @param creator The creator address to look up.
    function getCapsuleIdsByCreator(address creator) external view returns (uint256[] memory) {
        return _capsuleIdsByCreator[creator];
    }

    function _getCapsule(uint256 id) private view returns (Capsule storage capsule) {
        capsule = _capsules[id];
        if (capsule.creator == address(0)) revert CapsuleNotFound(id);
    }
}
