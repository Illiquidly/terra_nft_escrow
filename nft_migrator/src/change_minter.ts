import { Address } from './terra_utils';
import { env } from './env_helper';
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
  const handler = new Address(env['mnemonics'][0]);
  const contract = handler.getContract(
    'terra1ykdh99wjdhrtrjhrqawa2jfhutcdhwthvh0np0tkp43akzkr0nzseyqc6d'
  );

  const response = await contract.execute.set_fee_price({
    price: '400000'
  });

  console.log(response);
}

main()
