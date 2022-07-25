use cosmwasm_std::{StdError, StdResult, Uint128, Coin, CosmosMsg, Binary, to_binary, WasmMsg};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use cw721_base::{ MintMsg};

#[derive(Serialize, Deserialize, JsonSchema, Debug, Clone, PartialEq)]
pub struct MigrateMsg {}

#[derive(Serialize, Deserialize, JsonSchema, Debug, Clone, PartialEq)]
pub struct InstantiateMsg {
    pub name: String,
    pub owner: Option<String>,
    pub minter: String,
    pub fee_price: Uint128,
    pub treasury: Option<String>,
    pub project_price: Uint128,
    pub project_treasury: String,
}

pub fn is_valid_name(name: &str) -> bool {
    let bytes = name.as_bytes();
    if bytes.len() < 3 || bytes.len() > 50 {
        return false;
    }
    true
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
pub enum ExecuteMsg<T: Clone> {
    Mint { 
        mint_request: MintRequest<T>,
        signature: String
    },
    SetMinter {
        minter: String,
    },
    SetOwner {
        owner: String
    },
    SetFeePrice {
        price: Uint128
    },
    SetProjectFeePrice {
        price: Uint128
    },
    SetTreasury {
        treasury: String
    },
    SetProjectTreasury {
        treasury: String
    },
    SetNftContract {
        nft_contract: String
    },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
   FeePrice{}
}


pub fn into_binary<M: Serialize>(msg: M) -> StdResult<Binary> {
    to_binary(&msg)
}

pub fn into_cosmos_msg<M: Serialize, T: Into<String>>(
    message: M,
    contract_addr: T,
    funds: Option<Vec<Coin>>,
) -> StdResult<CosmosMsg> {
    let msg = into_binary(message)?;
    let execute = WasmMsg::Execute {
        contract_addr: contract_addr.into(),
        msg,
        funds: funds.unwrap_or_default(),
    };
    Ok(execute.into())
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub struct MintRequest<T>{
    pub mint_msg: MintMsg<T>,
    pub nft_contract: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub struct FeeResponse{
    pub fee_price: Uint128,
    pub project_price: Uint128,
}