This repository was used to migrate NFTs from Terra Classic to Terra 2.0
There are 3 parts to this : 
1. The escrow contract (located in [the nft-escrow 1.0 directory](contracts/nft-escrow-1.0))
2. The minter authority (server located in the [nft_migrator](nft_migrator))
3. The minter contract (located in the 3 [contracts/minter](contracts/minter) folders)



1. The first step of the migration is locking the tokens in the escrow contract 
	(this contract version locks the NFT forever, so there is no going back)
	The contract allows to query easily who deposited each token and which token have been deposited by users.
	This ecrow contract allows user to deposit only from a collection (from a unique NFT address)

2.  The second step of the migration, is to provide to a user the migration message that allow them to mint on the new blockchain (Terra 2.0 in our case). 
	Indeed, the users will be responsible of sending themselves the minting transaction to the new blockchain. 
	In order to control what NFT can be minted, we use a centralized server. 
	It provides (on demand) the message needed for minting an NFT, if it was indeed deposited in the escrow contract by the designated address.
	This message has 2 parts : 
		- the minting message
		- the minting message signature (signed by a private key), that allows to authenticate the mint transaction

3. The last step is for a user to execute a NFT minting transaction. 
	


# Migration Checklist : 

0. Check the contract type the NFT has (especially metadata structure)
1. Check the nft-migrator/code_id.json file to see if the code id associated with the minted NFT exists
2. If not, use the upload.js file for example to have the code ID on chain (you have to adapt it a little for new code)
3. Fill the nft-migrator/.init_migration file with all the necessary details
4. Call the nft-migrator/dist/init_migration.js file to init migration and change the contracts file
	 (don't forget the chain argument)
5. Git commit, push, pull on the server side and build 
6. Pass the mnemonics on to the server using the nft_migrator/add_private.ssh
7. Restart server and we're good to go !
