import { Address } from '../terra_utils';
import { env, add_contract } from '../env_helper';
import { SimplePublicKey, Wallet } from '@terra-money/terra.js';

export function getAuthPubkey(wallet: Wallet): string {
  if (wallet.key.publicKey == null) {
    throw Error('Cannot find public key for wallet');
  }
  return (wallet.key.publicKey as SimplePublicKey).key;
}

/// Here we want to upload the p2p contract and add the fee contract
async function main() {
  // Getting a handler for the current address

  let projectContract = 'terra1ycp3azjymqckrdlzpp88zfyk6x09m658c2c63d';
  let illiquidlabsTreasuryAddress =
    'terra1yttw08pl3y3txd3jls4pmw5n9pesggcnta3u87ak2tddk97satasvdul7n';
  let projectTreasury =
    'terra1rhfcc28fu2dev0r9d20z3g38ewpg2cpr9lglrc';

  let mnemonic = require('../../mnemonics.json')[projectContract].mnemonic;
  let minter = require('../../nft_contracts.json')[projectContract]
    .minter_contract;
  let handler = new Address(mnemonic);

  let minterContract = handler.getContract(minter);

  /*
  await minterContract.execute.set_treasury({
    treasury: illiquidlabsTreasuryAddress
  })
  */

  await minterContract.execute.set_project_treasury({
    treasury: projectTreasury
  });

  /*
  await minterContract.execute.set_fee_price({
    price: "600000"
  })
  */
  /*
  await minterContract.execute.set_project_fee_price({
    price: '3000000'
  });
  */
}

main()
  .then(() => {})
  .catch((err) => {
    console.log(err);
  });
