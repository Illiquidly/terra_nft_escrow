use cosmwasm_std::{Binary, StdError, StdResult, Timestamp};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use crate::state::TokenOwner;

#[derive(Serialize, Deserialize, JsonSchema, Debug, Clone, PartialEq)]
pub struct MigrateMsg {}

#[derive(Serialize, Deserialize, JsonSchema, Debug, Clone, PartialEq)]
pub struct InstantiateMsg {
    pub name: String,
    pub nft_address: String,
    pub owner: Option<String>,
}

pub fn is_valid_name(name: &str) -> bool {
    let bytes = name.as_bytes();
    if bytes.len() < 3 || bytes.len() > 50 {
        return false;
    }
    true
}

pub fn to_token_info(token_id: String, token_owner: TokenOwner) -> TokenInfo{
    TokenInfo{
        token_id,
        depositor: token_owner.owner.to_string(),
        migrated: token_owner.migrated,
        deposit_time: token_owner.deposit_time,
        migrate_time: token_owner.migrate_time,
    }
}

#[derive(Serialize, Deserialize, Clone, PartialEq, JsonSchema, Debug)]
pub struct TokenInfo{
    pub token_id: String,
    pub depositor: String,
    pub migrated: bool,
    pub deposit_time: Timestamp,
    pub migrate_time: Timestamp
}

impl InstantiateMsg {
    pub fn validate(&self) -> StdResult<()> {
        // Check name, symbol, decimals
        if !is_valid_name(&self.name) {
            return Err(StdError::generic_err(
                "Name is not in the expected format (3-50 UTF-8 bytes)",
            ));
        }
        Ok(())
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum ExecuteMsg {
    ReceiveNft {
        sender: String,
        token_id: String,
        msg: Binary,
    },
    SetOwner {
        owner: String,
    },
    Migrated {
        token_id: String,
    },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    ContractInfo {},
    RegisteredTokens {
        start_after: Option<String>,
        limit: Option<u32>,
    },
    UserTokens {
        user: String,
        start_after: Option<String>,
        limit: Option<u32>,
    },
    Depositor {
        token_id: String,
    },
}

#[derive(Serialize, Deserialize, Clone, PartialEq, JsonSchema, Debug)]
pub struct ContractInfoResponse {
    pub name: String,
    pub nft_address: String,
    pub owner: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum ReceiveMsg {
    DepositNft { token_id: String },
}

#[derive(Serialize, Deserialize, Clone, PartialEq, JsonSchema, Debug)]
pub struct TokensResponse {
    pub tokens: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, PartialEq, JsonSchema, Debug)]
pub struct TokenInfoResponse {
    pub tokens: Vec<TokenInfo>,
}
