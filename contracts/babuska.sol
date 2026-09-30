// Використати контракт із попереднього ДЗ
// """
// Бабуся, яка страждає на склероз, під Новий рік згадала, що у неї є онуки, і поки вона знову про них не забула, вона хоче розподілити між ними певну кількість ETH, щоб кожен із них у свій день народження в новому році міг забрати свій грошовий подарунок, що дорівнює сумі, яку бабуся внесе на депозит смартконтракту, поділеній на кількість її онуків.
// Сума подарунку доступна для зняття кожному онуку не лише у день народження, але й після цієї дати.
// """
// Вам необхідно покрити тестами цей контракт, використовуючи Hardhat:


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract T2_GrandmaGift {
    address public grandma;
    uint256 public giftPerGrandchild;
    
    error OnlyGrandma();
    error NoGrandchildrenProvided();
    error ArraysLengthMismatch(uint256 addressesLength, uint256 birthdaysLength);
    error AmountMustBeGreaterThanZero();
    error NotRegistered();
    error AlreadyClaimed();
    error NotBirthdayYet(uint256 currentTime, uint256 birthdayDate);
    error TransferFailed();
    
    event GiftClaimed(address indexed grandchild, uint256 amount);

    struct Grandchild {
        bool isRegistered;
        uint256 birthdayDate; 
        bool hasClaimed;
    }
    
    mapping(address => Grandchild) public grandchildren;
    
    modifier onlyGrandma() {
        if (msg.sender != grandma) {
            revert OnlyGrandma();
        }
        _;
    }
    
    constructor() {
        grandma = msg.sender;
    }
    
    function depositGifts(address[] calldata _addresses, uint256[] calldata _birthdays) external payable onlyGrandma {
        if (_addresses.length == 0) {
            revert NoGrandchildrenProvided();
        }
        if (_addresses.length != _birthdays.length) {
            revert ArraysLengthMismatch(_addresses.length, _birthdays.length);
        }
        if (msg.value == 0) {
            revert AmountMustBeGreaterThanZero();
        }
        
        giftPerGrandchild = msg.value / _addresses.length;
        
        for (uint256 i = 0; i < _addresses.length; i++) {
            grandchildren[_addresses[i]] = Grandchild({
                isRegistered: true,
                birthdayDate: _birthdays[i],
                hasClaimed: false
            });
        }
    }
    
    function claimGift() external {
        Grandchild storage gc = grandchildren[msg.sender];
        
        if (!gc.isRegistered) {
            revert NotRegistered();
        }
        if (gc.hasClaimed) {
            revert AlreadyClaimed();
        }
        if (block.timestamp < gc.birthdayDate) {
            revert NotBirthdayYet(block.timestamp, gc.birthdayDate);
        }
        
        gc.hasClaimed = true;
        
        (bool success, ) = msg.sender.call{value: giftPerGrandchild}("");
        if (!success) {
            revert TransferFailed();
        }

        emit GiftClaimed(msg.sender, giftPerGrandchild);
    }
}