const {
  time,
  setBalance,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Domains", () => {
  async function deployFixture() {
    const [deployer, secondAccount, thirdAccount] = await ethers.getSigners();
    const DomainsContract = await ethers.getContractFactory("Domains");
    const initData = {
      name: "name",
      symbol: "symbol",
      baseURI: "testURI",
    };
    const contract = await DomainsContract.deploy(...Object.values(initData));
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

    it("Should set the right initial base uri", async () => {
      const { contract, baseURI } = await loadFixture(deployFixture);

      expect(await contract.currentBaseURI()).to.equal(baseURI);
    });

    it("Should set the right initial safe period", async () => {
      const { contract } = await loadFixture(deployFixture);

      expect(await contract.safePeriodDays()).to.equal(60);
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

    describe("Events", () => {
      it("Should emit a Withdrawal event", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);

        await expect(contract.connect(deployer).withdraw()).to.emit(
          contract,
          "Withdrawal",
        );
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

  describe("SetBaseURI", () => {
    describe("Validations", () => {
      it("Should revert with the right error if the caller is not the owner", async () => {
        const { contract, secondAccount } = await loadFixture(deployFixture);

        await expect(
          contract.connect(secondAccount).setBaseURI("123"),
        ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
      });
    });

    describe("Events", () => {
      it("Should emit a BaseURIChanged event", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);
        const newBaseURI = "test123";

        await expect(contract.connect(deployer).setBaseURI(newBaseURI))
          .to.emit(contract, "BaseURIChanged")
          .withArgs(newBaseURI);
      });
    });

    describe("Transitions", () => {
      it("Should set new base URI", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);
        const newBaseURI = "test123";
        await contract.connect(deployer).setBaseURI(newBaseURI);

        expect(await contract.currentBaseURI()).to.equal(newBaseURI);
      });
    });
  });

  describe("SetSafePeriod", () => {
    describe("Validations", () => {
      it("Should revert with the right error if the caller is not the owner", async () => {
        const { contract, secondAccount } = await loadFixture(deployFixture);

        await expect(
          contract.connect(secondAccount).setSafePeriod(123),
        ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
      });
    });

    describe("Events", () => {
      it("Should emit a SafePeriodChanged event", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);
        const newSafePeriodDays = 120;

        await expect(
          contract.connect(deployer).setSafePeriod(newSafePeriodDays),
        )
          .to.emit(contract, "SafePeriodChanged")
          .withArgs(newSafePeriodDays);
      });
    });

    describe("Transitions", () => {
      it("Should set new safe period", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);
        const newSafePeriodDays = 120;
        await contract.connect(deployer).setSafePeriod(newSafePeriodDays);

        expect(await contract.safePeriodDays()).to.equal(newSafePeriodDays);
      });
    });
  });

  describe("SetPricePerNameLength", () => {
    describe("Validations", () => {
      it("Should revert with the right error if the caller is not the owner", async () => {
        const { contract, secondAccount } = await loadFixture(deployFixture);

        await expect(
          contract.connect(secondAccount).setPricePerNameLength(1, 1),
        ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
      });

      it("Should revert with the right error if length is 0", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);

        await expect(
          contract.connect(deployer).setPricePerNameLength(0, 0),
        ).to.be.revertedWith("Length must be > 0");
      });

      it("Should revert with the right error if length is more than 5", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);

        await expect(
          contract.connect(deployer).setPricePerNameLength(6, 0),
        ).to.be.revertedWith("Length must be < 6");
      });

      it("Should revert with the right error if price is 0", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);

        await expect(
          contract.connect(deployer).setPricePerNameLength(5, 0),
        ).to.be.revertedWith("Price must be > 0");
      });
    });

    describe("Events", () => {
      it("Should emit a PricePerNameLengthChanged event", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);
        const length = 2;
        const price = 123456;

        await expect(
          contract.connect(deployer).setPricePerNameLength(length, price),
        )
          .to.emit(contract, "PricePerNameLengthChanged")
          .withArgs(length, price);
      });
    });

    describe("Transitions", () => {
      it("Should set price per name length", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);
        const length = 2;
        const price = 123456;
        await contract.connect(deployer).setPricePerNameLength(length, price);

        expect(await contract.getPricePerNameLength(length)).to.equal(price);
      });
    });
  });

  describe("SetDiscountPerYear", () => {
    describe("Validations", () => {
      it("Should revert with the right error if the caller is not the owner", async () => {
        const { contract, secondAccount } = await loadFixture(deployFixture);

        await expect(
          contract.connect(secondAccount).setDiscountPerYear(0, 0),
        ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
      });

      it("Should revert with the right error if year number is 0", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);

        await expect(
          contract.connect(deployer).setDiscountPerYear(0, 0),
        ).to.be.revertedWith("Year number must be > 0");
      });

      it("Should revert with the right error if length is more than 5", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);

        await expect(
          contract.connect(deployer).setDiscountPerYear(6, 0),
        ).to.be.revertedWith("Year number must be < 6");
      });

      it("Should revert with the right error if percent is more than 100", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);

        await expect(
          contract.connect(deployer).setDiscountPerYear(5, 101),
        ).to.be.revertedWith("Percent must be <= 100");
      });
    });

    describe("Events", () => {
      it("Should emit a DiscountPerYearChanged event", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);
        const year = 3;
        const discount = 55;

        await expect(
          contract.connect(deployer).setDiscountPerYear(year, discount),
        )
          .to.emit(contract, "DiscountPerYearChanged")
          .withArgs(year, discount);
      });
    });

    describe("Transitions", () => {
      it("Should set discount per year", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);
        const year = 3;
        const discount = 55;
        await contract.connect(deployer).setDiscountPerYear(year, discount);

        expect(await contract.getDiscountPerYear(year)).to.equal(discount);
      });
    });
  });

  describe("SetCustomPrice", () => {
    describe("Validations", () => {
      it("Should revert with the right error if the caller is not the owner", async () => {
        const { contract, secondAccount } = await loadFixture(deployFixture);

        await expect(
          contract.connect(secondAccount).setCustomPrice("", 0),
        ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
      });

      it("Should revert with the right error if the name is empty", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);

        await expect(
          contract.connect(deployer).setCustomPrice("", 0),
        ).to.be.revertedWith("Name can not be blank");
      });

      it("Should revert with the right error if the price is 0", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);

        await expect(
          contract.connect(deployer).setCustomPrice("name", 0),
        ).to.be.revertedWith("Price must be > 0");
      });
    });

    describe("Events", () => {
      it("Should emit a CustomPriceChanged event", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);
        const [name, price] = ["123", 55];

        await expect(contract.connect(deployer).setCustomPrice(name, price))
          .to.emit(contract, "CustomPriceChanged")
          .withArgs(name, price);
      });
    });

    describe("Transitions", () => {
      it("Should set custom price", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);
        const [name, price] = ["123", 55];
        await contract.connect(deployer).setCustomPrice(name, price);

        expect(await contract.getCustomPrice(name)).to.equal(price);
      });
    });
  });

  describe("SetPrimary", () => {
    describe("Validations", () => {
      it("Should revert with the right error if the name does not exist", async () => {
        const { contract } = await loadFixture(deployFixture);

        await expect(
          contract.setPrimary("doesnotexist", true),
        ).to.be.revertedWith("The name does not exist");
      });

      it("Should revert with the right error if the caller is not the owner", async () => {
        const { contract, deployer, secondAccount } =
          await loadFixture(deployFixture);
        const args = ["name", 100, true];
        const price = await contract.calcNamePrice(args[0], args[1]);
        await contract.connect(deployer).lease(...args, { value: price });

        await expect(
          contract.connect(secondAccount).setPrimary("name", false),
        ).to.be.revertedWith("The caller does not own the name");
      });
    });

    describe("Events", () => {
      it("Should emit a PrimaryNameChanged event", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);
        const args = ["name", 100, false];
        const price = await contract.calcNamePrice(args[0], args[1]);
        await contract.connect(deployer).lease(...args, { value: price });

        await expect(contract.connect(deployer).setPrimary("name", true))
          .to.emit(contract, "PrimaryNameChanged")
          .withArgs(deployer.address, 1, args[0], true);
      });
    });

    describe("Transitions", () => {
      it("Should set name as primary", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);
        const args = ["name", 100, false];
        const price = await contract.calcNamePrice(args[0], args[1]);
        await contract.connect(deployer).lease(...args, { value: price });

        expect(await contract.addressToName(deployer.address)).to.equal("");

        await contract.connect(deployer).setPrimary(args[0], true);

        expect(await contract.addressToName(deployer.address)).to.equal(
          args[0],
        );
      });

      it("Should disable name as primary", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);
        const args = ["name", 100, true];
        const price = await contract.calcNamePrice(args[0], args[1]);
        await contract.connect(deployer).lease(...args, { value: price });

        expect(await contract.addressToName(deployer.address)).to.equal(
          args[0],
        );

        await contract.connect(deployer).setPrimary(args[0], false);

        expect(await contract.addressToName(deployer.address)).to.equal("");
      });

      it("Should not rewrite existing primary if changing amother name", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);
        const args1 = ["name1", 100, true];
        const price1 = await contract.calcNamePrice(args1[0], args1[1]);
        await contract.connect(deployer).lease(...args1, { value: price1 });

        const args2 = ["name2", 100, false];
        const price2 = await contract.calcNamePrice(args2[0], args2[1]);
        await contract.connect(deployer).lease(...args2, { value: price2 });

        await contract.connect(deployer).setPrimary(args2[0], false);

        expect(await contract.addressToName(deployer.address)).to.equal(
          args1[0],
        );
      });
    });
  });

  describe("Lease", () => {
    describe("Validations", () => {
      it("Should revert with the right error if the name is blank", async () => {
        const { contract } = await loadFixture(deployFixture);
        const args = ["", 100, false];

        await expect(contract.lease(...args)).to.be.revertedWith(
          "Name can not be blank",
        );
      });

      it("Should revert with the right error if the lease time is 0", async () => {
        const { contract } = await loadFixture(deployFixture);
        const args = ["name", 0, false];

        await expect(contract.lease(...args)).to.be.revertedWith(
          "Lease time can not be zero",
        );
      });

      it("Should revert with the right error if the name has zero byte", async () => {
        const { contract } = await loadFixture(deployFixture);
        const args = ["name\0", 100, false];

        await expect(contract.lease(...args)).to.be.revertedWith(
          "Name has forbidden characters",
        );
      });

      it("Should revert with the right error if the name has whitespace", async () => {
        const { contract } = await loadFixture(deployFixture);
        const args = ["name ", 100, false];

        await expect(contract.lease(...args)).to.be.revertedWith(
          "Name has forbidden characters",
        );
      });

      it("Should revert with the right error if the name has forbidden utf8 symbols", async () => {
        const { contract } = await loadFixture(deployFixture);
        const args = ["name𞻰", 100, false];

        await expect(contract.lease(...args)).to.be.revertedWith(
          "Name has forbidden characters",
        );
      });

      it("Should revert with the right error if account underpays", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);
        const args = ["name", 100, false];
        const price = await contract.calcNamePrice(args[0], args[1]);

        await expect(
          contract
            .connect(deployer)
            .lease(...args, { value: price - BigInt(1) }),
        ).to.be.revertedWith("Mismatch of funds");
      });

      it("Should revert with the right error if account overpays", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);
        const args = ["name", 100, false];
        const price = await contract.calcNamePrice(args[0], args[1]);

        await expect(
          contract
            .connect(deployer)
            .lease(...args, { value: price + BigInt(1) }),
        ).to.be.revertedWith("Mismatch of funds");
      });

      it("Does not allow to lease a name of another account", async () => {
        const { contract, deployer, secondAccount } =
          await loadFixture(deployFixture);
        const args = ["name", 100, false];
        const price = await contract.calcNamePrice(args[0], args[1]);
        await contract.connect(deployer).lease(...args, { value: price });

        await expect(
          contract.connect(secondAccount).lease(...args, { value: price }),
        ).to.be.revertedWith("The name is still in use");
      });
    });

    describe("Events", () => {
      it("Should emit a Leased event for new lease", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);
        const args = ["name", 100, false];
        const price = await contract.calcNamePrice(args[0], args[1]);
        const timestamp = (await time.latest()) + 100_000;
        await time.setNextBlockTimestamp(timestamp);
        const expiredAt = timestamp + args[1] * 365 * 24 * 60 * 60;

        await expect(
          contract.connect(deployer).lease(...args, { value: price }),
        )
          .to.emit(contract, "Leased")
          .withArgs(
            deployer.address,
            1,
            args[0],
            args[2],
            expiredAt,
            price,
            timestamp,
          );
      });

      it("Should emit a Leased event for existing lease", async () => {
        const { contract, deployer, secondAccount } =
          await loadFixture(deployFixture);
        const args = ["name", 100, false];
        const price = await contract.calcNamePrice(args[0], args[1]);
        await contract.connect(deployer).lease(...args, { value: price });
        const releasedAt = await contract.getReleaseTime(args[0]);
        await time.increaseTo(releasedAt);
        const timestamp = Number(releasedAt) + 1;
        await time.setNextBlockTimestamp(timestamp);
        const newExpiredAt = timestamp + args[1] * 365 * 24 * 60 * 60;

        await expect(
          contract.connect(secondAccount).lease(...args, { value: price }),
        )
          .to.emit(contract, "Leased")
          .withArgs(
            secondAccount.address,
            1,
            args[0],
            args[2],
            newExpiredAt,
            price,
            timestamp,
          );
      });
    });

    describe("Transitions", () => {
      describe("New name", () => {
        it("Should set owner of token id", async () => {
          const { contract, deployer } = await loadFixture(deployFixture);
          const args = ["name🀀", 100, false];
          const price = await contract.calcNamePrice(args[0], args[1]);
          await contract.connect(deployer).lease(...args, { value: price });

          expect(await contract.ownerOf(1)).to.equal(deployer.address);
        });

        it("Should set the address for the name", async () => {
          const { contract, deployer } = await loadFixture(deployFixture);
          const args = ["name🯹", 100, false];
          const price = await contract.calcNamePrice(args[0], args[1]);
          await contract.connect(deployer).lease(...args, { value: price });

          expect(await contract.nameToAdress(args[0])).to.equal(
            deployer.address,
          );
        });

        it("Should not set primary name when isPrimary is false", async () => {
          const { contract, deployer } = await loadFixture(deployFixture);
          const args = ["name", 100, false];
          const price = await contract.calcNamePrice(args[0], args[1]);
          await contract.connect(deployer).lease(...args, { value: price });

          expect(await contract.addressToName(deployer.address)).to.equal("");
        });

        it("Should set primary name when isPrimary is true", async () => {
          const { contract, deployer } = await loadFixture(deployFixture);
          const args = ["name", 100, true];
          const price = await contract.calcNamePrice(args[0], args[1]);
          await contract.connect(deployer).lease(...args, { value: price });

          expect(await contract.addressToName(deployer.address)).to.equal(
            args[0],
          );
        });
      });

      describe("Active name", () => {
        it("Allows to lease active name for owner", async () => {
          const { contract, deployer } = await loadFixture(deployFixture);
          const args = ["name", 100, false];
          const price = await contract.calcNamePrice(args[0], args[1]);
          await contract.connect(deployer).lease(...args, { value: price });

          await expect(
            contract.connect(deployer).lease(...args, { value: price }),
          ).not.to.be.reverted;
        });

        it("Does not allow to lease active name for non owner", async () => {
          const { contract, deployer, secondAccount } =
            await loadFixture(deployFixture);
          const args = ["name", 100, false];
          const price = await contract.calcNamePrice(args[0], args[1]);
          await contract.connect(deployer).lease(...args, { value: price });

          await expect(
            contract.connect(secondAccount).lease(...args, { value: price }),
          ).to.be.revertedWith("The name is still in use");
        });
      });

      describe("Expired name", () => {
        it("Allows to lease expired name for owner", async () => {
          const { contract, deployer } = await loadFixture(deployFixture);
          const args = ["name", 100, false];
          const price = await contract.calcNamePrice(args[0], args[1]);
          await contract.connect(deployer).lease(...args, { value: price });
          const expiredAt = await contract.getExpirationTime(args[0]);
          await time.increaseTo(expiredAt);

          await expect(
            contract.connect(deployer).lease(...args, { value: price }),
          ).not.to.be.reverted;
        });

        it("Does not allow to lease expired name for non owner", async () => {
          const { contract, deployer, secondAccount } =
            await loadFixture(deployFixture);
          const args = ["name", 100, false];
          const price = await contract.calcNamePrice(args[0], args[1]);
          await contract.connect(deployer).lease(...args, { value: price });
          const expiredAt = await contract.getExpirationTime(args[0]);
          await time.increaseTo(expiredAt);

          await expect(
            contract.connect(secondAccount).lease(...args, { value: price }),
          ).to.be.revertedWith("The name is still in use");
        });
      });

      describe("Released name", () => {
        it("Allows to lease vacant name for owner", async () => {
          const { contract, deployer } = await loadFixture(deployFixture);
          const args = ["name", 100, false];
          const price = await contract.calcNamePrice(args[0], args[1]);
          await contract.connect(deployer).lease(...args, { value: price });
          const releasedAt = await contract.getReleaseTime(args[0]);
          await time.increaseTo(releasedAt);

          await expect(
            contract.connect(deployer).lease(...args, { value: price }),
          ).not.to.be.reverted;
        });

        it("Allows to lease vacant name for non owner", async () => {
          const { contract, deployer, secondAccount } =
            await loadFixture(deployFixture);
          const args = ["name", 100, false];
          const price = await contract.calcNamePrice(args[0], args[1]);
          await contract.connect(deployer).lease(...args, { value: price });
          const releasedAt = await contract.getReleaseTime(args[0]);
          await time.increaseTo(releasedAt);

          await expect(
            contract.connect(secondAccount).lease(...args, { value: price }),
          ).not.to.be.reverted;
          expect(await contract.ownerOf(1)).to.equal(secondAccount.address);
        });
      });

      describe("Expired at changes", () => {
        it("Updates expiredAt with new lease call", async () => {
          const { contract, deployer } = await loadFixture(deployFixture);
          const args = ["name", 100, false];
          const price = await contract.calcNamePrice(args[0], args[1]);
          const timestamp = (await time.latest()) + 100_000;
          await time.setNextBlockTimestamp(timestamp);
          await contract.connect(deployer).lease(...args, { value: price });
          const expiredAt = timestamp + args[1] * 365 * 24 * 60 * 60;

          expect(await contract.getExpirationTime(args[0])).to.equal(expiredAt);

          const newTimestamp = (await time.latest()) + 200_000;
          await time.setNextBlockTimestamp(newTimestamp);
          await contract.connect(deployer).lease(...args, { value: price });
          const newExpiredAt = newTimestamp + args[1] * 365 * 24 * 60 * 60;

          expect(await contract.getExpirationTime(args[0])).to.equal(
            newExpiredAt,
          );
        });
      });

      describe("Primary name changes", () => {
        it("Updates isPrimary with new lease call", async () => {
          const { contract, deployer } = await loadFixture(deployFixture);
          const args1 = ["name", 100, false];
          const price = await contract.calcNamePrice(args1[0], args1[1]);
          await contract.connect(deployer).lease(...args1, { value: price });

          expect(await contract.addressToName(deployer.address)).to.equal("");

          const args2 = ["name", 100, true];
          await contract.connect(deployer).lease(...args2, { value: price });

          expect(await contract.addressToName(deployer.address)).to.equal(
            args2[0],
          );
        });

        it("Should rewrite primary name with new name", async () => {
          const { contract, deployer } = await loadFixture(deployFixture);
          const args1 = ["name", 100, true];
          const price1 = await contract.calcNamePrice(args1[0], args1[1]);
          await contract.connect(deployer).lease(...args1, { value: price1 });

          const args2 = ["name2", 100, true];
          const price2 = await contract.calcNamePrice(args2[0], args2[1]);
          await contract.connect(deployer).lease(...args2, { value: price2 });

          expect(await contract.addressToName(deployer.address)).to.equal(
            args2[0],
          );
        });

        it("Should not rewrite existing primary name", async () => {
          const { contract, deployer } = await loadFixture(deployFixture);
          const args1 = ["name", 100, true];
          const price1 = await contract.calcNamePrice(args1[0], args1[1]);
          await contract.connect(deployer).lease(...args1, { value: price1 });

          const args2 = ["name2", 100, false];
          const price2 = await contract.calcNamePrice(args2[0], args2[1]);
          await contract.connect(deployer).lease(...args2, { value: price2 });

          expect(await contract.addressToName(deployer.address)).to.equal(
            args1[0],
          );
        });
      });
    });
  });

  describe("tokenIdToFullName", () => {
    it("Returns empty string if there is no token", async () => {
      const { contract } = await loadFixture(deployFixture);

      expect(await contract.tokenIdToFullName(123)).to.equal("");
    });

    it("Correctly maps token id to a name", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const args = ["name", 100, false];
      const price = await contract.calcNamePrice(args[0], args[1]);
      await contract.connect(deployer).lease(...args, { value: price });

      expect(await contract.tokenIdToFullName(1)).to.equal(
        args[0] + (await contract.TOP_LEVEL_DOMAIN()),
      );
    });
  });

  describe("NameToAdress", () => {
    it("Returns zero address if there is no such name", async () => {
      const { contract } = await loadFixture(deployFixture);

      expect(await contract.nameToAdress("doesnotexist")).to.equal(
        ethers.ZeroAddress,
      );
    });

    it("Returns zero address if the name is expired", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const args = ["name", 100, false];
      const price = await contract.calcNamePrice(args[0], args[1]);
      await contract.connect(deployer).lease(...args, { value: price });
      const expiredAt = Number(await contract.getExpirationTime(args[0])) + 1;
      await time.increaseTo(expiredAt);

      expect(await contract.nameToAdress(args[0])).to.equal(ethers.ZeroAddress);
    });

    it("Correctly maps active name to address", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const args = ["name", 100, false];
      const price = await contract.calcNamePrice(args[0], args[1]);
      await contract.connect(deployer).lease(...args, { value: price });

      expect(await contract.nameToAdress(args[0])).to.equal(deployer.address);
    });
  });

  describe("FullNameToAdress", () => {
    describe("Validations", () => {
      it("Should revert with the right error if the length <= 4", async () => {
        const { contract } = await loadFixture(deployFixture);
        const name = "1234";

        await expect(contract.fullNameToAddress(name)).to.be.revertedWith(
          "Name is too short",
        );
      });

      it("Should revert with the right error if name does not have right suffix", async () => {
        const { contract } = await loadFixture(deployFixture);
        const name = "12345";

        await expect(contract.fullNameToAddress(name)).to.be.revertedWith(
          "Incorrect name",
        );
      });
    });

    it("Returns zero address if there is no such name", async () => {
      const { contract } = await loadFixture(deployFixture);
      const name = "doesnotexist" + (await contract.TOP_LEVEL_DOMAIN());

      expect(await contract.fullNameToAddress(name)).to.equal(
        ethers.ZeroAddress,
      );
    });

    it("Returns zero address if the name is expired", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const args = ["name", 100, false];
      const price = await contract.calcNamePrice(args[0], args[1]);
      await contract.connect(deployer).lease(...args, { value: price });
      const expiredAt = Number(await contract.getExpirationTime(args[0])) + 1;
      await time.increaseTo(expiredAt);

      expect(
        await contract.fullNameToAddress(
          args[0] + (await contract.TOP_LEVEL_DOMAIN()),
        ),
      ).to.equal(ethers.ZeroAddress);
    });

    it("Correctly maps active name to address", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const args = ["name", 100, false];
      const price = await contract.calcNamePrice(args[0], args[1]);
      await contract.connect(deployer).lease(...args, { value: price });

      expect(
        await contract.fullNameToAddress(
          args[0] + (await contract.TOP_LEVEL_DOMAIN()),
        ),
      ).to.equal(deployer.address);
    });
  });

  describe("AddressToName", () => {
    it("Returns empty string if there is no such name", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);

      expect(await contract.addressToName(deployer.address)).to.equal("");
    });

    it("Returns empty string if there is no primary address for an account", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const args = ["name", 100, false];
      const price = await contract.calcNamePrice(args[0], args[1]);
      await contract.connect(deployer).lease(...args, { value: price });

      expect(await contract.addressToName(deployer.address)).to.equal("");
    });

    it("Returns empty string if the name is expired", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const args = ["name", 100, true];
      const price = await contract.calcNamePrice(args[0], args[1]);
      await contract.connect(deployer).lease(...args, { value: price });
      const expiredAt = await contract.getExpirationTime(args[0]);
      await time.increaseTo(expiredAt);

      expect(await contract.addressToName(deployer.address)).to.equal("");
    });

    it("Returns empty string if the name has been moved to another account", async () => {
      const { contract, deployer, secondAccount } =
        await loadFixture(deployFixture);
      const args = ["name", 100, true];
      const price = await contract.calcNamePrice(args[0], args[1]);
      await contract.connect(deployer).lease(...args, { value: price });
      await contract.safeTransferFrom(
        deployer.address,
        secondAccount.address,
        1,
      );

      expect(await contract.addressToName(deployer.address)).to.equal("");
    });

    it("Correctly returns name for an account", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const args = ["name", 100, true];
      const price = await contract.calcNamePrice(args[0], args[1]);
      await contract.connect(deployer).lease(...args, { value: price });

      expect(await contract.addressToName(deployer.address)).to.equal(args[0]);
    });
  });

  describe("AddressToFullName", () => {
    it("Returns empty string if there is no such name", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);

      expect(await contract.addressToFullName(deployer.address)).to.equal("");
    });

    it("Returns empty string if there is no primary address for an account", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const args = ["name", 100, false];
      const price = await contract.calcNamePrice(args[0], args[1]);
      await contract.connect(deployer).lease(...args, { value: price });

      expect(await contract.addressToFullName(deployer.address)).to.equal("");
    });

    it("Returns empty string if the name is expired", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const args = ["name", 100, true];
      const price = await contract.calcNamePrice(args[0], args[1]);
      await contract.connect(deployer).lease(...args, { value: price });
      const expiredAt = await contract.getExpirationTime(args[0]);
      await time.increaseTo(expiredAt);

      expect(await contract.addressToFullName(deployer.address)).to.equal("");
    });

    it("Returns empty string if the name has been moved to another account", async () => {
      const { contract, deployer, secondAccount } =
        await loadFixture(deployFixture);
      const args = ["name", 100, true];
      const price = await contract.calcNamePrice(args[0], args[1]);
      await contract.connect(deployer).lease(...args, { value: price });
      await contract.safeTransferFrom(
        deployer.address,
        secondAccount.address,
        1,
      );

      expect(await contract.addressToFullName(deployer.address)).to.equal("");
    });

    it("Correctly returns name for an account", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const args = ["name", 100, true];
      const price = await contract.calcNamePrice(args[0], args[1]);
      await contract.connect(deployer).lease(...args, { value: price });

      expect(await contract.addressToFullName(deployer.address)).to.equal(
        args[0] + (await contract.TOP_LEVEL_DOMAIN()),
      );
    });
  });

  describe("GetExpirationTime", () => {
    it("Returns zero if there is no such name", async () => {
      const { contract } = await loadFixture(deployFixture);

      expect(await contract.getExpirationTime("doesnotexist")).to.equal(0);
    });

    it("Correctly returns the expiration timestamp", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const args = ["name", 100, false];
      const price = await contract.calcNamePrice(args[0], args[1]);
      const timestamp = (await time.latest()) + 100;
      await time.setNextBlockTimestamp(timestamp);
      await contract.connect(deployer).lease(...args, { value: price });
      const expiredAt = timestamp + args[1] * 365 * 24 * 60 * 60;

      expect(await contract.getExpirationTime(args[0])).to.equal(expiredAt);
    });
  });

  describe("GetReleaseTime", () => {
    it("Returns zero if there is no such name", async () => {
      const { contract } = await loadFixture(deployFixture);

      expect(await contract.getReleaseTime("doesnotexist")).to.equal(0);
    });

    it("Correctly returns the release timestamp", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const args = ["name", 100, false];
      const price = await contract.calcNamePrice(args[0], args[1]);
      const timestamp = (await time.latest()) + 100;
      await time.setNextBlockTimestamp(timestamp);
      await contract.connect(deployer).lease(...args, { value: price });
      const expiredAt = timestamp + args[1] * 365 * 24 * 60 * 60;
      const releasedAt =
        expiredAt + Number(await contract.safePeriodDays()) * 24 * 60 * 60;

      expect(await contract.getReleaseTime(args[0])).to.equal(releasedAt);
    });
  });

  describe("GetPricePerNameLength", () => {
    describe("Validations", () => {
      it("Should revert with the right error if length is 0", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);

        await expect(
          contract.connect(deployer).getPricePerNameLength(0),
        ).to.be.revertedWith("Length must be > 0");
      });
    });

    it("Should returns price per name length under 5 chars", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const length = 2;
      const price = 123456;
      await contract.connect(deployer).setPricePerNameLength(length, price);

      expect(await contract.getPricePerNameLength(length)).to.equal(price);
    });

    it("Should returns price per name length above 5 chars", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const length = 5;
      const price = 123;
      await contract.connect(deployer).setPricePerNameLength(length, price);

      expect(await contract.getPricePerNameLength(length + 100)).to.equal(
        price,
      );
    });
  });

  describe("GetDiscountPerYear", () => {
    describe("Validations", () => {
      it("Should revert with the right error if year number is 0", async () => {
        const { contract, deployer } = await loadFixture(deployFixture);

        await expect(
          contract.connect(deployer).getDiscountPerYear(0),
        ).to.be.revertedWith("Year number must be > 0");
      });
    });

    it("Should returns discount per years under 5", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const years = 2;
      const discount = 12;
      await contract.connect(deployer).setDiscountPerYear(years, discount);

      expect(await contract.getDiscountPerYear(years)).to.equal(discount);
    });

    it("Should returns discount per years above 5", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const years = 5;
      const discount = 12;
      await contract.connect(deployer).setDiscountPerYear(years, discount);

      expect(await contract.getDiscountPerYear(years + 10)).to.equal(discount);
    });
  });

  describe("GetDiscountPerYear", () => {
    it("Returns 0 if there is no such name", async () => {
      const { contract } = await loadFixture(deployFixture);

      expect(await contract.getCustomPrice("doesnotexist")).to.equal(0);
    });

    it("Returns custom price for name", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const [name, price] = ["name", 123];
      await contract.connect(deployer).setCustomPrice(name, price);

      expect(await contract.getCustomPrice(name)).to.equal(price);
    });
  });

  describe("CalcNamePrice", () => {
    it("Should correctly return price for name by length", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const [name, years] = ["mydomain", BigInt(123)];
      const pricePerLength = await contract.getPricePerNameLength(name.length);
      const yearDiscount = await contract.getDiscountPerYear(years);

      expect(await contract.calcNamePrice(name, years)).to.equal(
        (pricePerLength * years * (BigInt(100) - yearDiscount)) / BigInt(100),
      );
    });

    it("Should correctly return price for name with custom price", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const [name, years, customPrice] = ["mydomain", BigInt(123), BigInt(999)];
      await contract.setCustomPrice(name, customPrice);
      const yearDiscount = await contract.getDiscountPerYear(years);

      expect(await contract.calcNamePrice(name, years)).to.equal(
        (customPrice * years * (BigInt(100) - yearDiscount)) / BigInt(100),
      );
    });
  });

  describe("IsVacant", () => {
    it("Returns true is there is no such name", async () => {
      const { contract } = await loadFixture(deployFixture);

      expect(await contract.isVacant("abc")).to.equal(true);
    });

    it("Returns false for active domain name", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const args = ["name", 100, true];
      const price = await contract.calcNamePrice(args[0], args[1]);
      await contract.connect(deployer).lease(...args, { value: price });

      expect(await contract.isVacant(args[0])).to.equal(false);
    });

    it("Returns false for expired domain name", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const args = ["name", 100, true];
      const price = await contract.calcNamePrice(args[0], args[1]);
      await contract.connect(deployer).lease(...args, { value: price });
      const expiredAt = await contract.getExpirationTime(args[0]);
      await time.increaseTo(expiredAt);

      expect(await contract.isVacant(args[0])).to.equal(false);
    });

    it("Returns true for released domain name", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const args = ["name", 100, true];
      const price = await contract.calcNamePrice(args[0], args[1]);
      await contract.connect(deployer).lease(...args, { value: price });
      const releasedAt = Number(await contract.getReleaseTime(args[0]));
      await time.increaseTo(releasedAt + 1);

      expect(await contract.isVacant(args[0])).to.equal(true);
    });
  });

  describe("TotalSupply", () => {
    it("Returns 0 if there are no names", async () => {
      const { contract } = await loadFixture(deployFixture);

      expect(await contract.totalSupply()).to.equal(0);
    });

    it("Returns 1 if there is 1 mint", async () => {
      const { contract, deployer } = await loadFixture(deployFixture);
      const args = ["name", 100, true];
      const price = await contract.calcNamePrice(args[0], args[1]);
      await contract.connect(deployer).lease(...args, { value: price });

      expect(await contract.totalSupply()).to.equal(1);
    });
  });

  describe("TransferFrom", () => {
    it("Changes owner of the name for transfered token", async () => {
      const { contract, deployer, secondAccount } =
        await loadFixture(deployFixture);
      const args = ["name", 100, true];
      const price = await contract.calcNamePrice(args[0], args[1]);
      await contract.connect(deployer).lease(...args, { value: price });
      await contract.transferFrom(deployer.address, secondAccount.address, 1);

      expect(await contract.addressToName(deployer.address)).to.equal("");
      expect(await contract.addressToFullName(deployer.address)).to.equal("");
      expect(await contract.nameToAdress(args[0])).to.equal(
        secondAccount.address,
      );
    });
  });
});
