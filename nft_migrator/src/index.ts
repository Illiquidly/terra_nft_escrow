'use strict';

import express from 'express';
import 'dotenv/config';
import https from 'https';
import fs from 'fs';
import toobusy from 'toobusy-js';
import { Address } from './terra_utils';
import {
  LCDClient, Wallet
} from '@terra-money/terra.js';

let globalEnv = require("../env.json");
const PORT = 8081;
const HTTPS_PORT = 8444;

// We start the server
const app = express();

app.listen(PORT, () => {
  console.log("Serveur à l'écoute");
});
// Allow any to access this API.
app.use(function (_req: any, res: any, next: any) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});

app.use(function (_req, res, next) {
  if (toobusy()) {
    res.status(503).send("I'm busy right now, sorry.");
  } else {
    next();
  }
});


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

export async function signRedeemRequest(
  data: MintRequest,
  wallet: Wallet
): Promise<string> {
  const requestBuffer = Buffer.from(JSON.stringify(data));
  const signed = await wallet.key.sign(requestBuffer);
  return signed.toString('base64');
}

let terra_classic = new LCDClient(globalEnv["classic"]['chain']);

async function getTokenMintMessage(contractInfo: any, userAddress: string, tokenId: string): Promise<any>{
  // We try to send the token.
  let nftAddress2 = contractInfo.contract2;
  let nftAddress1 = contractInfo.contract1;
  let minterMnemonic = mnemonics[nftAddress1].mnemonic;
  let minter = new Address(minterMnemonic).wallet;

  
  let tokenMetadata: any = await terra_classic.wasm.contractQuery(
    contractInfo.contract1,
    {
      nft_info:{
        token_id: tokenId
      }
    }
  )
  console.log(tokenMetadata)

  let mintMsg: MintMsg = {
    token_id: tokenId,
    owner: userAddress,
    token_uri: tokenMetadata.token_uri ?? null,
    extension: tokenMetadata.extension ?? null
  }
  let mintRequest: MintRequest = {
    mint_msg: mintMsg,
    nft_contract: nftAddress2

  }
  let signature = await signRedeemRequest(mintRequest, minter);

  let mintExecuteMsg = {
    mint_request: mintRequest,
    signature,
    minter: contractInfo.minter
  }
  return mintExecuteMsg;
}


let mnemonics = require("../mnemonics.json");
let contractList = require('../nft_contracts.json');


async function main() {

  app.get('/migrator/contract_list', async (_req: any, res: any) => {
      let contractList = require('../nft_contracts.json');
      await res.status(200).send(contractList);
  });

  app.get('/migrator/migrate/:address/:contract/:tokenId', async (req: any, res: any) => {
      const address = req.params.address;
      const contract = req.params.contract;
      const tokenId = req.params.tokenId;

      // We verify the contract is registered with the api
      let contractInfo = contractList[contract];
      if(!contractInfo){
        await res.status(404).send("Contract was not registered with this api");
        return;
      }

      // We query the Terra 1.0 chain to make sure the designated NFT has been deposited by the address in the escrow contract
      await terra_classic.wasm.contractQuery(
        contractInfo.escrow_contract,
        {
          depositor:{
            token_id: tokenId
          }
        }
      ).then((response: any)=>{
        // If there is a response, we check it matches the info sent
        if(response?.token_id != tokenId){
          throw Error("Token not deposited");
        }else if(response.depositor != address){
          throw Error("Token not deposited by the indicated user");
        }
        // We try to send the token to the depositor on the Terra 2.0 chain
        return getTokenMintMessage(contractInfo, address, tokenId);
      }).then((migrateMsg)=>{
          return res.status(200).send(migrateMsg);        
      })
      .catch((error) =>{
        console.log(error)
          return res.status(404).send({
            error_text:"Error occured while migrating the token", 
            error: error.message
          });
      });
  });

  if (process.env.EXECUTION == 'PRODUCTION') {
    const options = {
      cert: fs.readFileSync('/home/illiquidly/identity/fullchain.pem'),
      key: fs.readFileSync('/home/illiquidly/identity/privkey.pem')
    };
    https.createServer(options, app).listen(HTTPS_PORT);
  }
}
main();
