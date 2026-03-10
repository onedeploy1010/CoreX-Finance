// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract FundDistributor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Recipient {
        address wallet;
        uint256 percentage;
        string label;
    }

    IERC20 public immutable usdt;
    Recipient[] public recipients;
    uint256 public totalPercentage;

    mapping(address => bool) public authorizedCallers;

    event FundsDistributed(uint256 totalAmount, uint256 timestamp);
    event RecipientsSet(uint256 count, uint256 totalPercentage);
    event CallerAuthorized(address caller, bool authorized);
    event EmergencyWithdraw(address token, uint256 amount, address to);

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    constructor(address _usdt) Ownable(msg.sender) {
        require(_usdt != address(0), "Invalid USDT address");
        usdt = IERC20(_usdt);
    }

    function setRecipients(
        address[] calldata _wallets,
        uint256[] calldata _percentages,
        string[] calldata _labels
    ) external onlyOwner {
        require(
            _wallets.length == _percentages.length && _wallets.length == _labels.length,
            "Array length mismatch"
        );
        require(_wallets.length > 0 && _wallets.length <= 20, "Invalid recipient count");

        delete recipients;
        uint256 total = 0;

        for (uint256 i = 0; i < _wallets.length; i++) {
            require(_wallets[i] != address(0), "Invalid wallet address");
            require(_percentages[i] > 0, "Percentage must be > 0");
            total += _percentages[i];
            recipients.push(Recipient({
                wallet: _wallets[i],
                percentage: _percentages[i],
                label: _labels[i]
            }));
        }

        require(total == 10000, "Total percentage must be 10000");
        totalPercentage = total;

        emit RecipientsSet(_wallets.length, total);
    }

    function distribute(uint256 amount) external onlyAuthorized nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(recipients.length > 0, "No recipients configured");
        require(usdt.balanceOf(address(this)) >= amount, "Insufficient USDT balance");

        uint256 distributed = 0;

        for (uint256 i = 0; i < recipients.length; i++) {
            uint256 share;
            if (i == recipients.length - 1) {
                share = amount - distributed;
            } else {
                share = (amount * recipients[i].percentage) / 10000;
            }

            if (share > 0) {
                usdt.safeTransfer(recipients[i].wallet, share);
                distributed += share;
            }
        }

        emit FundsDistributed(amount, block.timestamp);
    }

    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        require(caller != address(0), "Invalid caller address");
        authorizedCallers[caller] = authorized;
        emit CallerAuthorized(caller, authorized);
    }

    function getRecipients() external view returns (Recipient[] memory) {
        return recipients;
    }

    function getRecipientCount() external view returns (uint256) {
        return recipients.length;
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
