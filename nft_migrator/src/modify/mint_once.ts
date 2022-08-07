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

  let minter = "terra1kfm48xrg00r3amen5v2uny4fayhr3m0d6p7f925y8d0t38562vhqkfn4rv"
  let handler = new Address(env.mnemonics[0]);
  let minterContract = handler.getContract(minter);
  
  let mint_msg = {"mint_request":{"mint_msg":{"token_id":"4032","owner":"terra1zrl20sj9qx5xzlae5khp69larfejnt6t65mfag","token_uri":"ipfs://QmeXDUz3LGDLMCSumuGxkh6ZjHfqafNmSt1jZXM49VNWsJ","extension":{"image":"ipfs://QmWfdTpBoF3cXYjGAsCd7EJfLsKREG3eVpFhERViDoUtyJ","image_data":null,"external_url":null,"description":"Galactic Punks are 10,921 randomly generated NFTs on the Terra blockchain.","name":"Galactic Punk #4032","attributes":[{"display_type":null,"trait_type":"backgrounds","value":"green planet day"},{"display_type":null,"trait_type":"suits","value":"royal spacesuit"},{"display_type":null,"trait_type":"species","value":"zombie 2"},{"display_type":null,"trait_type":"jewelry","value":"silver earring"},{"display_type":null,"trait_type":"face","value":"battle wound healed"}],"background_color":null,"animation_url":null,"youtube_url":null}},"nft_contract":"terra16ds898j530kn4nnlc7xlj6hcxzqpcxxk4mj8gkcl3vswksu6s3zszs8kp2"},"signature":"FtI3xJ6LrHTmJvnh1H0DrWVKI0nUOltMaW3LGT7Aort769br95K5KA6KB3Zz/Lp9PPEs6AC1qhmM8rkStDWIvg=="}
  
  await minterContract.execute.mint(mint_msg);
  
}

main()
  .then(() => {})
  .catch((err) => {
    console.log(err);
  });
