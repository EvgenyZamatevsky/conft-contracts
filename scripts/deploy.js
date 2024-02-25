// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  const listingsErc721 = await hre.ethers.deployContract("ListingsERC721", [], {});
  await listingsErc721.waitForDeployment();
  console.log(`ListingsERC721 deployed to ${listingsErc721.target}`);

  const listingsErc1155 = await hre.ethers.deployContract("ListingsERC1155", [], {});
  await listingsErc1155.waitForDeployment();
  console.log(`ListingsERC1155 deployed to ${listingsErc1155.target}`);

  const mint = await hre.ethers.deployContract("CoNFT", [0], {});
  await mint.waitForDeployment();
  console.log(`CoNFT deployed to ${mint.target}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
