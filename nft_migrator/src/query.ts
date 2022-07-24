import { Address } from './terra_utils';
import { env, add_contract } from './env_helper';
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

  console.log(await handler.getAddress());
}

main()
  .then(() => {})
  .catch((err) => {
    console.log(err);
  });
