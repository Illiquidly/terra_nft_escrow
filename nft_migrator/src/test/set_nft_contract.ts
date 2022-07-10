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
  let handler = new Address(env['mnemonics'][0]);

  let nfts = env["cw721"];
  let nfts_names = Object.keys(nfts);
  let minter_contract = handler.getContract(env.contracts.minter);
  let response = await minter_contract.execute.set_nft_contract({
    nft_contract: nfts[nfts_names[0]],
  })

  console.log(response);
}

main()
  .then(() => {})
  .catch((err) => {
    console.log(err);
  });
