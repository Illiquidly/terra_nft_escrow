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

  console.log(handler.getAddress());

  // Uploading the contract code
  let contract = process.argv[3]!;
  let codeName: string = "";
  if(contract == "escrow"){
    codeName = '../artifacts/nft_escrow_classic.wasm';   
  }else if(contract == "minter"){
    codeName = '../artifacts/minter.wasm';   
  }else if(contract == "minter_metadata"){
    codeName = '../artifacts/minter_metadata.wasm';   
  }else if(contract == "nft"){
    if(env.type == "classic"){
      codeName = '../artifacts/cw721_base0.16.wasm';
    }else{
      codeName = '../artifacts/cw721_base1.0.wasm';
    }
  }else if(contract == "nft_metadata"){
    codeName = '../artifacts/cw721_metadata1.0.wasm';
  }else{
    codeName = contract;
  }

  let codeId: string[] = await handler.uploadContract(
      codeName
  );

  console.log(+codeId[0]);
}

main()
  .then(() => {})
  .catch((err) => {
    console.log(err);
  });
