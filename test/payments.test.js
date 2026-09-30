const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");


describe("Payments", () => {
    const deploy = async() => {
        const [user1, user2, user3] = await ethers.getSigners(2);
        
        const factory = await ethers.getContractFactory("Payments");
        const c_payments = await factory.connect(user2).deploy();
        await c_payments.waitForDeployment();

        return { c_payments, user1, user2 };
    }

    it("empty balance and contract address format is correct", async () => {
        //достает контракт. Его состояние будет одно, когда ты деплоишь. loadFixture позволяет сделать слепок смарт контракта. Мы работаем с слепками контракта, и каждый тест будет работать с одним и тем же контрактом, но слепком.
        const { c_payments, user1, user2 } = await loadFixture(deploy);

        console.log("Contract deployed:", await c_payments.getAddress());
        
        console.log("User1 adress:", await user1.address);
        console.log("User2 adress:", await user2.address);

        console.log("User1 balance:", await ethers.provider.getBalance(user1.address));
        console.log("User2 balance:", await ethers.provider.getBalance(user2.address));
        

        const contractAddress = await c_payments.getAddress();
        expect(contractAddress, "Contract address is not correct").to.be.properAddress;


        // await c_payments.pay("test", {value: 200000000000000n });

        // const contract_balance = await ethers.provider.getBalance(c_payments.target);
        const contract_balance = await c_payments.get_balance();
        expect(contract_balance, "Must be :0ETH").to.be.eq(0);

    });

    it("Payment data must be recorded correctly", async () => {
        
        const { c_payments, user1, user2 } = await loadFixture(deploy);

        const payment_value = ethers.parseUnits("2000", "gwei");
        console.log("Payment value:", ethers.formatUnits(payment_value, "gwei"));
        const payment_message = "hello from hardhat";

        await expect (()=> c_payments.connect(user1).pay(payment_message, { value: payment_value })).to.changeEtherBalance(user1, -payment_value);
        console.log("User1 balance after payment:", await ethers.provider.getBalance(user1.address));

        const contract_balance = await c_payments.get_balance();
        console.log("Contract balance after payment(gwei):", ethers.formatUnits(contract_balance, "gwei"));
        expect(contract_balance, "Contract balance must be equal to payment value").to.be.eq(payment_value);

        const payment_idx = 0;
        const payment = await c_payments.get_payment(user1.address, payment_idx);
        
        console.log("Payment details:", payment);
        
        const current_block = await ethers.provider.getBlock(
            await ethers.provider.getBlockNumber()
        );
        // console.log("Current block details:", current_block);
         
        const user1_adress = await user1.address;
        
        
        expect(payment.value, "Expexted value and res are same").to.be.eq(payment_value);      
        expect(payment.timestamp, "Expected timestamp to match current block timestamp").to.be.eq(current_block.timestamp);
        expect(payment.from, "Expected sender to match user1 address").to.be.eq(user1_adress);
        expect(payment.message, "Expected message to match payment message").to.be.eq(payment_message);
    
        const less_min = ethers.parseUnits("1000", "gwei");
        const reverted_message = "Value must be greater than minimum";
await expect(c_payments.connect(user1).pay(payment_message, { value: less_min })).to.be.revertedWith(reverted_message);    

const event_name = "NewPayment";

const tx = await c_payments.connect(user1).pay(payment_message, { value: payment_value });
await expect(tx).to.emit(c_payments, event_name).withArgs(user1.address, payment_value);
});

it("Balance must change at owner and contract after payment. Event after windrawal", async () => {
    //setup
    const { c_payments, user1, user2 } = await loadFixture(deploy);
    //я хотела с гвеи, но комиссия была сильно выше
    const payment_value = ethers.parseUnits("00.2", "ether");
    await c_payments.connect(user1).pay("top up contract balance", { value: payment_value });

    const contract_balance = await c_payments.get_balance();
    console.log("Contract balance after payment:", contract_balance);
    expect(contract_balance, "Contract balance must be equal to payment value").to.be.eq(payment_value);
    const initial_user_balance = await ethers.provider.getBalance(user1.address);
    console.log("Initial user1 balance:", initial_user_balance);
    //now windrawal

    const withdrawal_amount = payment_value;
    const windrawal_transaction = await c_payments.connect(user1).withdraw(withdrawal_amount);
    expect(windrawal_transaction).to.emit(c_payments, "Withdrawal").withArgs(user1.address, withdrawal_amount);
    const receipt = await windrawal_transaction.wait();
    const gas_cost = receipt.gasUsed * receipt.gasPrice;
    console.log("Gas used for withdrawal transaction:", gas_cost);

    const final_user_balance = await ethers.provider.getBalance(user1.address);
    console.log("Final user1 balance", final_user_balance);

    const final_contract_balance = await c_payments.get_balance();
    console.log("Final contract balance after withdrawal:", final_contract_balance);

    expect(final_contract_balance, "Contract balance must be zero after withdrawal").to.be.eq(0);
    expect(final_user_balance, "User balance must increase greater than withdrawal amount").to.be.gt(initial_user_balance);
    
    const actual_difference = final_user_balance - initial_user_balance;
    console.log("Actual balance increase:", actual_difference);

    const expected_difference = withdrawal_amount - gas_cost;
    console.log("Expected balance increase:", expected_difference);

    expect(actual_difference, "Balance calculation mismatch").to.be.equal(expected_difference);
    
    
});

});