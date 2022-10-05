import { Address } from '../../terra_utils';
import { env, add_contract } from '../../env_helper';
import { MsgMigrateContract, SimplePublicKey, Wallet } from '@terra-money/terra.js';
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

  let escrowCodeId = 5855;
  let withdrawEscrowCodeId = 6020;
  
  let escrow = await handler.instantiateContract(6019, {
    name: 'NFTEscrow',
    nft_address: "terra103z9cnqm8psy0nyxqtugg6m7xnwvlkqdzm4s4k"
  });

  console.log("escrow",escrow.address);

  let migrateMsg = new MsgMigrateContract(handler.getAddress(), escrow.address, withdrawEscrowCodeId, {});
  let response = await handler.post([migrateMsg]);
  console.log(response)
  

  response = await escrow.execute.withdraw({
    token_id:"nicoco"
  })
  console.log(response)



}

main()
  .then(() => {})
  .catch((err) => {
    console.log(err);
  });
