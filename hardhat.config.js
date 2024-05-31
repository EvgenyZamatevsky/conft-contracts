require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
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
    ethereum: {
      url: "https://1rpc.io/eth",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    sepolia: {
      url: "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    avalanche: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    arbitrum: {
      url: "https://arbitrum-one-rpc.publicnode.com",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    optimism: {
      url: "https://optimism.drpc.org",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    polygon: {
      url: "https://polygon.drpc.org",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    polygonzkevm: {
      url: "https://rpc.ankr.com/polygon_zkevm",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    fantom: {
      url: "https://rpcapi.fantom.network",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    bsc: {
      url: "https://1rpc.io/bnb",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    opbnb: {
      url: "https://opbnb-rpc.publicnode.com",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    linea_testnet: {
      url: `https://rpc.goerli.linea.build/`,
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    linea: {
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
    rootstock_testnet: {
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
    taiko: {
      url: "https://rpc.taiko.xyz",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    u2u: {
      url: "https://rpc-mainnet.uniultra.xyz",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    ailayer: {
      url: "https://mainnet-rpc.ailayer.xyz",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    zetachain: {
      url: "https://zetachain-evm.blockpi.network/v1/rpc/public",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    merlin: {
      url: "https://merlin.blockpi.network/v1/rpc/public",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    conflux: {
      url: "https://evm.confluxrpc.com",
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
    base_sepolia: {
      url: "https://base-sepolia-rpc.publicnode.com",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    base: {
      url: "https://base-rpc.publicnode.com",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    scroll: {
      url: "https://rpc.scroll.io",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    mode: {
      url: "https://1rpc.io/mode",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    artela_testnet: {
      url: "https://betanet-rpc1.artela.network",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    zora: {
      url: "https://rpc.zora.energy",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    ancient8: {
      url: "https://rpc.ancient8.gg",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    nova: {
      url: "https://arbitrum-nova.publicnode.com",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    bob: {
      url: "https://rpc.gobob.xyz",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    bitlayer: {
      url: "https://rpc.bitlayer.org",
      accounts: [process.env.WALLET_PRIVATE_KEY],
      gasPrice: 100000010,
    },
    satoshivm: {
      url: "https://alpha-rpc-node-http.svmscan.io",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    kakarot_testnet: {
      url: "https://sepolia-rpc.kakarot.org",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
    bera_testnet: {
      url: "https://artio.rpc.berachain.com",
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      ethereum: process.env.ETHERSCAN_API_KEY,
      sepolia: process.env.ETHERSCAN_API_KEY,
      avalanche: "abc", // apiKey is not required, just set a placeholder,
      arbitrum: process.env.ARBISCAN_API_KEY,
      optimism: process.env.OPTIMISTIC_ETHERSCAN_API_KEY,
      polygon: "abc", // apiKey is not required, just set a placeholder,
      polygonzkevm: process.env.POLYGONSCAN_ZKEVM_API_KEY,
      fantom: process.env.FTMSCAN_API_KEY,
      bsc: process.env.BSCSCAN_API_KEY,
      opbnb: process.env.BSCSCAN_OPBNB_API_KEY,
      linea_testnet: process.env.LINEASCAN_API_KEY,
      linea: process.env.LINEASCAN_API_KEY,
      blast_sepolia: "abc", // apiKey is not required, just set a placeholder,
      blast: process.env.BLASTSCAN_API_KEY,
      rootstock_testnet: "abc", // apiKey is not required, just set a placeholder,
      rootstock: "abc", // apiKey is not required, just set a placeholder,
      taiko_katla_testnet: "abc", // apiKey is not required, just set a placeholder,
      taiko: "abc", // apiKey is not required, just set a placeholder,
      u2u: "abc", // apiKey is not required, just set a placeholder,
      ailayer: "abc", // apiKey is not required, just set a placeholder,
      zetachain: "abc", // apiKey is not required, just set a placeholder,
      merlin: "abc", // apiKey is not required, just set a placeholder,
      conflux: "abc", // apiKey is not required, just set a placeholder,
      xlayer_testnet: process.env.XLAYER_API_KEY,
      xlayer: process.env.XLAYER_API_KEY,
      base_sepolia: process.env.BASESCAN_API_KEY,
      base: process.env.BASESCAN_API_KEY,
      scroll: process.env.SCROLLSCAN_API_KEY,
      mode: "abc", // apiKey is not required, just set a placeholder,
      artela_testnet: "abc", // apiKey is not required, just set a placeholder,
      zora: "abc", // apiKey is not required, just set a placeholder,
      ancient8: "abc", // apiKey is not required, just set a placeholder,
      nova: "abc", // apiKey is not required, just set a placeholder,
      bob: "abc", // apiKey is not required, just set a placeholder,
      bitlayer: "abc", // apiKey is not required, just set a placeholder,
      satoshivm: "abc", // apiKey is not required, just set a placeholder,
      kakarot_testnet: "abc", // apiKey is not required, just set a placeholder,
      bera_testnet: "abc", // apiKey is not required, just set a placeholder,
    },
    customChains: [
      {
        network: "ethereum",
        chainId: 1,
        urls: {
          apiURL: "https://api.etherscan.io/api",
          browserURL: "https://etherscan.io",
        },
      },
      {
        network: "sepolia",
        chainId: 11155111,
        urls: {
          apiURL: "https://eth-sepolia.blockscout.com/api",
          browserURL: "https://eth-sepolia.blockscout.com",
        },
      },
      {
        network: "avalanche",
        chainId: 43114,
        urls: {
          apiURL:
            "https://api.routescan.io/v2/network/mainnet/evm/43114/etherscan",
          browserURL: "https://snowtrace.io",
        },
      },
      {
        network: "arbitrum",
        chainId: 42161,
        urls: {
          apiURL: "https://api.arbiscan.io/api",
          browserURL: "https://arbiscan.io",
        },
      },
      {
        network: "optimism",
        chainId: 10,
        urls: {
          apiURL: "https://api-optimistic.etherscan.io/api",
          browserURL: "https://optimistic.etherscan.io",
        },
      },
      {
        network: "polygon",
        chainId: 137,
        urls: {
          apiURL: "https://polygon.blockscout.com/api",
          browserURL: "https://polygon.blockscout.com",
        },
      },
      {
        network: "polygonzkevm",
        chainId: 1101,
        urls: {
          apiURL: "https://api-zkevm.polygonscan.com/api",
          browserURL: "https://zkevm.polygonscan.com/",
        },
      },
      {
        network: "fantom",
        chainId: 250,
        urls: {
          apiURL: "https://api.ftmscan.com/api",
          browserURL: "https://ftmscan.com",
        },
      },
      {
        network: "bsc",
        chainId: 56,
        urls: {
          apiURL: "https://api.bscscan.com/api",
          browserURL: "https://bscscan.com",
        },
      },
      {
        network: "opbnb",
        chainId: 204,
        urls: {
          apiURL: "https://api-opbnb.bscscan.com/api",
          browserURL: "https://opbnb.bscscan.com",
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
        network: "linea",
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
        network: "rootstock_testnet",
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
        network: "taiko",
        chainId: 167000,
        urls: {
          apiURL:
            "https://api.routescan.io/v2/network/mainnet/evm/167000/etherscan/api",
          browserURL: "https://taikoscan.network",
        },
      },
      {
        network: "u2u",
        chainId: 39,
        urls: {
          apiURL: "",
          browserURL: "https://u2uscan.xyz",
        },
      },
      {
        network: "ailayer",
        chainId: 2649,
        urls: {
          apiURL: "https://mainnet-explorer.ailayer.xyz/api",
          browserURL: "https://mainnet-explorer.ailayer.xyz",
        },
      },
      {
        network: "zetachain",
        chainId: 7000,
        urls: {
          apiURL: "https://zetachain.blockscout.com/api",
          browserURL: "https://zetachain.blockscout.com",
        },
      },
      {
        network: "merlin",
        chainId: 4200,
        urls: {
          apiURL: "https://scan.merlinchain.io/api",
          browserURL: "https://scan.merlinchain.io",
        },
      },
      {
        network: "conflux",
        chainId: 1030,
        urls: {
          apiURL: "https://evmapi.confluxscan.net/api",
          browserURL: "https://evm.confluxscan.net",
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
          apiURL:
            "https://www.oklink.com/api/explorer/v1/contract/verify/async/api/xlayer",
          browserURL: "https://www.okx.com/explorer/xlayer",
        },
      },
      {
        network: "base_sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
      {
        network: "scroll",
        chainId: 534352,
        urls: {
          apiURL: "https://api.scrollscan.com/api",
          browserURL: "https://scrollscan.com",
        },
      },
      {
        network: "mode",
        chainId: 34443,
        urls: {
          apiURL:
            "https://api.routescan.io/v2/network/mainnet/evm/34443/etherscan",
          browserURL: "https://modescan.io",
        },
      },
      {
        network: "artela_testnet",
        chainId: 11822,
        urls: {
          apiURL: "https://betanet-scan.artela.network/api",
          browserURL: "https://betanet-scan.artela.network",
        },
      },
      {
        network: "zora",
        chainId: 7777777,
        urls: {
          apiURL: "https://explorer.zora.energy/api",
          browserURL: "https://explorer.zora.energy",
        },
      },
      {
        network: "ancient8",
        chainId: 888888888,
        urls: {
          apiURL: "https://scan.ancient8.gg/api",
          browserURL: "https://scan.ancient8.gg",
        },
      },
      {
        network: "nova",
        chainId: 42170,
        urls: {
          apiURL: "https://nova-explorer.arbitrum.io/api",
          browserURL: "https://nova-explorer.arbitrum.io",
        },
      },
      {
        network: "bob",
        chainId: 60808,
        urls: {
          apiURL: "https://explorer.gobob.xyz/api",
          browserURL: "https://explorer.gobob.xyz",
        },
      },
      {
        network: "bitlayer",
        chainId: 200901,
        urls: {
          apiURL: "https://api.btrscan.com/scan/api",
          browserURL: "https://www.btrscan.com",
        },
      },
      {
        network: "satoshivm",
        chainId: 3109,
        urls: {
          apiURL: "https://svmscan.io/api",
          browserURL: "https://svmscan.io",
        },
      },
      {
        network: "kakarot_testnet",
        chainId: 1802203764,
        urls: {
          apiURL: "https://sepolia-explorer.kakarot.org/api",
          browserURL: "https://sepolia-explorer.kakarot.org",
        },
      },
      {
        network: "bera_testnet",
        chainId: 80085,
        urls: {
          apiURL:
            "https://api.routescan.io/v2/network/testnet/evm/80085/etherscan",
          browserURL: "https://artio.beratrail.io",
        },
      },
    ],
  },
};
