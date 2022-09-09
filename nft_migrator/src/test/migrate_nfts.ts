import { Address } from '../terra_utils';
import { env, globalEnv, add_contract } from '../env_helper';
import {
  SimplePublicKey,
  Wallet,
  MsgExecuteContract
} from '@terra-money/terra.js';
import fs from 'fs';
import axios from 'axios';

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
  let handler_classic = new Address(
    globalEnv.classic['mnemonics'][0],
    'classic'
  );

  let contract_address =
    'terra18glh4zetf3nkdu724dxqvlw2gw6fdwnhrycazt32dgysq5gvyj4snf36gs';
  let nft_address = 'terra18hagd6xf4m2wan5eesdcrnh8rpg23yzwgdg7mh';
  let minter = handler.getContract(contract_address);
  let nft = handler.getContract(nft_address);

  let escrow = handler_classic.getContract(
    'terra1kftk7lhcm04paqap24ttedefdk835364cfcrdk'
  );

  let response = await minter.query.fee_price({
    price: '5000000'
  });

  let tokenIds = (
    await escrow.query.user_tokens({
      user: handler_classic.getAddress(),
      limit: 30
    })
  ).tokens;

  let responses = await Promise.all(
    tokenIds.map(async (token: any) => {
      return (
        await axios.get(
          `http://localhost:8081/migrator/migrate/${token.depositor}/${nft_address}/${token.token_id}`
        )
      ).data;
    })
  );

  let msgs = responses.map((response: any) => {
    console.log({
      mint: {
        ...response
      }
    });
    return new MsgExecuteContract(
      handler.getAddress(), // sender
      minter.address, // contract account address
      {
        mint: {
          ...response
        }
      },
      '5000000uluna'
    );
  });
  console.log(msgs);

  response = await handler.post(msgs);
  console.log(response);
}

main()
  .then(() => {})
  .catch((err) => {
    console.log(err);
  });
