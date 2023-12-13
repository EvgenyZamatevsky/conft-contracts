const {
  time,
  setBalance,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("ListingsERC721", () => {
  async function deployFixture() {
    const [deployer, secondAccount, thirdAccount] = await ethers.getSigners();
    const ListingsERC721 = await ethers.getContractFactory("ListingsERC721");
    const ERC721Tokens = await ethers.getContractFactory("ERC721Tokens");
    const listings = await ListingsERC721.deploy();
    const tokens = await ERC721Tokens.deploy();
    return { listings, tokens, deployer, secondAccount, thirdAccount };
  }

  describe("Deployment", () => {
    it("Should set the right contract owner", async () => {
      const { listings, deployer } = await loadFixture(deployFixture);

      expect(await listings.owner()).to.equal(deployer.address);
    });
  });

  describe("Withdraw", () => {
    describe("Validations", () => {
      it("Should revert with the right error if called by not contract owner", async () => {
        const { listings, secondAccount } = await loadFixture(deployFixture);

        await expect(
          listings.connect(secondAccount).withdraw(),
        ).to.be.revertedWithCustomError(listings, "OwnableUnauthorizedAccount");
      });
    });

    describe("Transfers", () => {
      it("Should transfer the funds to the contract owner", async () => {
        const { listings, deployer } = await loadFixture(deployFixture);
        await setBalance(listings.target, 123);

        await expect(listings.withdraw()).to.changeEtherBalances(
          [deployer, listings],
          [123, -123],
        );
      });
    });
  });

  describe("AddListing", () => {
    describe("Validations", () => {
      it("Should revert with the right error if called with zero price", async () => {
        const { listings, secondAccount, tokens } =
          await loadFixture(deployFixture);
        const price = 0;

        await expect(
          listings
            .connect(secondAccount)
            .addListing(tokens.target, 0, price, 0),
        ).to.be.revertedWith("Price must be > 0");
      });

      it("Should revert with the right error if called with zero duration", async () => {
        const { listings, secondAccount, tokens } =
          await loadFixture(deployFixture);
        const duration = 0;

        await expect(
          listings
            .connect(secondAccount)
            .addListing(tokens.target, 0, 1, duration),
        ).to.be.revertedWith("Duration must be > 0");
      });

      it("Should revert with the right error if called by not token owner", async () => {
        const { listings, deployer, secondAccount, tokens } =
          await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);

        await expect(
          listings.connect(secondAccount).addListing(tokens.target, 0, 1, 1),
        ).to.be.revertedWith("Caller is not the owner");
      });

      it("Should revert with the right error if contract not approved", async () => {
        const { listings, deployer, tokens } = await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();

        await expect(
          listings.connect(deployer).addListing(tokens.target, 0, 1, 1),
        ).to.be.revertedWith("Contract is not approved");
      });

      it("Should not be reverted for token owner and approved contract", async () => {
        const { listings, deployer, tokens } = await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);

        await expect(
          listings.connect(deployer).addListing(tokens.target, 0, 1, 1),
        ).not.to.be.reverted;
      });
    });

    describe("Events", () => {
      it("Should emit an ListingCreated event", async () => {
        const { listings, deployer, tokens } = await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        const timestamp = (await time.latest()) + 100_000;
        await time.setNextBlockTimestamp(timestamp);

        await expect(
          listings.connect(deployer).addListing(tokens.target, 0, 1, 1),
        )
          .to.emit(listings, "ListingCreated")
          .withArgs(
            1,
            deployer.address,
            tokens.target,
            0,
            1,
            timestamp + 1 * 3600,
          );
      });
    });

    it("Saves listing to the state", async () => {
      const { listings, deployer, tokens } = await loadFixture(deployFixture);
      await tokens.connect(deployer).safeMint();
      await tokens.connect(deployer).setApprovalForAll(listings.target, true);
      await listings.connect(deployer).addListing(tokens.target, 0, 1, 1);
      const [id, price, seller, expireTime] = await listings.getListing(
        tokens.target,
        0,
      );

      expect(id).to.equal(1);
      expect(price).to.equal(1);
      expect(seller).to.equal(deployer.address);
      expect(expireTime).to.equal((await time.latest()) + 1 * 3600);
    });
  });

  describe("CancelListing", () => {
    describe("Validations", () => {
      it("Should revert with the right error if there is no listing", async () => {
        const { listings, secondAccount, tokens } =
          await loadFixture(deployFixture);

        await expect(
          listings.connect(secondAccount).cancelListing(tokens.target, 0),
        ).to.be.revertedWith("Listing does not exist");
      });

      it("Should revert with the right error if caller is not listing's creator", async () => {
        const { listings, deployer, secondAccount, tokens } =
          await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        await listings.connect(deployer).addListing(tokens.target, 0, 1, 1);

        await expect(
          listings.connect(secondAccount).cancelListing(tokens.target, 0),
        ).to.be.revertedWith("Caller is not the creator of the listing");
      });

      it("Should not be reverted if listing exists and is called by the creator", async () => {
        const { listings, deployer, tokens } = await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        await listings.connect(deployer).addListing(tokens.target, 0, 1, 1);

        await expect(listings.connect(deployer).cancelListing(tokens.target, 0))
          .not.to.be.reverted;
      });
    });

    describe("Events", () => {
      it("Should emit an ListingRemoved event", async () => {
        const { listings, deployer, tokens } = await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        const timestamp = (await time.latest()) + 100_000;
        await time.setNextBlockTimestamp(timestamp);
        await listings.connect(deployer).addListing(tokens.target, 0, 1, 1);

        await expect(listings.connect(deployer).cancelListing(tokens.target, 0))
          .to.emit(listings, "ListingRemoved")
          .withArgs(
            1,
            deployer.address,
            tokens.target,
            0,
            1,
            timestamp + 1 * 3600,
          );
      });
    });

    it("Removes listing from the state", async () => {
      const { listings, deployer, tokens } = await loadFixture(deployFixture);
      await tokens.connect(deployer).safeMint();
      await tokens.connect(deployer).setApprovalForAll(listings.target, true);
      await listings.connect(deployer).addListing(tokens.target, 0, 1, 1);
      await listings.connect(deployer).cancelListing(tokens.target, 0);
      const [id, price, seller, expireTime] = await listings.getListing(
        tokens.target,
        0,
      );

      expect(id).to.equal(0);
      expect(price).to.equal(0);
      expect(seller).to.equal(ethers.ZeroAddress);
      expect(expireTime).to.equal(0);
    });
  });

  describe("BuyToken", () => {
    describe("Validations", () => {
      it("Should revert with the right error if there is no listing", async () => {
        const { listings, secondAccount, tokens } =
          await loadFixture(deployFixture);

        await expect(
          listings.connect(secondAccount).buyToken(tokens.target, 0),
        ).to.be.revertedWith("Listing does not exist");
      });

      it("Should revert with the right error if listing is expired", async () => {
        const { listings, deployer, secondAccount, tokens } =
          await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        await listings.connect(deployer).addListing(tokens.target, 0, 1, 1);
        const [_id, _price, _seller, expireTime] = await listings.getListing(
          tokens.target,
          0,
        );
        await time.increaseTo(expireTime);

        await expect(
          listings.connect(secondAccount).buyToken(tokens.target, 0),
        ).to.be.revertedWith("Listing is expired");
      });

      it("Should revert with the right error if seller tries to buy it token", async () => {
        const { listings, deployer, tokens } = await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        await listings.connect(deployer).addListing(tokens.target, 0, 1, 1);

        await expect(
          listings.connect(deployer).buyToken(tokens.target, 0),
        ).to.be.revertedWith("Seller can not buy his tokens");
      });

      it("Should revert with the right error if seller is the owner of the token", async () => {
        const { listings, deployer, secondAccount, thirdAccount, tokens } =
          await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        await listings.connect(deployer).addListing(tokens.target, 0, 1, 1);
        await tokens.safeTransferFrom(deployer, secondAccount, 0);

        await expect(
          listings.connect(thirdAccount).buyToken(tokens.target, 0),
        ).to.be.revertedWith("Seller is not the owner");
      });

      it("Should revert with the right error if contract is not approved", async () => {
        const { listings, deployer, secondAccount, tokens } =
          await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        await listings.connect(deployer).addListing(tokens.target, 0, 1, 1);
        await tokens
          .connect(deployer)
          .setApprovalForAll(listings.target, false);

        await expect(
          listings.connect(secondAccount).buyToken(tokens.target, 0),
        ).to.be.revertedWith("Contract is not approved");
      });

      it("Should revert with the right error if funds mismatch with price", async () => {
        const { listings, deployer, secondAccount, tokens } =
          await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        await listings.connect(deployer).addListing(tokens.target, 0, 1, 1);

        await expect(
          listings
            .connect(secondAccount)
            .buyToken(tokens.target, 0, { value: 10 }),
        ).to.be.revertedWith("Mismatch of funds");
      });

      it("Should not be reverted if listing exists and is called by the creator", async () => {
        const { listings, deployer, secondAccount, tokens } =
          await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        await listings.connect(deployer).addListing(tokens.target, 0, 1, 1);

        await expect(
          listings
            .connect(secondAccount)
            .buyToken(tokens.target, 0, { value: 1 }),
        ).not.to.be.reverted;
      });
    });

    describe("Events", () => {
      it("Should emit an TokenSold event", async () => {
        const { listings, deployer, secondAccount, tokens } =
          await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        await listings.connect(deployer).addListing(tokens.target, 0, 1, 1);

        await expect(
          listings
            .connect(secondAccount)
            .buyToken(tokens.target, 0, { value: 1 }),
        )
          .to.emit(listings, "TokenSold")
          .withArgs(
            1,
            deployer.address,
            secondAccount.address,
            tokens.target,
            0,
            1,
          );
      });
    });

    describe("Transfers", () => {
      it("Should transfer the token to the buyer", async () => {
        const { listings, deployer, secondAccount, tokens } =
          await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        await listings.connect(deployer).addListing(tokens.target, 0, 1, 1);
        await listings
          .connect(secondAccount)
          .buyToken(tokens.target, 0, { value: 1 });

        expect(await tokens.ownerOf(0)).to.equal(secondAccount.address);
      });

      it("Removes listing from the state", async () => {
        const { listings, deployer, secondAccount, tokens } =
          await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        await listings.connect(deployer).addListing(tokens.target, 0, 1, 1);
        await listings
          .connect(secondAccount)
          .buyToken(tokens.target, 0, { value: 1 });

        const [id, price, seller, expireTime] = await listings.getListing(
          tokens.target,
          0,
        );

        expect(id).to.equal(0);
        expect(price).to.equal(0);
        expect(seller).to.equal(ethers.ZeroAddress);
        expect(expireTime).to.equal(0);
      });
    });
  });
});
