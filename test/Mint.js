const {
  time,
  setBalance,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Mint", () => {
  async function deployFixture() {
    const [deployer, secondAccount, thirdAccount] = await ethers.getSigners();
    const MintContract = await ethers.getContractFactory("Mint");
    const initData = {
      name: "name",
      symbol: "symbol",
      initialUriPrefix: "testurlprefix",
      maxSupply: 1000,
      mintPrice: 123,
    };
    const contract = await MintContract.deploy(...Object.values(initData));
    return { contract, deployer, secondAccount, thirdAccount, ...initData };
  }

  describe("Deployment", () => {
    it("Should set the right collection name", async () => {
      const { contract, deployer, name } = await loadFixture(deployFixture);

      expect(await contract.name()).to.equal(name);
    });

    it("Should set the right symbol", async () => {
      const { contract, deployer, symbol } = await loadFixture(deployFixture);

      expect(await contract.symbol()).to.equal(symbol);
    });

    it("Should set the right contract owner", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);

      expect(await contract.owner()).to.equal(deployer.address);
    });

    it("Should set the right token id counter", async () => {
      const { contract } = await loadFixture(deployFixture);

      expect(await contract.totalSupply()).to.equal(0);
    });

    it("Should set the right max supply", async () => {
      const { contract, maxSupply } = await loadFixture(deployFixture);

      expect(await contract.maxSupply()).to.equal(maxSupply);
    });

    it("Should set the right mint price", async () => {
      const { contract, mintPrice } = await loadFixture(deployFixture);

      expect(await contract.mintPrice()).to.equal(mintPrice);
    });

    it("Should set the right initial uri prefix", async () => {
      const { contract, initialUriPrefix } = await loadFixture(deployFixture);

      expect(await contract.tokenURI(1)).to.equal(initialUriPrefix + "1");
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

  describe("SetMaxSupply", () => {
    describe("Validations", () => {
      it("Should revert with the right error if the caller is not the owner", async () => {
        const { contract, secondAccount } = await loadFixture(deployFixture);

        await expect(
          contract.connect(secondAccount).setMaxSupply(1),
        ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
      });
    });

    describe("Events", () => {
      it("Should emit an MaxSupplyChanged event", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);
        const newMaxSupply = 10;

        await expect(contract.connect(deployer).setMaxSupply(newMaxSupply))
          .to.emit(contract, "MaxSupplyChanged")
          .withArgs(newMaxSupply);
      });
    });

    it("Sets max supply", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const newMaxSupply = 5;
      await contract.connect(deployer).setMaxSupply(newMaxSupply);

      expect(await contract.maxSupply()).to.equal(newMaxSupply);
    });
  });

  describe("SetMintPrice", () => {
    describe("Validations", () => {
      it("Should revert with the right error if the caller is not the owner", async () => {
        const { contract, secondAccount } = await loadFixture(deployFixture);

        await expect(
          contract.connect(secondAccount).setMintPrice(1),
        ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
      });
    });

    describe("Events", () => {
      it("Should emit an MintPriceChanged event", async () => {
        const { contract, deployer, mintPrice } =
          await loadFixture(deployFixture);
        const newPriceValue = 555;

        await expect(contract.connect(deployer).setMintPrice(newPriceValue))
          .to.emit(contract, "MintPriceChanged")
          .withArgs(newPriceValue);
      });
    });

    it("Sets mint price", async () => {
      const { contract, deployer, mintPrice } =
        await loadFixture(deployFixture);
      const newPriceValue = 555;
      await contract.connect(deployer).setMintPrice(newPriceValue);

      expect(await contract.mintPrice()).to.equal(newPriceValue);
    });
  });

  describe("SetTokenUriPrefix", () => {
    describe("Validations", () => {
      it("Should revert with the right error if the caller is not the owner", async () => {
        const { contract, secondAccount } = await loadFixture(deployFixture);

        await expect(
          contract.connect(secondAccount).setTokenUriPrefix("123"),
        ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
      });
    });

    describe("Events", () => {
      it("Should emit an TokenUriPrefixChanged event", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);
        const newPrefix = "test123";

        await expect(contract.connect(deployer).setTokenUriPrefix(newPrefix))
          .to.emit(contract, "TokenUriPrefixChanged")
          .withArgs(newPrefix);
      });
    });

    it("Sets mint price", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const newPrefix = "test123";
      await contract.connect(deployer).setTokenUriPrefix(newPrefix);

      expect(await contract.tokenURI(1)).to.equal(newPrefix + "1");
    });
  });

  describe("Mint", () => {
    describe("Validations", () => {
      it("Should revert with the right error if the max supply has been reached", async () => {
        const { contract, secondAccount, mintPrice } =
          await loadFixture(deployFixture);
        await contract.setMaxSupply(1);
        await contract.connect(secondAccount).mint({ value: mintPrice });

        await expect(
          contract.connect(secondAccount).mint({ value: mintPrice }),
        ).to.be.revertedWith("Max supply reached");
      });

      it("Should revert with the right error if minter underpays", async () => {
        const { contract, secondAccount, mintPrice } =
          await loadFixture(deployFixture);

        await expect(
          contract.connect(secondAccount).mint({ value: mintPrice - 1 }),
        ).to.be.revertedWith("Mismatch of funds");
      });

      it("Should revert with the right error if minter overpays", async () => {
        const { contract, secondAccount, mintPrice } =
          await loadFixture(deployFixture);

        await expect(
          contract.connect(secondAccount).mint({ value: mintPrice + 1 }),
        ).to.be.revertedWith("Mismatch of funds");
      });
    });

    it("Increments token id counter", async () => {
      const { contract, deployer, mintPrice } =
        await loadFixture(deployFixture);
      await contract.mint({ value: mintPrice });
      const currentTokenId = Number(await contract.totalSupply());
      expect(await contract.totalSupply()).to.equal(currentTokenId);
    });

    it("Correctly sets the owner of the token", async () => {
      const { contract, deployer, mintPrice } =
        await loadFixture(deployFixture);
      await contract.mint({ value: mintPrice });
      const currentTokenId = Number(await contract.totalSupply()) - 1;
      expect(await contract.ownerOf(currentTokenId)).to.equal(deployer.address);
    });

    describe("Events", () => {
      it("Should emit an Minted event", async () => {
        const { contract, deployer, maxSupply, mintPrice } =
          await loadFixture(deployFixture);
        const nextTokenId = Number(await contract.totalSupply());
        const timestamp = (await time.latest()) + 100_000;
        await time.setNextBlockTimestamp(timestamp);
        await expect(contract.mint({ value: mintPrice }))
          .to.emit(contract, "Minted")
          .withArgs(deployer.address, nextTokenId, mintPrice, timestamp);
      });
    });
  });

  describe("TokenURI", () => {
    it("Returns correct token uri", async () => {
      const { contract, deployer, initialUriPrefix } =
        await loadFixture(deployFixture);
      const tokenId = 1;

      expect(await contract.tokenURI(tokenId)).to.equal(
        `${initialUriPrefix}${tokenId}`,
      );
    });
  });

  describe("TotalSupply", () => {
    it("Returns 0 if there are no mints", async () => {
      const { contract } = await loadFixture(deployFixture);

      expect(await contract.totalSupply()).to.equal(0);
    });

    it("Returns 1 if there is 1 mint", async () => {
      const { contract, mintPrice } = await loadFixture(deployFixture);
      await contract.mint({ value: mintPrice });

      expect(await contract.totalSupply()).to.equal(1);
    });
  });
});
