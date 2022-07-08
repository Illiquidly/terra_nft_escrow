use cosmwasm_std::{Addr, Uint128};
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
