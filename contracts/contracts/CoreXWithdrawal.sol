// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract CoreXWithdrawal is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdt;
    address public feeCollector;

    uint256 public constant MIN_WITHDRAWAL = 30 * 1e18;
    uint256 public constant WITHDRAWAL_MULTIPLE = 10 * 1e18;
    uint256 public constant FEE_PER_WITHDRAWAL = 1 * 1e18;
    uint256 public constant MAX_BATCH_SIZE = 100;

    mapping(address => bool) public operators;
    mapping(bytes32 => bool) public processedBatches;

    uint256 public totalWithdrawn;
    uint256 public totalFeeCollected;

    event WithdrawalProcessed(
        address indexed recipient,
        uint256 amount,
        uint256 fee,
        bytes32 indexed batchId,
        uint256 timestamp
    );
    event BatchProcessed(bytes32 indexed batchId, uint256 count, uint256 totalAmount, uint256 totalFee);
    event OperatorSet(address operator, bool authorized);
    event FeeCollectorSet(address newCollector);
    event FundsDeposited(address indexed from, uint256 amount);
    event EmergencyWithdraw(address token, uint256 amount, address to);

    modifier onlyOperator() {
        require(operators[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    constructor(address _usdt, address _feeCollector) Ownable(msg.sender) {
        require(_usdt != address(0), "Invalid USDT address");
        require(_feeCollector != address(0), "Invalid fee collector");
        usdt = IERC20(_usdt);
        feeCollector = _feeCollector;
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        usdt.safeTransferFrom(msg.sender, address(this), amount);
        emit FundsDeposited(msg.sender, amount);
    }

    function batchWithdraw(
        bytes32 _batchId,
        address[] calldata _recipients,
        uint256[] calldata _amounts
    ) external onlyOperator nonReentrant whenNotPaused {
        require(!processedBatches[_batchId], "Batch already processed");
        require(_recipients.length == _amounts.length, "Array length mismatch");
        require(_recipients.length > 0 && _recipients.length <= MAX_BATCH_SIZE, "Invalid batch size");

        uint256 totalAmount = 0;
        uint256 totalFee = 0;

        for (uint256 i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Invalid recipient");
            require(_amounts[i] >= MIN_WITHDRAWAL, "Below minimum withdrawal");
            require(_amounts[i] % WITHDRAWAL_MULTIPLE == 0, "Must be multiple of 10 USDT");

            uint256 netAmount = _amounts[i] - FEE_PER_WITHDRAWAL;
            totalAmount += netAmount;
            totalFee += FEE_PER_WITHDRAWAL;

            usdt.safeTransfer(_recipients[i], netAmount);

            emit WithdrawalProcessed(
                _recipients[i],
                netAmount,
                FEE_PER_WITHDRAWAL,
                _batchId,
                block.timestamp
            );
        }

        if (totalFee > 0) {
            usdt.safeTransfer(feeCollector, totalFee);
        }

        processedBatches[_batchId] = true;
        totalWithdrawn += totalAmount;
        totalFeeCollected += totalFee;

        emit BatchProcessed(_batchId, _recipients.length, totalAmount, totalFee);
    }

    function setOperator(address _operator, bool _authorized) external onlyOwner {
        require(_operator != address(0), "Invalid operator");
        operators[_operator] = _authorized;
        emit OperatorSet(_operator, _authorized);
    }

    function setFeeCollector(address _newCollector) external onlyOwner {
        require(_newCollector != address(0), "Invalid address");
        feeCollector = _newCollector;
        emit FeeCollectorSet(_newCollector);
    }

    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    function isBatchProcessed(bytes32 _batchId) external view returns (bool) {
        return processedBatches[_batchId];
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdraw(address token, uint256 amount, address to) external onlyOwner {
        require(to != address(0), "Invalid address");
        if (token == address(0)) {
            payable(to).transfer(amount);
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
        emit EmergencyWithdraw(token, amount, to);
    }

    receive() external payable {}
}
