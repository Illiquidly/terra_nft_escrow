This repository was used to migrate NFTs from Terra Classic to Terra 2.0
There are 3 parts to this : 
1. The escrow contract (located in [the nft-escrow 1.0 directory](contracts/nft-escrow-1.0))
2. The minter authority (server located in the [nft_migrator](nft_migrator))
3. The minter contract (located in the 3[contracts/minter](contracts/minter) folders)



Migration Checklist : 

0. Check the contract type the NFT has (especially metadata structure)
1. Check the nft-migrator/code_id.json file to see if the code id associated with the minted NFT exists
2. If not, use the upload.js file for example to have the code ID on chain (you have to adapt it a little for new code)
3. Fill the nft-migrator/.init_migration file with all the necessary details
4. Call the nft-migrator/dist/init_migration.js file to init migration and change the contracts file
	 (don't forget the chain argument)
5. Git commit, push, pull on the server side and build 
6. Pass the mnemonics on to the server using the nft_migrator/add_private.ssh
7. Restart server and we're good to go !
