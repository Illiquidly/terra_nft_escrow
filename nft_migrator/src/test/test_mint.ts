import { Address } from './terra_utils';
import { env } from './env_helper';
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


  let mintExecuteMsg = {
    mint_request: mintRequest,
    signature
  }
  let response = await minter_contract.execute.mint(mintExecuteMsg, '443uluna')
  //let testMintMsg = {"mint_request":{"mint_msg":{"token_id":"test","owner":"terra1kj6vwwvsw7vy7x35mazqfxyln2gk5xy00r87qy","token_uri":"test","extension":null},"nft_contract":"terra1lwkwa4k6fskmtle9a5camewnv4eglrxsjs30et2d5k25kt75fujsg9curs"},"signature":"ELDnEt3Rpiiavyfyb/cZc/LdLf4DGWyjHsUAPeQL0L1pxG6dxAOUH3N5ta4FduUXLgpW6GQWCzrKlNCyJnE7ng=="}
  //let response = await minter_contract.execute.mint(testMintMsg, '443uluna')
  console.log(response);
}

main()
  .then(() => {})
  .catch((err) => {
    console.log(err);
  });
