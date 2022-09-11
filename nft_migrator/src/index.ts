'use strict';

import express from 'express';
import 'dotenv/config';
import https from 'https';
import fs from 'fs';
import toobusy from 'toobusy-js';
import { Address } from './terra_utils';
import { LCDClient, Wallet } from '@terra-money/terra.js';

let globalEnv = require('../env.json');
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
interface Attribute {
  display_type: string | null;
  trait_type: string;
  value: string;
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

let terra_classic = new LCDClient(globalEnv['classic']['chain']);

function regular_metadata(tokenId: string, metadata: any): [string, any] {
  return [
    tokenId,
    {
      token_uri: metadata.token_uri ?? null,
      extension: metadata.extension
        ? {
            image: metadata.extension?.image ?? null,
            image_data: metadata.extension?.image_data ?? null,
            external_url: metadata.extension?.external_url ?? null,
            description: metadata.extension?.description ?? null,
            name: metadata.extension?.name ?? null,
            attributes:
              metadata.extension?.attributes?.map((attribute: any) => ({
                display_type: attribute.display_type,
                trait_type: attribute.trait_type,
                value: attribute.value
              })) ?? null,
            background_color: metadata.extension?.background_color ?? null,
            animation_url: metadata.extension?.animation_url ?? null,
            youtube_url: metadata.extension?.youtube_url ?? null
          }
        : null
    }
  ];
}

const METADATA_CORRECTIONS: {
  [key: string]: (tokenId: string, metadata: any) => [string, any];
} = {
  terra103z9cnqm8psy0nyxqtugg6m7xnwvlkqdzm4s4k: (
    tokenId: string,
    metadata: any
  ): [string, any] => {
    // First we modify the tokenId
    let [, newGpTokenId] = metadata.extension.name.split('#');

    // Then we modify the rare attributes
    let gpMetadataMap: { [key: string]: string } = {
      'ponytail blonde': 'galactic glitch',
      'neat blonde': 'galactic glitch',
      'neat black': 'galactic glitch',
      'neat red': 'galactic glitch',
      'messy blonde': 'galactic glitch',
      'ponytail black': 'galactic glitch',
      'neat brown': 'galactic glitch',
      'messy brown': 'galactic glitch',
      'ponytail red': 'galactic glitch',
      'messy blue': 'galactic glitch',
      'messy pink': 'galactic glitch'
    };

    metadata.extension.attributes = metadata.extension.attributes.map(
      (attribute: Attribute) => {
        attribute.value = gpMetadataMap[attribute.value] ?? attribute.value;
        return attribute;
      }
    );

    return [newGpTokenId ?? '', metadata];
  },

  // We correct metadata for tokens with weird metadata
  terra1r63hy95slv78mem0mma6pk7f2lcy3yrwgft48q: regular_metadata,

  terra1vsn6e0eelhla5n0j4rz6zz2qrla8qtx33vyk2t: regular_metadata
};

async function getTokenMintMessage(
  contractInfo: any,
  userAddress: string,
  tokenId: string
): Promise<any> {
  // We try to send the token.
  let nftAddress2 = contractInfo.contract2;
  let nftAddress1 = contractInfo.contract1;
  let minterMnemonic = mnemonics[nftAddress1].mnemonic;
  console.log(minterMnemonic);
  let minter = new Address(minterMnemonic).wallet;

  let tokenMetadata: any = await terra_classic.wasm.contractQuery(
    contractInfo.contract1,
    {
      nft_info: {
        token_id: tokenId
      }
    }
  );
  // Some projects want us to modify the token Metadata --> We do that
  // We also correct the metadata so they match the new NFT contract structure
  let [newTokenId, newTokenMetadata] = METADATA_CORRECTIONS[
    contractInfo.contract1
  ]?.(tokenId, tokenMetadata) ?? [tokenId, tokenMetadata];

  let mintMsg: MintMsg = {
    token_id: newTokenId,
    owner: userAddress,
    token_uri: newTokenMetadata.token_uri ?? null,
    extension: newTokenMetadata.extension ?? null
  };

  let mintRequest: MintRequest = {
    mint_msg: mintMsg,
    nft_contract: nftAddress2
  };

  let signature = await signRedeemRequest(mintRequest, minter);

  let mintExecuteMsg = {
    mint_request: mintRequest,
    signature,
    minter: contractInfo.minter
  };
  return mintExecuteMsg;
}

let mnemonics = require('../mnemonics.json');
let contractList = require('../nft_contracts.json');

async function main() {
  app.get('/migrator/contract_list', async (_req: any, res: any) => {
    let contractList = require('../nft_contracts.json');
    await res.status(200).send(contractList);
  });

  app.get(
    '/migrator/migrate/:address/:contract/:tokenId',
    async (req: any, res: any) => {
      const address = req.params.address;
      const contract = req.params.contract;
      const tokenId = req.params.tokenId;

      // We verify the contract is registered with the api
      let contractInfo = contractList[contract];
      if (!contractInfo) {
        await res.status(404).send('Contract was not registered with this api');
        return;
      }

      // We query the Terra 1.0 chain to make sure the designated NFT has been deposited by the address in the escrow contract
      terra_classic.wasm
        .contractQuery(contractInfo.escrow_contract, {
          depositor: {
            token_id: tokenId
          }
        })
        .then((response: any) => {
          // If there is a response, we check it matches the info sent
          if (response?.token_id != tokenId) {
            throw Error('Token not deposited');
          } else if (response.depositor != address) {
            throw Error('Token not deposited by the indicated user');
          }
          // We try to send the token to the depositor on the Terra 2.0 chain
          return getTokenMintMessage(contractInfo, address, tokenId);
        })
        .then((migrateMsg) => {
          return res.status(200).send(migrateMsg);
        })
        .catch((error) => {
          console.log(error);
          return res.status(404).send({
            error_text: 'Error occured while migrating the token',
            error_message: error.message,
            full_error: error
          });
        });

      /* I leave that part as comment for collection specific testing
      getTokenMintMessage(contractInfo, address, tokenId)
      .then((migrateMsg)=>{
          return res.status(200).send(migrateMsg);        
      })
      */
    }
  );

  // Special Lootopian item process

  let lootopian_classic_contract =
    'terra1tehe2e4ufa9n0xeef4wxvfvhncjyzetlp404wm';
  let lootopian_item_classic_contract =
    'terra1gx478xey87dq3dz2sfdt6rfcd0snqpj83ypd3x';

  app.get(
    '/migrator/migrate/lootopian-item/:address/:contract/:lootopianId/:itemId',
    async (req: any, res: any) => {
      const address = req.params.address;
      const contract = req.params.contract;
      const lootopianId = req.params.lootopianId;
      const itemTokenId = req.params.itemId;
      if (contract != lootopian_item_classic_contract) {
        await res.status(404).send('Contract was not registered with this api');
        return;
      }

      // We verify the contract is registered with the api
      let contractInfo = contractList[lootopian_classic_contract];
      if (!contractInfo) {
        await res.status(404).send('Contract was not registered with this api');
        return;
      }

      // We query the Terra 1.0 chain to make sure the designated NFT has been deposited by the address in the escrow contract
      await terra_classic.wasm
        .contractQuery(contractInfo.escrow_contract, {
          depositor: {
            token_id: lootopianId
          }
        })
        .then(async (response: any) => {
          // If there is a response, we check it matches the info sent
          if (response?.token_id != lootopianId) {
            throw Error('Token not deposited');
          } else if (response.depositor != address) {
            throw Error('Token not deposited by the indicated user');
          }
          // We need to query the items tokenId
          let depositedTokens = await getLootopianItemTokenIds(lootopianId);
          if (!depositedTokens.includes(parseInt(itemTokenId))) {
            throw Error('Token not associated with this lootopian');
          }
          return itemTokenId;
        })
        .then((tokenId: string) => {
          let itemContractInfo = contractList[lootopian_item_classic_contract];
          return getTokenMintMessage(
            itemContractInfo,
            itemContractInfo.contract2,
            tokenId
          );
        })
        .then((migrateMsg: any) => {
          return res.status(200).send(migrateMsg);
        })
        .catch((error) => {
          console.log(error);
          return res.status(404).send({
            error_text: 'Error occured while migrating the token',
            error_message: error.message,
            full_error: error
          });
        });
    }
  );

  async function getLootopianItemTokenIds(tokenId: String): Promise<number[]> {
    let tokenMetadata: any = await terra_classic.wasm.contractQuery(
      lootopian_classic_contract,
      {
        nft_info: {
          token_id: tokenId
        }
      }
    );

    return tokenMetadata.extension.sections
      .map((section: any) => section.nft_token_id)
      .filter((tokenId: number) => tokenId != 0);
  }

  /**************************************/
  /*  END Lootopian specific features   */
  /**************************************/

  if (process.env.EXECUTION == 'PRODUCTION') {
    const options = {
      cert: fs.readFileSync('/home/illiquidly/identity/fullchain.pem'),
      key: fs.readFileSync('/home/illiquidly/identity/privkey.pem')
    };
    https.createServer(options, app).listen(HTTPS_PORT);
  }
}
main();
