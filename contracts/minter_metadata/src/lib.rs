#[cfg(not(feature = "library"))]
use anyhow::Result;
use cosmwasm_std::{entry_point, Binary, Deps, DepsMut, Env, MessageInfo, Response};

use cw721_metadata_onchain::Metadata;

use minter_export::contract::{
    execute as minter_execute, instantiate as minter_instantiate, query as minter_query,
};
use minter_export::msg::{ExecuteMsg, InstantiateMsg, QueryMsg};

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
            minter: "Atxyc0QMQkWOR0WfxpDKIhPpQInx34G9DtM7EWUHTWoj".to_string(),
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
            "terra1sf2fftvjt4z75g4rshngdxn5fr6qsccl78fgsz52fefwemxzvmaqptdfnp".to_string();
        execute(
            deps.as_mut(),
            env.clone(),
            info.clone(),
            ExecuteMsg::SetNftContract {
                nft_contract: nft_contract.clone(),
            },
        )
        .unwrap();

        let mint_msg: MintMsg<Extension> =  MintMsg{
            token_id: "35".to_string(),
            owner: "terra15h6ndxy6zyfn6l3cjvkyj5qa9hhe005wcy9z0p".to_string(),
            token_uri: Some("ipfs://QmRdybiU1cduXZoc5saVxxveUiKgwJmkj8dAiozAcdsGfB".to_string()),
            extension: Some(Metadata{
                image: Some("ipfs://QmRqqJkpRRthx8TU3u9fLUos7evC8Aurrgayum4HosoxNJ".to_string()),
                image_data: None,
                external_url: None,
                description: Some("Alas, the fuel that powers the ever-functioning intooorn brain. Without this, we as interns are lost, since this is the reward we work towards every single day. This delicious intern lunch is proof that you are indeed a proud supporter of the intooorns and we as a whole, thank you for your support. So please, lay back, relax and enjoy your ramen.".to_string()),
                name: Some("RameNFT".to_string()),
                attributes: None,
                background_color: None,
                animation_url: None,
                youtube_url: None
            })
        };
        let signature = "jt5iZxgHFg1a0KgI6te3/V2Pz7clGCXGJ1iNqiJG2tsq/jr0HsK7wU3u3UDSErTaAlrfrsT+a5W4F32BJda6Yg==";
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
        .unwrap();
    }
}
