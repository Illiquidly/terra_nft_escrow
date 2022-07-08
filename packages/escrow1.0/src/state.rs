use cosmwasm_std::{Addr, Timestamp};
use cw_storage_plus::{Index, IndexList, MultiIndex};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, PartialEq, JsonSchema, Debug)]
#[serde(rename_all = "snake_case")]
pub struct ContractInfo {
    pub name: String,
    pub nft_address: Addr,
    pub owner: Addr,
}

#[derive(Serialize, Deserialize, Clone, PartialEq, JsonSchema, Debug)]
pub struct TokenOwner {
    pub owner: Addr,
    pub migrated: bool,
    pub deposit_time: Timestamp,
    pub migrate_time: Timestamp,
}

pub struct TokenIndexes<'a> {
    pub owner: MultiIndex<'a, (Addr, Vec<u8>), TokenOwner>,
    pub migrated: MultiIndex<'a, (bool, Vec<u8>), TokenOwner>,
}

impl<'a> IndexList<TokenOwner> for TokenIndexes<'a> {
    fn get_indexes(&'_ self) -> Box<dyn Iterator<Item = &'_ dyn Index<TokenOwner>> + '_> {
        let v: Vec<&dyn Index<TokenOwner>> = vec![&self.owner];
        Box::new(v.into_iter())
    }
}
