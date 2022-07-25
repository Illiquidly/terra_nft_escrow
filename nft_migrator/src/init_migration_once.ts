import { Address } from './terra_utils';
import { env, env_name, globalEnv } from './env_helper';
import { SimplePublicKey, Wallet } from "@terra-money/terra.js"
import fs from "fs";
require('dotenv').config({ path: `.init_migration` })

const nftContractFilename = "nft_contracts.json"


export function getAuthPubkey(wallet: Wallet): string {
  if (wallet.key.publicKey == null) {
    throw Error('Cannot find public key for wallet');
  }
  return (wallet.key.publicKey as SimplePublicKey).key;
}

/// Here we want to upload the p2p contract and add the fee contract
async function main() {
  let nftAddress: string = process.env.NFT_ADDRESS!;
  let nftName: string = process.env.NFT_NAME!;
  let nftSymbol: string = process.env.NFT_SYMBOL!;

  let treasury = process.env.TREASURY;
  let projectTreasury = process.env.PROJECT_TREASURY;
  let feePrice = process.env.FEE_PRICE!;
  let projectPrice = process.env.PROJECT_PRICE!;

  let escrowCodeId : number = +process.env.ESCROW_CODE_ID!;
  let minterCodeId : number = +process.env.MINTER_CODE_ID!;
  let nftCodeId : number = +process.env.NFT_CODE_ID!;

  let nftContracts = require(`../${nftContractFilename}`);
  if (nftContracts[nftAddress!] != undefined){
    console.log("Contract already migrated")
    return;
  }
  
  let minter = new Address(process.env.MINTER_MNEMONIC);
  let minter_classic = new Address(globalEnv["classic"].mnemonics[0],"classic");

  let escrowContract = {
    address: "terra18f3kvyggdqngyprtzsrx6ee4c3akusl7rgrw3c"
  }
  /*
  // Then we upload a minter contract on Terra 2.0
  let minterInitMsg = {
    name: 'NFTMinter',
    minter: getAuthPubkey(minter.wallet),
    fee_price: feePrice,
    treasury: treasury,
    project_price: projectPrice,
    project_treasury: projectTreasury,
  };
  console.log(minterInitMsg)
  let minterContract = await minter.instantiateContract(minterCodeId, minterInitMsg);
  console.log("Minter contract uploaded", minterContract.address)
  */

  // Then we upload a new NFT contract (with some first metadata)

  let minterContract = await minter.getContract("terra1mcjgaclqg75jwfqr9cxkh7e77zv3k8fg7h3hp84fe8epj2ku5vws0krrmz")
  let nftContract = await minter.getContract("terra1c649ctpkwqa9h65g6xmplrncc55d5nzqgz30zhtkcysedkd63zcq02uhs8")
  console.log("NFT contract uploaded", nftContract.address)
  // Then we set the NFT contract on the minter contract
  /*
  await minterContract.execute.set_nft_contract({
    nft_contract: nftContract.address,
  })
  */

  // Then we change the minter on the nftContract
  nftContract.execute.update_config({
    config_key: "minter",
    config_value : minterContract.address
  })


  // Finally we save the info to the nft_contracts.json file
  let nftContractObject = {
    "name": nftName,
    "contract1": nftAddress,
    "contract2": nftContract.address,
    "escrow_contract": escrowContract.address,
    "minter_contract": minterContract.address,
    "project_treasury": projectTreasury,
    "treasury": treasury,
  }

  nftContracts[nftAddress] = nftContractObject;

  let data = JSON.stringify(nftContracts, undefined, 4);
  fs.writeFileSync(nftContractFilename, data);

  // We set the mnemonic and address for the minter of the contract
  let mnemonics = require("../mnemonics.json")
  mnemonics[nftAddress] = {
    "mnemonic":process.env.MINTER_MNEMONIC
  }
  data = JSON.stringify(mnemonics,undefined, 4);
  fs.writeFileSync("mnemonics.json", data);

}

main()
  .then(() => {})
  .catch((err) => {
    console.log(err);
  });
