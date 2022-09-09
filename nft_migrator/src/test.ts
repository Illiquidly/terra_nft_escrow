import { Address } from './terra_utils';
import { env, add_contract } from './env_helper';
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
  let contract = handler.getContract(
    'terra1d7rd7f8wl7kxqxmn9gtpfpcx83xzfjrk2vmahdw0vkp5r8ukwg5sup20la'
  );

  let response = await contract.execute.mint(
    {
      mint_request: {
        mint_msg: {
          token_id: '107',
          owner: 'terra1szs2pgujpgdu4j7smpqvzz0e75tgu9luypkpsh',
          token_uri: 'ipfs://QmRdybiU1cduXZoc5saVxxveUiKgwJmkj8dAiozAcdsGfB',
          extension: {
            name: 'RameNFT',
            description:
              'Alas, the fuel that powers the ever-functioning intooorn brain. Without this, we as interns are lost, since this is the reward we work towards every single day. This delicious intern lunch is proof that you are indeed a proud supporter of the intooorns and we as a whole, thank you for your support. So please, lay back, relax and enjoy your ramen.',
            image: 'ipfs://QmRqqJkpRRthx8TU3u9fLUos7evC8Aurrgayum4HosoxNJ',
            image_data: null,
            attributes: null,
            external_url: null,
            background_color: null,
            animation_url: null,
            youtube_url: null
          }
        },
        nft_contract:
          'terra1sf2fftvjt4z75g4rshngdxn5fr6qsccl78fgsz52fefwemxzvmaqptdfnp'
      },
      signature:
        'PGloVLUK6iFhXSQ1yy4EvINkOZ2BPzq83sMsB8hklXo4Icht7Ur+yg+d0wbnWD5qgASD8qOc9QQW9RqrbMbtnA=='
    },
    '1000000uluna'
  );

  console.log(response);
}

main()
  .then(() => {})
  .catch((err) => {
    console.log(err);
  });
