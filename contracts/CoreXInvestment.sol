// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IFundDistributor {
    function distribute(uint256 amount) external;
}

contract CoreXInvestment is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    struct Product {
        uint256 id;
        uint256 minAmount;
        uint256 maxAmount;
        bool active;
    }

    IERC20 public immutable usdt;
    IFundDistributor public fundDistributor;

    mapping(uint256 => Product) public products;
    uint256 public productCount;

    uint256 public totalInvested;
    mapping(address => uint256) public userTotalInvested;

    event InvestmentCreated(
        address indexed investor,
        uint256 indexed productId,
        uint256 amount,
        uint256 timestamp
    );

    event ProductAdded(uint256 indexed productId, uint256 minAmount, uint256 maxAmount);
    event ProductUpdated(uint256 indexed productId, bool active);
    event FundDistributorUpdated(address newDistributor);

    constructor(address _usdt, address _fundDistributor) Ownable(msg.sender) {
        require(_usdt != address(0), "Invalid USDT address");
        require(_fundDistributor != address(0), "Invalid distributor address");
        usdt = IERC20(_usdt);
        fundDistributor = IFundDistributor(_fundDistributor);
    }

    function addProduct(
        uint256 _minAmount,
        uint256 _maxAmount
    ) external onlyOwner {
        require(_minAmount > 0, "Min amount must be > 0");

        productCount++;
        products[productCount] = Product({
            id: productCount,
            minAmount: _minAmount,
            maxAmount: _maxAmount,
            active: true
        });

        emit ProductAdded(productCount, _minAmount, _maxAmount);
    }

    function invest(uint256 _productId, uint256 _amount) external nonReentrant whenNotPaused {
        Product storage product = products[_productId];
        require(product.active, "Product not active");
        require(_amount >= product.minAmount, "Below minimum amount");
        require(product.maxAmount == 0 || _amount <= product.maxAmount, "Above maximum amount");

        usdt.safeTransferFrom(msg.sender, address(this), _amount);

        usdt.safeTransfer(address(fundDistributor), _amount);
        fundDistributor.distribute(_amount);

        totalInvested += _amount;
        userTotalInvested[msg.sender] += _amount;

        emit InvestmentCreated(
            msg.sender,
            _productId,
            _amount,
            block.timestamp
        );
    }

    function setProductActive(uint256 _productId, bool _active) external onlyOwner {
        require(products[_productId].id != 0, "Product not found");
        products[_productId].active = _active;
        emit ProductUpdated(_productId, _active);
    }

    function setFundDistributor(address _newDistributor) external onlyOwner {
        require(_newDistributor != address(0), "Invalid address");
        fundDistributor = IFundDistributor(_newDistributor);
        emit FundDistributorUpdated(_newDistributor);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function getProduct(uint256 _id) external view returns (Product memory) {
        require(products[_id].id != 0, "Product not found");
        return products[_id];
    }

    function emergencyWithdraw(address token, uint256 amount, address to) external onlyOwner {
        require(to != address(0), "Invalid address");
        if (token == address(0)) {
            payable(to).transfer(amount);
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    receive() external payable {}
}
