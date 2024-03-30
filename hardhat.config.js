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
    sepolia: {
      url: "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
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
    blast: {
      url: "https://rpc.blast.io",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    rsktestnet: {
      chainId: 31,
      url: "https://public-node.testnet.rsk.co",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    rootstock: {
      chainId: 30,
      url: "https://public-node.rsk.co",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    taiko_katla_testnet: {
      chainId: 167008,
      url: "https://rpc.katla.taiko.xyz",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    xlayer_testnet: {
      chainId: 195,
      url: "https://testrpc.xlayer.tech",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    xlayer: {
      chainId: 196,
      url: "https://rpc.xlayer.tech",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY,
      linea_testnet: process.env.LINEASCAN_API_KEY,
      linea_mainnet: process.env.LINEASCAN_API_KEY,
      blast_sepolia: "blast_sepolia", // apiKey is not required, just set a placeholder,
      blast: process.env.BLASTSCAN_API_KEY,
      rsktestnet: "abc", // apiKey is not required, just set a placeholder,
      rootstock: "abc", // apiKey is not required, just set a placeholder,
      taiko_katla_testnet: "abc", // apiKey is not required, just set a placeholder,
      xlayer_testnet: process.env.XLAYER_API_KEY,
      xlayer: "abc", // apiKey is not required, just set a placeholder,
    },
    customChains: [
      {
        network: "sepolia",
        chainId: 11155111,
        urls: {
          apiURL: "https://api-sepolia.etherscan.io/api",
          browserURL: "https://sepolia.etherscan.io",
        },
      },
      {
        network: "linea_testnet",
        chainId: 59140,
        urls: {
          apiURL: "https://api-testnet.lineascan.build/api",
          browserURL: "https://goerli.lineascan.build/",
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
      {
        network: "blast",
        chainId: 81457,
        urls: {
          apiURL: "https://api.blastscan.io/api",
          browserURL: "https://blastscan.io",
        },
      },
      {
        network: "rsktestnet",
        chainId: 31,
        urls: {
          apiURL: "https://rootstock-testnet.blockscout.com/api",
          browserURL: "https://rootstock-testnet.blockscout.com",
        },
      },
      {
        network: "rootstock",
        chainId: 30,
        urls: {
          apiURL: "https://rootstock.blockscout.com/api",
          browserURL: "https://rootstock.blockscout.com",
        },
      },
      {
        network: "taiko_katla_testnet",
        chainId: 167008,
        urls: {
          apiURL:
            "https://blockscoutapi.katla.taiko.xyz/api?module=contract&action=verify",
          browserURL: "https://explorer.katla.taiko.xyz",
        },
      },
      {
        network: "xlayer_testnet",
        chainId: 195,
        urls: {
          apiURL:
            "https://www.oklink.com/api/explorer/v1/contract/verify/async/api/xlayer_test",
          browserURL: "https://www.oklink.com/xlayer-test",
        },
      },
      {
        network: "xlayer",
        chainId: 196,
        urls: {
          apiURL: "https://www.okx.com/explorer/xlayer/api",
          browserURL: "https://www.okx.com/explorer/xlayer",
        },
      },
    ],
  },
};
