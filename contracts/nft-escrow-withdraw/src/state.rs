use crate::error::ContractError;
use cosmwasm_std::{Addr, Deps};
use cw_storage_plus::{IndexedMap, Item, MultiIndex};
use escrow_export_classic::state::{ContractInfo, TokenIndexes, TokenOwner};

pub const CONTRACT_INFO: Item<ContractInfo> = Item::new("contract_info");

pub fn token_owner_idx(d: &TokenOwner, k: Vec<u8>) -> (Addr, Vec<u8>) {
    (d.owner.clone(), k)
}

pub fn migrated_idx(d: &TokenOwner, k: Vec<u8>) -> (bool, Vec<u8>) {
    (d.migrated, k)
}

pub struct DepositNft<'a> {
    pub nfts: IndexedMap<'a, &'a str, TokenOwner, TokenIndexes<'a>>,
}

/**
 * Structure used to save tokens and be able to query them by owner
 * */
impl Default for DepositNft<'_> {
    fn default() -> Self {
        let indexes: TokenIndexes = TokenIndexes {
            owner: MultiIndex::new(token_owner_idx, "tokens", "tokens__owner"),
            migrated: MultiIndex::new(migrated_idx, "tokens", "tokens__migrated"),
        };
        Self {
            nfts: IndexedMap::new("tokens", indexes),
        }
    }
}

pub fn is_owner(deps: Deps, addr: Addr) -> Result<(), ContractError> {
    if CONTRACT_INFO.load(deps.storage)?.owner == addr {
        Ok(())
    } else {
        Err(ContractError::Unauthorized {})
    }
}
