use crate::error::ContractError;
use cosmwasm_std::{Addr, Deps, Uint128};
use cw_storage_plus::Item;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, PartialEq, JsonSchema, Debug)]
#[serde(rename_all = "snake_case")]
pub struct ContractInfo {
    pub name: String,
    pub owner: Addr,
    pub nft_contract: Option<String>,
    pub minter: String,
    pub fee_price: Uint128,
    pub treasury: Addr,
    pub project_price: Uint128,
    pub project_treasury: Addr,
}

pub const CONTRACT_INFO: Item<ContractInfo> = Item::new("contract_info");

pub fn is_owner(deps: Deps, addr: Addr) -> Result<(), ContractError> {
    if CONTRACT_INFO.load(deps.storage)?.owner == addr {
        Ok(())
    } else {
        Err(ContractError::Unauthorized {})
    }
}
