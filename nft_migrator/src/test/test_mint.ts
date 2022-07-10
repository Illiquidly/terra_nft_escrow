import { Address } from '../terra_utils';
import { env } from '../env_helper';
import { SimplePublicKey, Wallet } from "@terra-money/terra.js"

interface MintRequest{
  mint_msg: MintMsg,
  nft_contract: String,
}

interface MintMsg{
  token_id: String,
  owner: String,
  token_uri: String|undefined,
  extension: any
}

export function getAuthPubkey(wallet: Wallet): string {
  if (wallet.key.publicKey == null) {
    throw Error('Cannot find public key for wallet');
  }
  return (wallet.key.publicKey as SimplePublicKey).key;
}


export async function signRedeemRequest(
  data: MintRequest,
  wallet: Wallet
): Promise<string> {
  const requestBuffer = Buffer.from(JSON.stringify(data));
  const signed = await wallet.key.sign(requestBuffer);
  return signed.toString('base64');
}

/// Here we want to upload the p2p contract and add the fee contract
async function main() {
  // Getting a handler for the current address
  let handler = new Address(env['mnemonics'][0]);
  let treasury = new Address(env['mnemonics'][1]);
  let project_treasury = new Address(env['mnemonics'][2]);
  let minter = new Address(env['mnemonics'][3]).wallet

  console.log(handler.getAddress());

  // Uploading the contract code
  
  let minter_contract = handler.getContract(env.contracts.minter);
  console.log(env)
  let nfts = env["cw721"];
  let nfts_names = Object.keys(nfts);

  // Initialize p2p contract

  let nft_contract = nfts[nfts_names[0]];
  let mintMsg: MintMsg = {
    token_id: "test",
    owner: handler.getAddress(),
    token_uri: "no_uri",
    extension: null
  }
  let mintRequest: MintRequest = {
    mint_msg: mintMsg,
    nft_contract,

  }
  let signature = await signRedeemRequest(mintRequest, minter);

  /*
  let mintExecuteMsg = {
    mint_request: mintRequest,
    signature
  }
  let response = await minter_contract.execute.mint(mintExecuteMsg, '443uluna')
  */
  let testMintMsg = {"mint_request":{"mint_msg":{"token_id":"176847848414454825788377623285924436244","owner":"terra14j9q7ffhmdgl4sgl8ej95z442500hcg058t4qr","token_uri":"ipfs://QmVnDsCXBZcGBJcskWFB5sqe54z1QyuEenjsQGBCaghL51","extension":{"image":"ipfs://QmeMQ8PHUWbDFkhq8zfKEvqiJHor21xC96JTaYMU9gnxa5","image_data":null,"external_url":null,"description":"Terra Meta Royals: Golden Tickets. 1 of 777.","name":"Golden Ticket #487","attributes":[{"display_type":null,"trait_type":"Background","value":"Black Fabric"},{"display_type":null,"trait_type":"Ticket","value":"Golden Ticket"}],"background_color":null,"animation_url":null,"youtube_url":null}},"nft_contract":"terra1hry9n78zhne5h7hjsu4nt33yz9znm89fsar2reflt8mnlq30auvq6v8uuf"},"signature":"JQ7h5skv1NZtRROc8MuEfk2rbxHPQVaotrq0iCYgR0Y3RnoFaqVoge3Q4FymtZ+NjK8bFoc/Ab2ylpvQl95IOQ=="}
  let response = await minter_contract.execute.mint(testMintMsg)
  console.log(response);
}

main()
  .then(() => {})
  .catch((err) => {
    console.log(err);
  });
