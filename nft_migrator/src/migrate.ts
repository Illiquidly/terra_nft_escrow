import { Address } from './terra_utils';
import {
  LCDClient,
  MsgExecuteContract
} from '@terra-money/terra.js';

let globalEnv = require("../env.json");

/// Here we want to upload the p2p contract and add the fee contract
async function main() {
  let contractList = require('../nft_contracts.json');
  let contracts = Object.keys(contractList);

  return Promise.all(contracts.map((contract: string) =>{
    let contractInfo = contractList[contract];
    prepareAndSendShuttle(contractInfo);
  }))
}

let mnemonics = require("../mnemonics.json")
let escrowHandler = new Address(globalEnv["classic"],mnemonics.escrow.mnemonic);

async function sendShuttle(contractInfo: any, tokens: any[]){
  console.log("Let's send some NFTs in outer space")
  if(tokens.length === 0){
    console.log("We don't have any tokens to migrate")
    return
  }
  console.log("Number of passengers",tokens.length, tokens)
  let nftAddress1 = contractInfo.contract1;
  let terra2Mnemonic = mnemonics[nftAddress1].mnemonic;
  let nftHandler = new Address(globalEnv["staging"],terra2Mnemonic);

  // We start by creating the send messages for all tokens
  let tokenSendMsgs = tokens.map((token: any)=>{
    let msg = {
      transfer_nft:{
        recipient: token.depositor,
        token_id: token.token_id
      }
    }
    return new MsgExecuteContract(
      nftHandler.getAddress(), // sender
      contractInfo.contract2, // contract address
      { ...msg }, // handle msg,
    );
  })

  let tokenMigrateMsgs = tokens.map((token: any)=>{
    let msg = {
      migrated:{
        token_id: token.token_id
      }
    }
    return new MsgExecuteContract(
      escrowHandler.getAddress(), // sender
      contractInfo.escrow_contract, // contract address
      { ...msg }, // handle msg,
    );
  })

  
  await nftHandler
    .post(tokenSendMsgs)
    .then((response: any) =>{
      console.log("Send on Terra 2.0", response)
    })
    .then((_response: any)=>{
      // We indicate the token has been migrated
      return escrowHandler.post(tokenMigrateMsgs)
    })
    .then((response: any) =>{
      console.log("Migrated on Terra 1.0", response)
    })
    .catch((error: any) => {
      console.log("Error when transfering to Terra 2.0 or migrating on Terra 1.0", error)
    })
    
}

async function prepareAndSendShuttle(contractInfo: any){
  let terra = new LCDClient(globalEnv["classic"]['chain']);
  let tokens: any = undefined;
  let start_after = undefined;
  do{
    tokens = await terra.wasm.contractQuery(
      contractInfo.escrow_contract,
      {
         registered_tokens:{
          start_after: start_after,
          limit: 30
         }
      }
    )

    if(tokens?.tokens){
      let length = tokens.tokens.length;
      if(length > 0){
        start_after = tokens.tokens[length - 1].token_id;
        sendShuttle(
          contractInfo,
          tokens.tokens
            .filter((tokenInfo: any) => !tokenInfo.migrated)
        )
      }
    }
  }while(tokens?.tokens?.length > 0)

}



main()
  .then((_resp) => {})
  .catch((err) => {
    console.log(err);
  });
