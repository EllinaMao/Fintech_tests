const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("T2_GrandmaGift", () => {
    async function deploy() {
        const [grandma, grandchild1, grandchild2, stranger] = await ethers.getSigners();
        const T2_GrandmaGift = await ethers.getContractFactory("T2_GrandmaGift");
        const contract = await T2_GrandmaGift.deploy();
        
        return { contract, grandma, grandchild1, grandchild2, stranger };
    }

    // Перевірити, що бабуся може задеплоїти контракт, внести кошти і задати онуків з датами народження.
    it("grandma should be able to deposit gifts and set grandchildren with birthdays", async () => {
        const { contract, grandma, grandchild1, grandchild2 } = await loadFixture(deploy);

        const now = await time.latest();
        const addresses = [grandchild1.address, grandchild2.address];
        const birthdays = [now, now + 1000];

        const tx = await contract.connect(grandma).depositGifts(addresses, birthdays, { value: ethers.parseEther("2") });
        await tx.wait();

        expect(await contract.giftPerGrandchild()).to.equal(ethers.parseEther("1"));
        
        const gc1Data = await contract.grandchildren(grandchild1.address);
        expect(gc1Data.isRegistered).to.be.true;
        expect(gc1Data.birthdayDate).to.equal(now);

        const gc2Data = await contract.grandchildren(grandchild2.address);
        expect(gc2Data.isRegistered).to.be.true;
    });

    // Перевірити, що сума правильно ділиться між онуками.
    it("Grandma's money should be divided correctly among grandchildren", async () => {
        const { contract, grandma, grandchild1, grandchild2 } = await loadFixture(deploy);
        
        const now = await time.latest();
        const addresses = [grandchild1.address, grandchild2.address];
        const birthdays = [now, now + 1000];

        await contract.connect(grandma).depositGifts(addresses, birthdays, { value: ethers.parseEther("2") });

        const expectedGift = ethers.parseEther("1");
        expect(await contract.giftPerGrandchild()).to.equal(expectedGift);
    });

    // Успішне зняття у день народження.
    it("should allow grandchildren to claim their gifts exactly on their birthdays", async () => {
        const { contract, grandma, grandchild1 } = await loadFixture(deploy);
        
        const now = await time.latest();
        const addresses = [grandchild1.address];
        const birthdays = [now]; 

        await contract.connect(grandma).depositGifts(addresses, birthdays, { value: ethers.parseEther("1") });

        await expect(contract.connect(grandchild1).claimGift())
            .to.changeEtherBalances(
                [contract, grandchild1],
                [ethers.parseEther("-1"), ethers.parseEther("1")]
            );
    });

    // Успішне зняття після дня народження.
    it("should allow grandchildren to claim their gifts after their birthdays", async () => {
        const { contract, grandma, grandchild1 } = await loadFixture(deploy);
        
        const now = await time.latest();
        const addresses = [grandchild1.address];
        const birthdays = [now + 1000]; 

        await contract.connect(grandma).depositGifts(addresses, birthdays, { value: ethers.parseEther("1") });

        await time.increase(2000);

        await expect(contract.connect(grandchild1).claimGift())
            .to.changeEtherBalances(
                [contract, grandchild1],
                [ethers.parseEther("-1"), ethers.parseEther("1")]
            );
    });

    // Спроба зняти до дня народження: виклик до дня народження -> транзакцію відхилено.
    it("should not allow grandchildren to claim their gifts before their birthdays", async () => {
        const { contract, grandma, grandchild1 } = await loadFixture(deploy);
        
        const now = await time.latest();
        const addresses = [grandchild1.address];
        const birthdays = [now + 1000]; 

        await contract.connect(grandma).depositGifts(addresses, birthdays, { value: ethers.parseEther("1") });

        await expect(contract.connect(grandchild1).claimGift())
            .to.be.revertedWithCustomError(contract, "NotBirthdayYet");
    });

    // Повторне зняття: онук намагається зняти повторно -> транзакцію відхилено.
    it("should not allow grandchildren to claim their gifts twice", async () => {
        const { contract, grandma, grandchild1 } = await loadFixture(deploy);
        
        const now = await time.latest();
        await contract.connect(grandma).depositGifts([grandchild1.address], [now], { value: ethers.parseEther("1") });

        await contract.connect(grandchild1).claimGift();

        await expect(contract.connect(grandchild1).claimGift())
            .to.be.revertedWithCustomError(contract, "AlreadyClaimed");
    });

    // Спроба стороннього виклику.
    it("should not allow someone other than the grandchildren to claim the gifts", async () => {
        const { contract, grandma, grandchild1, stranger } = await loadFixture(deploy);
        
        const now = await time.latest();
        await contract.connect(grandma).depositGifts([grandchild1.address], [now], { value: ethers.parseEther("1") });

        await expect(contract.connect(stranger).claimGift())
            .to.be.revertedWithCustomError(contract, "NotRegistered");
    });

    // Подія при знятті: перевірка, що при знятті генерується правильна подія з адресою та сумою.
    it("should emit an event when a grandchild claims their gift", async () => {
        const { contract, grandma, grandchild1 } = await loadFixture(deploy);
        
        const now = await time.latest();
        await contract.connect(grandma).depositGifts([grandchild1.address], [now], { value: ethers.parseEther("1") });

        const expectedAmount = ethers.parseEther("1");

        await expect(contract.connect(grandchild1).claimGift())
            .to.emit(contract, "GiftClaimed")
            .withArgs(grandchild1.address, expectedAmount);
    });
});