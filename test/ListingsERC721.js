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

    it("Should set comission percentage to 0", async function () {
      const { listings, deployer } = await loadFixture(deployFixture);

      expect(await listings.comissionPercent()).to.equal(0);
    });
  });

  describe("SetComissionPercent", () => {
    describe("Validations", () => {
      it("Should revert with the right error if called by not contract owner", async () => {
        const { listings, secondAccount } = await loadFixture(deployFixture);

        await expect(
          listings.connect(secondAccount).setComissionPercent(0),
        ).to.be.revertedWithCustomError(listings, "OwnableUnauthorizedAccount");
      });

      it("Should revert with the right error if percentage more than 99", async () => {
        const { listings, deployer } = await loadFixture(deployFixture);

        await expect(
          listings.connect(deployer).setComissionPercent(100),
        ).to.be.revertedWith("Comission % must be < 100");
      });
    });

    it("Sets comission percentage", async () => {
      const { listings, deployer } = await loadFixture(deployFixture);
      const newPercentage = 90;
      await listings.connect(deployer).setComissionPercent(newPercentage);
      expect(await listings.comissionPercent()).to.equal(newPercentage);
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
        const newBalance = 123;
        await setBalance(listings.target, newBalance);

        await expect(listings.withdraw()).to.changeEtherBalances(
          [deployer, listings],
          [newBalance, -newBalance],
        );
      });
    });
  });

  describe("AddListing", () => {
    describe("Validations", () => {
      it("Should revert with the right error if called with zero price", async () => {
        const { listings, secondAccount, tokens } =
          await loadFixture(deployFixture);
        const [tokenId, price, duration] = [0, 0, 0];

        await expect(
          listings
            .connect(secondAccount)
            .addListing(tokens.target, tokenId, price, duration),
        ).to.be.revertedWith("Price must be > 0");
      });

      it("Should revert with the right error if called with zero duration", async () => {
        const { listings, secondAccount, tokens } =
          await loadFixture(deployFixture);
        const [tokenId, price, duration] = [0, 1, 0];

        await expect(
          listings
            .connect(secondAccount)
            .addListing(tokens.target, tokenId, price, duration),
        ).to.be.revertedWith("Duration must be > 0");
      });

      it("Should revert with the right error if called by not token owner", async () => {
        const { listings, deployer, secondAccount, tokens } =
          await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        const [tokenId, price, duration] = [0, 1, 1];

        await expect(
          listings
            .connect(secondAccount)
            .addListing(tokens.target, tokenId, price, duration),
        ).to.be.revertedWith("Caller is not the owner");
      });

      it("Should revert with the right error if contract not approved", async () => {
        const { listings, deployer, tokens } = await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        const [tokenId, price, duration] = [0, 1, 1];

        await expect(
          listings
            .connect(deployer)
            .addListing(tokens.target, tokenId, price, duration),
        ).to.be.revertedWith("Contract is not approved");
      });

      it("Should not be reverted for token owner and approved contract", async () => {
        const { listings, deployer, tokens } = await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        const [tokenId, price, duration] = [0, 1, 1];

        await expect(
          listings
            .connect(deployer)
            .addListing(tokens.target, tokenId, price, duration),
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
        const [tokenId, price, duration] = [0, 1, 1];

        await expect(
          listings
            .connect(deployer)
            .addListing(tokens.target, tokenId, price, duration),
        )
          .to.emit(listings, "ListingCreated")
          .withArgs(
            1,
            deployer.address,
            tokens.target,
            tokenId,
            price,
            timestamp + duration * 3600,
          );
      });
    });

    it("Saves listing to the state", async () => {
      const { listings, deployer, tokens } = await loadFixture(deployFixture);
      await tokens.connect(deployer).safeMint();
      await tokens.connect(deployer).setApprovalForAll(listings.target, true);
      const [tokenId, price, duration] = [0, 1, 1];
      await listings
        .connect(deployer)
        .addListing(tokens.target, tokenId, price, duration);
      const listing = await listings.getListing(tokens.target, tokenId);

      expect(listing.id).to.equal(1);
      expect(listing.price).to.equal(price);
      expect(listing.seller).to.equal(deployer.address);
      expect(listing.expireTime).to.equal(
        (await time.latest()) + duration * 3600,
      );
    });
  });

  describe("CancelListing", () => {
    describe("Validations", () => {
      it("Should revert with the right error if there is no listing", async () => {
        const { listings, secondAccount, tokens } =
          await loadFixture(deployFixture);
        const tokenId = 0;

        await expect(
          listings.connect(secondAccount).cancelListing(tokens.target, tokenId),
        ).to.be.revertedWith("Listing does not exist");
      });

      it("Should revert with the right error if caller is not listing's creator", async () => {
        const { listings, deployer, secondAccount, tokens } =
          await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        const [tokenId, price, duration] = [0, 1, 1];
        await listings
          .connect(deployer)
          .addListing(tokens.target, tokenId, price, duration);

        await expect(
          listings.connect(secondAccount).cancelListing(tokens.target, tokenId),
        ).to.be.revertedWith("Caller is not the seller");
      });

      it("Should not be reverted if listing exists and is called by the creator", async () => {
        const { listings, deployer, tokens } = await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        const [tokenId, price, duration] = [0, 1, 1];
        await listings
          .connect(deployer)
          .addListing(tokens.target, tokenId, price, duration);

        await expect(
          listings.connect(deployer).cancelListing(tokens.target, tokenId),
        ).not.to.be.reverted;
      });
    });

    describe("Events", () => {
      it("Should emit an ListingRemoved event", async () => {
        const { listings, deployer, tokens } = await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        const timestamp = (await time.latest()) + 100_000;
        await time.setNextBlockTimestamp(timestamp);
        const [tokenId, price, duration] = [0, 1, 1];
        await listings
          .connect(deployer)
          .addListing(tokens.target, tokenId, price, duration);

        await expect(
          listings.connect(deployer).cancelListing(tokens.target, tokenId),
        )
          .to.emit(listings, "ListingRemoved")
          .withArgs(
            1,
            deployer.address,
            tokens.target,
            tokenId,
            price,
            timestamp + duration * 3600,
          );
      });
    });

    it("Removes listing from the state", async () => {
      const { listings, deployer, tokens } = await loadFixture(deployFixture);
      await tokens.connect(deployer).safeMint();
      await tokens.connect(deployer).setApprovalForAll(listings.target, true);
      const [tokenId, price, duration] = [0, 1, 1];
      await listings
        .connect(deployer)
        .addListing(tokens.target, tokenId, price, duration);
      await listings.connect(deployer).cancelListing(tokens.target, tokenId);
      const listing = await listings.getListing(tokens.target, tokenId);

      expect(listing.id).to.equal(0);
      expect(listing.price).to.equal(0);
      expect(listing.seller).to.equal(ethers.ZeroAddress);
      expect(listing.expireTime).to.equal(0);
    });
  });

  describe("BuyToken", () => {
    describe("Validations", () => {
      it("Should revert with the right error if there is no listing", async () => {
        const { listings, secondAccount, tokens } =
          await loadFixture(deployFixture);
        const tokenId = 0;

        await expect(
          listings.connect(secondAccount).buyToken(tokens.target, tokenId),
        ).to.be.revertedWith("Listing does not exist");
      });

      it("Should revert with the right error if listing is expired", async () => {
        const { listings, deployer, secondAccount, tokens } =
          await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        const [tokenId, price, duration] = [0, 1, 1];
        await listings
          .connect(deployer)
          .addListing(tokens.target, tokenId, price, duration);
        const listing = await listings.getListing(tokens.target, tokenId);
        await time.increaseTo(listing.expireTime);

        await expect(
          listings.connect(secondAccount).buyToken(tokens.target, tokenId),
        ).to.be.revertedWith("Listing is expired");
      });

      it("Should revert with the right error if seller tries to buy it token", async () => {
        const { listings, deployer, tokens } = await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        const [tokenId, price, duration] = [0, 1, 1];
        await listings
          .connect(deployer)
          .addListing(tokens.target, tokenId, price, duration);

        await expect(
          listings.connect(deployer).buyToken(tokens.target, tokenId),
        ).to.be.revertedWith("Seller can not buy his tokens");
      });

      it("Should revert with the right error if seller is the owner of the token", async () => {
        const { listings, deployer, secondAccount, thirdAccount, tokens } =
          await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        const [tokenId, price, duration] = [0, 1, 1];
        await listings
          .connect(deployer)
          .addListing(tokens.target, tokenId, price, duration);
        await tokens.safeTransferFrom(deployer, secondAccount, tokenId);

        await expect(
          listings.connect(thirdAccount).buyToken(tokens.target, tokenId),
        ).to.be.revertedWith("Seller is not the owner");
      });

      it("Should revert with the right error if contract is not approved", async () => {
        const { listings, deployer, secondAccount, tokens } =
          await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        const [tokenId, price, duration] = [0, 1, 1];
        await listings
          .connect(deployer)
          .addListing(tokens.target, tokenId, price, duration);
        await tokens
          .connect(deployer)
          .setApprovalForAll(listings.target, false);

        await expect(
          listings.connect(secondAccount).buyToken(tokens.target, tokenId),
        ).to.be.revertedWith("Contract is not approved");
      });

      it("Should revert with the right error if funds mismatch with price", async () => {
        const { listings, deployer, secondAccount, tokens } =
          await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        const [tokenId, price, duration] = [0, 1, 1];
        await listings
          .connect(deployer)
          .addListing(tokens.target, tokenId, price, duration);

        await expect(
          listings
            .connect(secondAccount)
            .buyToken(tokens.target, tokenId, { value: 10 }),
        ).to.be.revertedWith("Mismatch of funds");
      });

      it("Should not be reverted if listing exists and is called by the creator", async () => {
        const { listings, deployer, secondAccount, tokens } =
          await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        const [tokenId, price, duration] = [0, 1, 1];
        await listings
          .connect(deployer)
          .addListing(tokens.target, tokenId, price, duration);

        await expect(
          listings
            .connect(secondAccount)
            .buyToken(tokens.target, tokenId, { value: price }),
        ).not.to.be.reverted;
      });
    });

    describe("Events", () => {
      it("Should emit an TokenSold event", async () => {
        const { listings, deployer, secondAccount, tokens } =
          await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        const [tokenId, price, duration] = [0, 1, 1];
        await listings
          .connect(deployer)
          .addListing(tokens.target, tokenId, price, duration);

        await expect(
          listings
            .connect(secondAccount)
            .buyToken(tokens.target, tokenId, { value: price }),
        )
          .to.emit(listings, "TokenSold")
          .withArgs(
            1,
            deployer.address,
            secondAccount.address,
            tokens.target,
            tokenId,
            price,
          );
      });
    });

    describe("Transfers", () => {
      it("Should transfer the token to the buyer", async () => {
        const { listings, deployer, secondAccount, tokens } =
          await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        const [tokenId, price, duration] = [0, 1, 1];
        await listings
          .connect(deployer)
          .addListing(tokens.target, tokenId, price, duration);
        await listings
          .connect(secondAccount)
          .buyToken(tokens.target, tokenId, { value: price });

        expect(await tokens.ownerOf(tokenId)).to.equal(secondAccount.address);
      });

      it("Removes listing from the state", async () => {
        const { listings, deployer, secondAccount, tokens } =
          await loadFixture(deployFixture);
        await tokens.connect(deployer).safeMint();
        await tokens.connect(deployer).setApprovalForAll(listings.target, true);
        const [tokenId, price, duration] = [0, 1, 1];
        await listings
          .connect(deployer)
          .addListing(tokens.target, tokenId, price, duration);
        await listings
          .connect(secondAccount)
          .buyToken(tokens.target, tokenId, { value: price });

        const listing = await listings.getListing(tokens.target, tokenId);

        expect(listing.id).to.equal(0);
        expect(listing.price).to.equal(0);
        expect(listing.seller).to.equal(ethers.ZeroAddress);
        expect(listing.expireTime).to.equal(0);
      });
    });
  });
});
