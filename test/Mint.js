const {
  time,
  setBalance,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("CoNFT", () => {
  async function deployFixture() {
    const [deployer, secondAccount, thirdAccount] = await ethers.getSigners();
    const MintContract = await ethers.getContractFactory("CoNFT");
    const contract = await MintContract.deploy();
    return { contract, deployer, secondAccount, thirdAccount };
  }

  describe("Deployment", () => {
    it("Should set the right contract owner", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);

      expect(await contract.owner()).to.equal(deployer.address);
    });

    it("Should set the right token id counter", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);

      expect(await contract.totalSupply()).to.equal(0);
    });
  });

  describe("Mint", () => {
    it("Increments token id counter", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      await contract.mint();
      const currentTokenId = Number(await contract.totalSupply());
      expect(await contract.totalSupply()).to.equal(currentTokenId);
    });

    it("Correctly sets the owner of the token", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      await contract.mint();
      const currentTokenId = Number(await contract.totalSupply());
      expect(await contract.ownerOf(currentTokenId)).to.equal(deployer.address);
    });

    describe("Events", () => {
      it("Should emit an Minted event", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);
        const nextTokenId = Number(await contract.totalSupply()) + 1;
        await expect(contract.mint())
          .to.emit(contract, "Minted")
          .withArgs(deployer.address, nextTokenId);
      });
    });
  });

  describe("Withdraw", () => {
    describe("Validations", () => {
      it("Should revert with the right error if called by not contract owner", async () => {
        const { contract, secondAccount } = await loadFixture(deployFixture);

        await expect(
          contract.connect(secondAccount).withdraw(),
        ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
      });
    });

    describe("Transfers", () => {
      it("Should transfer the funds to the contract owner", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);
        const balanceValue = 123;
        await setBalance(contract.target, balanceValue);

        await expect(contract.withdraw()).to.changeEtherBalances(
          [deployer, contract],
          [balanceValue, -balanceValue],
        );
      });
    });
  });

  describe("TokenURI", () => {
    it("Returns correct token uri", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const tokenId = 1;

      expect(await contract.tokenURI(tokenId)).to.equal(
        `https://conft.app/minting/eth/testnet/${tokenId}`,
      );
    });
  });
});
