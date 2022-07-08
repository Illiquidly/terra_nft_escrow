#[cfg(not(feature = "library"))]
use std::fmt::Debug;
use serde::Serialize;
use cosmwasm_std::{
    entry_point, to_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdError, StdResult,
    Uint128, BankMsg, Empty, coins
};
use sha2::{Digest, Sha256};

use anyhow::{anyhow, Result};
use minter_export::error::ContractError;
use minter_export::msg::{ExecuteMsg, InstantiateMsg, MigrateMsg, QueryMsg, MintRequest };
use minter_export::state::{ContractInfo};

use cw721_base::{ExecuteMsg as Cw721ExecuteMsg, MintMsg};

use crate::state::{is_owner, CONTRACT_INFO};
use minter_export::msg::into_cosmos_msg;


// This is a simple type to let us handle empty extensions
pub type Extension = Option<Empty>;


#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    // Verify the contract name
    msg.validate()?;
    // store token info
    let data = ContractInfo {
        name: msg.name,
        owner: msg
            .owner
            .map(|x| deps.api.addr_validate(&x))
            .unwrap_or_else(|| Ok(info.sender.clone()))?,
        nft_contract: None,
        minter: msg.minter,
        treasury: msg
            .treasury
            .map(|x| deps.api.addr_validate(&x))
            .unwrap_or(Ok(info.sender))?,
        fee_price: msg.fee_price,
        project_treasury: deps.api.addr_validate(&msg.project_treasury)?,
        project_price: msg.project_price,
    };
    CONTRACT_INFO.save(deps.storage, &data)?;
    // Initialisation with fixed rates
    
    Ok(Response::default().add_attribute("fee_contract", "init"))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg<Extension>,
) -> Result<Response> {
    match msg {
        ExecuteMsg::Mint { mint_request, signature } => {
            mint(deps, env, info, mint_request, signature)
        },
        ExecuteMsg::SetMinter {
            minter
        } => set_minter(
            deps,
            env,
            info,
            minter
        ),
        ExecuteMsg::SetOwner {
            owner
        } => set_owner(
            deps,
            env,
            info,
            owner
        ),
        ExecuteMsg::SetFeePrice {
            price
        } => set_fee_price(
            deps,
            env,
            info,
            price
        ),
        ExecuteMsg::SetNftContract {
            nft_contract
        } => set_nft_contract(
            deps,
            env,
            info,
            nft_contract
        ),
    }
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(_deps: Deps, _env: Env, _msg: QueryMsg) -> Result<Binary> {
    Err(anyhow!(ContractError::Unauthorized{}))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn migrate(_deps: DepsMut, _env: Env, _msg: MigrateMsg) -> Result<Response, ContractError> {
    // No state migrations performed, just returned a Response
    Ok(Response::default())
}

/// This function is used to withdraw funds from an accepted trade.
/// It uses information from the trades and counter trades to determine how much needs to be paid
/// If the fee is sufficient, it sends the fee to the fee_depositor contract (responsible for fee distribution)
pub fn mint<T: Serialize + Clone + Debug>(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    mint_request: MintRequest<T>,
    signature: String,
) -> Result<Response> {
    let contract_info = CONTRACT_INFO.load(deps.storage)?;

    // We verify the contract has been initialized
    if contract_info.nft_contract.is_none(){
        return Err(anyhow!(ContractError::ContractNotInitialized{}))
    }

    // The fee can be paid in uluna only.
    // The price is fixed
    let fee_price = contract_info.fee_price;
    let project_price = contract_info.project_price;
    let total_price = fee_price + project_price;
    if total_price != Uint128::zero(){
        if info.funds.len() != 1 {
            return Err(anyhow!(ContractError::FeeNotPaid {}));
        }

        let funds = info.funds[0].clone();
        if funds.denom != "uluna" || funds.amount != total_price{
            return Err(anyhow!( ContractError::FeeNotPaidCorrectly { required: total_price.u128(), provided: funds.amount.u128()},));
        }
    }

    // Now we verify the message was indeed signed by the trusted minter


    validate_request_signature(
        &deps.as_ref(),
        &contract_info.minter,
        &mint_request,
        &signature

    )?;

    // Once the signature is validated, we can send a mint message to the nft contract
        
    let mint_message = into_cosmos_msg(
        Cw721ExecuteMsg::Mint(mint_request.mint_msg),
        contract_info.nft_contract.unwrap(),
        None
    )?;

    let response = Response::new()
        .add_attribute("action", "migrated_token")
        .add_message(mint_message);

    let response = if fee_price != Uint128::zero(){
        response.add_message(BankMsg::Send{
            amount: coins(fee_price.u128(),"uluna"),
            to_address: contract_info.treasury.to_string(),
        })
    }else{
        response
    };
    let response = if project_price != Uint128::zero(){
        response.add_message(BankMsg::Send{
            amount: coins(project_price.u128(),"uluna"),
            to_address: contract_info.project_treasury.to_string(),
        })
    }else{
        response
    };

    Ok(response)
}


/// Util to validate that the signature has been correctly signed by the distribution
/// contract owner
fn validate_request_signature<T: Serialize>(
    deps: &Deps,
    base64_pub_key: &String,
    request: &MintRequest<T>,
    base64_sig: &String,
) -> Result<()> {

    let pub_key = base64::decode(base64_pub_key)?;
    let signature = base64::decode(base64_sig)?;

    let data_bytes = to_binary(request)?.to_vec();
    let data_hash = Sha256::digest(data_bytes.as_slice());

    let verification_result = deps
        .api
        .secp256k1_verify(&data_hash, &signature, pub_key.as_ref())?;

    if verification_result {
        Ok(())
    } else {
        Err(anyhow!(ContractError::Unauthorized {}))
    }
}

pub fn set_owner(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    owner: String,
) -> Result<Response> {
    is_owner(deps.as_ref(), info.sender)?;

    let owner_addr = deps.api.addr_validate(&owner)?;
    CONTRACT_INFO.update::<_, StdError>(deps.storage, |mut x| {
        x.owner = owner_addr;
        Ok(x)
    })?;

    Ok(Response::new()
        .add_attribute("action", "parameter_update")
        .add_attribute("parameter", "owner")
        .add_attribute("value",owner))
}

pub fn set_minter(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    minter: String,
) -> Result<Response> {
    is_owner(deps.as_ref(), info.sender)?;

    CONTRACT_INFO.update::<_, StdError>(deps.storage, |mut x| {
        x.minter = minter.clone();
        Ok(x)
    })?;

    Ok(Response::new()
        .add_attribute("action", "parameter_update")
        .add_attribute("parameter", "minter")
        .add_attribute("value",minter))
}

pub fn set_fee_price(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    price: Uint128,
) -> Result<Response> {
    is_owner(deps.as_ref(), info.sender)?;

    CONTRACT_INFO.update::<_, StdError>(deps.storage, |mut x| {
        x.fee_price = price;
        Ok(x)
    })?;

    Ok(Response::new()
        .add_attribute("action", "parameter_update")
        .add_attribute("parameter", "fee_price")
        .add_attribute("value",price.to_string()))
}

pub fn set_project_price(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    price: Uint128,
) -> Result<Response> {
    is_owner(deps.as_ref(), info.sender)?;

    CONTRACT_INFO.update::<_, StdError>(deps.storage, |mut x| {
        x.project_price = price;
        Ok(x)
    })?;

    Ok(Response::new()
        .add_attribute("action", "parameter_update")
        .add_attribute("parameter", "project_fee_price")
        .add_attribute("value",price.to_string()))
}

pub fn set_nft_contract(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    nft_contract: String,
) -> Result<Response> {
    is_owner(deps.as_ref(), info.sender)?;

    CONTRACT_INFO.update(deps.storage, |mut x| {
        match x.nft_contract{
            Some(_) => Err(anyhow!(ContractError::WrongNft {})),
            None => {
                x.nft_contract = Some(nft_contract.clone());
                Ok(x)
            }
        }
    })?;

    Ok(Response::new()
        .add_attribute("action", "parameter_update")
        .add_attribute("parameter", "nft_contract")
        .add_attribute("value", nft_contract))
}

pub fn contract_info(deps: Deps) -> StdResult<ContractInfo> {
    CONTRACT_INFO.load(deps.storage)
}


#[cfg(test)]
pub mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};

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
                price: Uint128::from(899898u128)
            },
        )
        .unwrap();

        let info = mock_info("bad_person", &[]);
        execute(
            deps.as_mut(),
            env,
            info,
            ExecuteMsg::SetFeePrice {
                price: Uint128::from(909009898u128)
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
            ExecuteMsg::SetMinter{
                minter: "any_pu_bkey".to_string()
            },
        )
        .unwrap();

        let info = mock_info("bad_person", &[]);
        execute(
            deps.as_mut(),
            env,
            info,
            ExecuteMsg::SetMinter {
                minter: "any_pu_bkey".to_string()
            },
        )
        .unwrap_err();
    }


    #[test]
    fn test_mint() {
        let mut deps = mock_dependencies();
        init_helper(deps.as_mut());

        let info = mock_info("creator", &coins(77487,"uluna"));
        let env = mock_env();

        // 1. We initialized the contract with the nft address
        let nft_contract = "terra14dcwvg4zplrc28g5q3802n2mmnp3fsp2yh7mn7gkxssnrjqp4ycq676kqf".to_string();
        execute(
            deps.as_mut(),
            env.clone(),
            info.clone(),
            ExecuteMsg::SetNftContract{
                nft_contract: nft_contract.clone()
            },
        )
        .unwrap();
            

        let mint_msg: MintMsg<Extension> =  MintMsg{
            token_id: "test".to_string(),
            owner: "terra1dcegyrekltswvyy0xy69ydgxn9x8x32zdtapd8".to_string(),
            token_uri: Some("no_uri".to_string()),
            extension: None
        };
        let signature = "4cDdgx6kJeCLh53RXia+LN8ULujqfmiqM0CGBlBnDUhiht4bqmwM9N0ZbygDIDwDZQLnrXv/DzaqGkEYRqv41Q==";
        execute(
            deps.as_mut(),
            env.clone(),
            info,
            ExecuteMsg::Mint{
                mint_request:MintRequest{
                    mint_msg: mint_msg.clone(), 
                    nft_contract: nft_contract.clone()
                },
                signature: signature.to_string()
            },
        )
        .unwrap_err();

        let info = mock_info("creator", &coins(456,"uluna"));
        execute(
            deps.as_mut(),
            env.clone(),
            info,
            ExecuteMsg::Mint{
                 mint_request:MintRequest{
                    mint_msg: mint_msg.clone(), 
                    nft_contract
                },
                signature: signature.to_string()
            },
        )
        .unwrap();

    }
}
