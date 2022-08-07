import { Address } from '../terra_utils';
import { env, add_contract } from '../env_helper';
import { SimplePublicKey, Wallet } from "@terra-money/terra.js"


export function getAuthPubkey(wallet: Wallet): string {
  if (wallet.key.publicKey == null) {
    throw Error('Cannot find public key for wallet');
  }
  return (wallet.key.publicKey as SimplePublicKey).key;
}

/// Here we want to upload the p2p contract and add the fee contract
async function main() {
  // Getting a handler for the current address

  let projectContract = "terra1tehe2e4ufa9n0xeef4wxvfvhncjyzetlp404wm"
  let illiquidlabsTreasuryAddress = "terra1yttw08pl3y3txd3jls4pmw5n9pesggcnta3u87ak2tddk97satasvdul7n"
  let projectTreasury = "terra17xqygpamm57q75plm59fzt5zc9au4awdxuzy2dpuke5tgpgjmx7s6uy7kn"

  let mnemonic = require("../../mnemonics.json")[projectContract].mnemonic;
  let minter = require("../../nft_contracts.json")[projectContract].minter_contract;
  let handler = new Address(mnemonic);

  let minterContract = handler.getContract(minter);
  
  /*
  await minterContract.execute.set_treasury({
    treasury: illiquidlabsTreasuryAddress
  })
  */

  
  await minterContract.execute.set_project_treasury({
    treasury: projectTreasury
  })
  
  /*
  await minterContract.execute.set_fee_price({
    price: "600000"
  })
  */
  
  await minterContract.execute.set_project_fee_price({
    price: "3000000"
  })
  
}

main()
  .then(() => {})
  .catch((err) => {
    console.log(err);
  });
