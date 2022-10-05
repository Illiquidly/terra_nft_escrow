import { Address } from './terra_utils';
import { env, add_contract } from './env_helper';
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
  let handler = new Address(env['mnemonics'][0]);
  let contract = handler.getContract(
    'terra1d7rd7f8wl7kxqxmn9gtpfpcx83xzfjrk2vmahdw0vkp5r8ukwg5sup20la'
  );

  let mnemonics = require('../mnemonics.json');
  let minterMnemonic = mnemonics["terra1vsn6e0eelhla5n0j4rz6zz2qrla8qtx33vyk2t"].mnemonic;
  let minter = new Address(minterMnemonic).wallet;

  let mintRequest = {"mint_msg":{"token_id":"35","owner":"terra15h6ndxy6zyfn6l3cjvkyj5qa9hhe005wcy9z0p","token_uri":"ipfs://QmRdybiU1cduXZoc5saVxxveUiKgwJmkj8dAiozAcdsGfB","extension":{"image":"ipfs://QmRqqJkpRRthx8TU3u9fLUos7evC8Aurrgayum4HosoxNJ","image_data":null,"external_url":null,"description":"Alas, the fuel that powers the ever-functioning intooorn brain. Without this, we as interns are lost, since this is the reward we work towards every single day. This delicious intern lunch is proof that you are indeed a proud supporter of the intooorns and we as a whole, thank you for your support. So please, lay back, relax and enjoy your ramen.","name":"RameNFT","attributes":null,"background_color":null,"animation_url":null,"youtube_url":null}},"nft_contract":"terra1sf2fftvjt4z75g4rshngdxn5fr6qsccl78fgsz52fefwemxzvmaqptdfnp"};

  let response = await signRedeemRequest(mintRequest, minter);


  console.log(response);
}

interface MintRequest {
  mint_msg: MintMsg;
  nft_contract: String;
}

interface MintMsg {
  token_id: String;
  owner: String;
  token_uri: String | undefined;
  extension: any;
}

export async function signRedeemRequest(
  data: MintRequest,
  wallet: Wallet
): Promise<string> {
  // First we parse the request into a metadata message :

  const requestBuffer = Buffer.from(JSON.stringify(data));
  const signed = await wallet.key.sign(requestBuffer);
  console.log(wallet.key.publicKey);
  return signed.toString('base64');
}

main()
  .then(() => {})
  .catch((err) => {
    console.log(err);
  });
