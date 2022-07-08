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
  let treasury = new Address(env['mnemonics'][1]);
  let project_treasury = new Address(env['mnemonics'][2]);
  let minter = new Address(env['mnemonics'][3]).wallet;

  console.log(handler.getAddress());

  // Uploading the contract code
  
  let loan_codeId: string[] = await handler.uploadContract(
    '../artifacts/minter.wasm'
  );


  // Initialize p2p contract
  let escrowInitMsg = {
    name: 'NFTMinter',
    minter: getAuthPubkey(minter),
    fee_price: "190",
    treasury: treasury.getAddress(),
    project_price: "253",
    project_treasury: project_treasury.getAddress(),
  };
  console.log(escrowInitMsg);

  let minter_contract = await handler.instantiateContract(+loan_codeId[0], escrowInitMsg);
  add_contract('minter', minter_contract.address);

  console.log('Uploaded the minter contract');
}

main()
  .then(() => {})
  .catch((err) => {
    console.log(err);
  });
