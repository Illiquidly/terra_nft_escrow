import { Address } from '../terra_utils';
import { env, add_contract } from '../env_helper';
import {
  SimplePublicKey,
  Wallet,
  MsgExecuteContract
} from '@terra-money/terra.js';
import fs from 'fs';

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

  let contract_address = 'terra1kftk7lhcm04paqap24ttedefdk835364cfcrdk';
  let nft_address = 'terra18hagd6xf4m2wan5eesdcrnh8rpg23yzwgdg7mh';
  let escrow = handler.getContract(contract_address);
  let nft = handler.getContract(nft_address);

  let tokenIds = (
    await nft.query.tokens({
      owner: handler.getAddress(),
      limit: 30
    })
  ).tokens;
  let msgs = tokenIds.map((token: string) => {
    return new MsgExecuteContract(
      handler.getAddress(), // sender
      nft.address, // contract account address
      {
        send_nft: {
          contract: contract_address,
          token_id: token,
          msg: btoa(
            JSON.stringify({
              deposit_nft: {
                token_id: token
              }
            })
          )
        }
      }
    );
  });
  let response = await handler.post(msgs);
}

main()
  .then(() => {})
  .catch((err) => {
    console.log(err);
  });
