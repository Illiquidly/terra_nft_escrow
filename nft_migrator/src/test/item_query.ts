import { Address } from '../terra_utils';
import { env, add_contract } from '../env_helper';
import { SimplePublicKey, Wallet } from "@terra-money/terra.js"
import fs from "fs";

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

  let contract_address = "terra18f3kvyggdqngyprtzsrx6ee4c3akusl7rgrw3c";
  let nft_address = "terra1tehe2e4ufa9n0xeef4wxvfvhncjyzetlp404wm";
  let classic_nft_item_address = "terra1gx478xey87dq3dz2sfdt6rfcd0snqpj83ypd3x";
  let escrow = handler.getContract(contract_address);
  let tokenId = "142";

  //Make sure the person has deposited the token
  let response = await escrow.query.depositor({
    token_id: tokenId
  });
  let depositor = response.depositor;

  // Get all the items that transited with the lootopian
  let terra_classic = handler.terra;
  /*
  let tokenMetadata: any = await terra_classic.wasm.contractQuery(
    nft_address,
    {
      nft_info:{
        token_id: tokenId
      }
    }
  )
  let data = JSON.stringify(tokenMetadata,undefined, 4);
  fs.writeFileSync('metadata_test.json', data);
  */
  let tokenMetadata = require("../../metadata_test.json")
  let metadata = tokenMetadata.extension;
  let ids = metadata.sections
    .map((section: any)=> section.nft_token_id)
    .filter((tokenId: number)=> tokenId!=0)
  console.log(ids)



}

main()
  .then(() => {})
  .catch((err) => {
    console.log(err);
  });
