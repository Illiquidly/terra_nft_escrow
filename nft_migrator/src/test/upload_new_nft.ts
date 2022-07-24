import { Address } from '../terra_utils';
import { env, add_uploaded_nft } from '../env_helper';

async function main() {
  // Getting a handler for the current address
  let handler = new Address(env['mnemonics'][0]);
  let all_handlers: Address[] = env['mnemonics'].map(
    (mnemonic: string) => new Address(mnemonic)
  );

  // Uploading the contract code
  let nft_codeId: string[];
  if(env.type == "classic"){
    nft_codeId = await handler.uploadContract(
      '../artifacts/cw721_base0.16.wasm'
    );
  }else{
    nft_codeId = await handler.uploadContract(
      '../artifacts/cw721_base1.0.wasm'
    );
  }

  let codeName: string = 'NFT' + Math.ceil(Math.random() * 10000);

  // Instantiating the contract
  let NFTInitMsg = {
    name: codeName,
    symbol: 'ILIQ',
    minter: env.contracts.minter  
  };
  let nft = await handler.instantiateContract(+nft_codeId[0], NFTInitMsg);
  add_uploaded_nft(codeName, nft.execute.contractAddress);

}

main()
  .then((resp) => {
    console.log(resp);
  })
  .catch((err) => {
    console.log(err);
  });
