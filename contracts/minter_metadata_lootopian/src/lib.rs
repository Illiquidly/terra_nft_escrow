#[cfg(not(feature = "library"))]
use anyhow::Result;
use cosmwasm_std::{entry_point, Binary, Deps, DepsMut, Env, MessageInfo, Response};

use minter_export::contract::{
    execute as minter_execute, instantiate as minter_instantiate, query as minter_query,
};
use minter_export::msg::{ExecuteMsg, InstantiateMsg, QueryMsg};

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, PartialEq, JsonSchema, Debug, Default)]
pub struct Trait {
    pub display_type: Option<String>,
    pub trait_type: String,
    pub value: String,
}
// see: https://docs.opensea.io/docs/metadata-standards
#[derive(Serialize, Deserialize, Clone, PartialEq, JsonSchema, Debug, Default)]
pub struct Metadata {
    pub image: Option<String>,
    pub image_data: Option<String>,
    pub external_url: Option<String>,
    pub description: Option<String>,
    pub name: Option<String>,
    pub attributes: Option<Vec<Trait>>,
    pub sections: Option<Vec<LootopianBodySection>>,
    pub stats: Option<LootopianStats>,
    pub background_color: Option<String>,
    pub animation_url: Option<String>,
    pub youtube_url: Option<String>,
}
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct LootopianBodySection {
    pub section_id: u64,
    pub section_name: String,
    pub nft_token_id: u64,
    pub db_item_id: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct LootopianStats {
    pub stat_str: u64,
    pub stat_agi: u64,
    pub stat_vit: u64,
    pub stat_int: u64,
    pub stat_luk: u64,
    pub stat_dex: u64,
}
// This is a simple type to let us handle empty extensions
pub type Extension = Option<Metadata>;

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response> {
    minter_instantiate(deps, env, info, msg)
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg<Extension>,
) -> Result<Response> {
    minter_execute(deps, env, info, msg)
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, env: Env, msg: QueryMsg) -> Result<Binary> {
    minter_query(deps, env, msg)
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};
    use cosmwasm_std::{coins, Uint128};
    use cw721_base::MintMsg;
    use minter_export::msg::MintRequest;
    fn init_helper(deps: DepsMut) -> Response {
        let instantiate_msg = InstantiateMsg {
            name: "fee_contract".to_string(),
            owner: None,
            treasury: Some("meonly".to_string()),
            fee_price: Uint128::from(456u128),
            project_price: Uint128::from(0u128),
            project_treasury: "meonly".to_string(),
            minter: "AjBui2DTkLVKo2p5uCXf68SbHzSDoRDESKNtsr3+vtJI".to_string(),
        };
        let info = mock_info("creator", &[]);
        let env = mock_env();

        instantiate(deps, env, info, instantiate_msg).unwrap()
    }

    #[test]
    fn test_init_sanity() {
        let mut deps = mock_dependencies();
        let res = init_helper(deps.as_mut());
        assert_eq!(0, res.messages.len());
    }

    #[test]
    fn test_update_owner() {
        let mut deps = mock_dependencies();
        init_helper(deps.as_mut());

        let info = mock_info("creator", &[]);
        let env = mock_env();
        execute(
            deps.as_mut(),
            env.clone(),
            info.clone(),
            ExecuteMsg::SetOwner {
                owner: "this_other_person".to_string(),
            },
        )
        .unwrap();

        execute(
            deps.as_mut(),
            env,
            info,
            ExecuteMsg::SetOwner {
                owner: "still someoneelse".to_string(),
            },
        )
        .unwrap_err();
    }

    #[test]
    fn test_update_fee_price() {
        let mut deps = mock_dependencies();
        init_helper(deps.as_mut());

        let info = mock_info("creator", &[]);
        let env = mock_env();
        execute(
            deps.as_mut(),
            env.clone(),
            info,
            ExecuteMsg::SetFeePrice {
                price: Uint128::from(899898u128),
            },
        )
        .unwrap();

        let info = mock_info("bad_person", &[]);
        execute(
            deps.as_mut(),
            env,
            info,
            ExecuteMsg::SetFeePrice {
                price: Uint128::from(909009898u128),
            },
        )
        .unwrap_err();
    }

    #[test]
    fn test_update_minter() {
        let mut deps = mock_dependencies();
        init_helper(deps.as_mut());

        let info = mock_info("creator", &[]);
        let env = mock_env();
        execute(
            deps.as_mut(),
            env.clone(),
            info,
            ExecuteMsg::SetMinter {
                minter: "any_pu_bkey".to_string(),
            },
        )
        .unwrap();

        let info = mock_info("bad_person", &[]);
        execute(
            deps.as_mut(),
            env,
            info,
            ExecuteMsg::SetMinter {
                minter: "any_pu_bkey".to_string(),
            },
        )
        .unwrap_err();
    }

    #[test]
    fn test_mint() {
        let mut deps = mock_dependencies();
        init_helper(deps.as_mut());

        let info = mock_info("creator", &coins(77487, "uluna"));
        let env = mock_env();

        // 1. We initialized the contract with the nft address
        let nft_contract =
            "terra14dcwvg4zplrc28g5q3802n2mmnp3fsp2yh7mn7gkxssnrjqp4ycq676kqf".to_string();
        execute(
            deps.as_mut(),
            env.clone(),
            info.clone(),
            ExecuteMsg::SetNftContract {
                nft_contract: nft_contract.clone(),
            },
        )
        .unwrap();

        let mint_msg: MintMsg<Extension> = MintMsg {
            token_id: "test".to_string(),
            owner: "terra1dcegyrekltswvyy0xy69ydgxn9x8x32zdtapd8".to_string(),
            token_uri: Some("no_uri".to_string()),
            extension: None,
        };
        let signature = "4cDdgx6kJeCLh53RXia+LN8ULujqfmiqM0CGBlBnDUhiht4bqmwM9N0ZbygDIDwDZQLnrXv/DzaqGkEYRqv41Q==";
        execute(
            deps.as_mut(),
            env.clone(),
            info,
            ExecuteMsg::Mint {
                mint_request: MintRequest {
                    mint_msg: mint_msg.clone(),
                    nft_contract: nft_contract.clone(),
                },
                signature: signature.to_string(),
            },
        )
        .unwrap_err();

        let info = mock_info("creator", &coins(456, "uluna"));
        execute(
            deps.as_mut(),
            env,
            info,
            ExecuteMsg::Mint {
                mint_request: MintRequest {
                    mint_msg,
                    nft_contract,
                },
                signature: signature.to_string(),
            },
        )
        .unwrap_err();
    }
}
