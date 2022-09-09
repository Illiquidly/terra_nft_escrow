import { Address } from '../terra_utils';
import { env, add_contract } from '../env_helper';
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
  let treasury = '';
  let project_treasury = '';
  let minter = new Address(env['mnemonics'][3]).wallet;

  console.log(handler.getAddress());
  let loanCodeID = 2375;

  // Initialize p2p contract
  let escrowInitMsg = {
    name: 'NFTMinter',
    minter: getAuthPubkey(minter),
    fee_price: '190',
    treasury: handler.getAddress(),
    project_price: '253',
    project_treasury: handler.getAddress()
  };
  console.log(escrowInitMsg);

  let minter_contract = await handler.instantiateContract(
    loanCodeID,
    escrowInitMsg
  );
  console.log(minter_contract);
  let response = await minter_contract.execute.set_treasury({
    treasury: handler.getAddress()
  });
  console.log(response);

  console.log('Uploaded the minter contract');
}

main()
  .then(() => {})
  .catch((err) => {
    console.log(err);
  });
