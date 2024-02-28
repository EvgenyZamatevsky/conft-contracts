# CoNFT Hardhat Project

This project has contracts that are used by the CoNFT team. The contracts are located in `contracts/main`.

Some tasks you can use:

- run tests
```shell
npm run test
```

- check for vulnerabilities (with slither)
```shell
npm run check
```

- check code quality (with ethlint)
```shell
npm run lint
```

- deploy the contracts
```shell
npx hardhat run scripts/deploy.js --network <networkname>
```

- verify the contracts
```shell
npx hardhat verify --network <networkname> <address> <args>
```
