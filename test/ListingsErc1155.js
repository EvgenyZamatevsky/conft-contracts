const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("ListingsERC1155", function () {
  async function deployFixture() {
    const [owner, nonOwner] = await ethers.getSigners();
    const ListingsERC1155 = await ethers.getContractFactory("ListingsERC1155");
    const listings = await ListingsERC1155.deploy();
    return { listings, owner, nonOwner };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { listings, owner } = await loadFixture(deployFixture);
      expect(await listings.owner()).to.equal(owner.address);
    });
  });

  describe("Withdraw", function () {
    describe("Validations", function () {
      it("Should revert with the right error if called from another account", async function () {
        const { listings, nonOwner } = await loadFixture(deployFixture);
        await expect(listings.connect(nonOwner).withdraw()).to.be.revertedWithCustomError(
          listings,
          "OwnableUnauthorizedAccount"
        );
      });
    });

    describe("Transfers", function () {
      it("Should transfer the funds to the owner", async function () {
        const { listings, owner } = await loadFixture(deployFixture);
        await expect(listings.withdraw()).to.changeEtherBalances(
          [owner, listings],
          [0, -0]
        );
      });
    });
  });
});
