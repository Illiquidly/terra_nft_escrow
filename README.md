Migration Checklist : 



1. Check the nft-migrator/code_id.json file to see if the code id associated with the minted NFT exists
2. If not, use the upload.js file for example to have the code ID on chain (you have to adapt it a little for new code)
3. Fill the nft-migrator/.init_migration file with all the necessary details
4. Call the nft-migrator/dist/init_migration.js file to init migration and change the contracts file
	 (don't forget the chain argument)
5. Git commit, push, pull on the server side and build + restart server and we're good to go !
