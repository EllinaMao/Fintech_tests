// SPDX-License-Identifier: MIT
pragma solidity >=0.8.2 <0.9.0;

contract Payments {
    event NewPayment(address indexed from, uint value);

    //ДОБАВИЛА!!!
    event Withdrawal(address indexed to, uint value);


    struct Payment {
        uint value;
        uint timestamp;
        address from;
        string message;
    }

    struct Transactions {
        uint total_payments;
        mapping(uint => Payment) payments;
    }

    mapping(address => Transactions) private transactions;

    modifier min_value(uint min) {

        require(msg.value >= min, "Value must be greater than minimum");
        _;
    }

    //ДОБАВИЛА!!!
    modifier balance_check(uint amount) {
        require(address(this).balance >= amount, "Insufficient contract balance");
        _;
    }

    function pay(string calldata message) external payable min_value(2000 gwei){
        uint payment_number = transactions[msg.sender].total_payments;

        transactions[msg.sender].total_payments ++;

        Payment memory new_payment = Payment({
            value: msg.value,
            timestamp: block.timestamp,
            from: msg.sender,
            message: message
        });

        transactions[msg.sender].payments[payment_number] = new_payment;       
        emit NewPayment(msg.sender, msg.value);
    }

    function get_payment(address account, uint payment_number) external view returns (Payment memory) {
        return transactions[account].payments[payment_number];
    }

    function get_balance() external view returns (uint) {
        return address(this).balance;
    }

    //ДОБАВИЛА!!!
    function withdraw(uint amount) external balance_check(amount) {
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");
        emit Withdrawal(msg.sender, amount);
    }


}