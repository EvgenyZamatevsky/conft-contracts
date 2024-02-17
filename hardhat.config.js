require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  gasReporter: {
    enabled: true,
    excludeContracts: ["/test"],
  },
  networks: {
    linea_testnet: {
      url: `https://rpc.goerli.linea.build/`,
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    linea_mainnet: {
      url: `https://rpc.linea.build/`,
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    blast_sepolia: {
      url: "https://sepolia.blast.io",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      linea_testnet: process.env.LINEASCAN_API_KEY,
      linea_mainnet: process.env.LINEASCAN_API_KEY,
      blast_sepolia: "blast_sepolia", // apiKey is not required, just set a placeholder
    },
    customChains: [
      {
        network: "linea_testnet",
        chainId: 59140,
        urls: {
          apiURL: "https://api-testnet.lineascan.build/api",
          browserURL: "https://goerli.lineascan.build/address",
        },
      },
      {
        network: "linea_mainnet",
        chainId: 59144,
        urls: {
          apiURL: "https://api.lineascan.build/api",
          browserURL: "https://lineascan.build/",
        },
      },
      {
        network: "blast_sepolia",
        chainId: 168587773,
        urls: {
          apiURL:
            "https://api.routescan.io/v2/network/testnet/evm/168587773/etherscan",
          browserURL: "https://testnet.blastscan.io",
        },
      },
    ],
  },
};
