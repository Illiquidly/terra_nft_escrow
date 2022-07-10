#[cfg(not(feature = "library"))]
use std::fmt::Debug;
use serde::Serialize;
use cosmwasm_std::{
    entry_point, to_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdError, StdResult,
    Uint128, BankMsg, coins
};
use sha2::{Digest, Sha256};

use anyhow::{anyhow, Result};
use crate::error::ContractError;
use crate::msg::{ExecuteMsg, InstantiateMsg, MigrateMsg, QueryMsg, MintRequest, FeeResponse};
use crate::state::{ContractInfo};

use cw721_base::{ExecuteMsg as Cw721ExecuteMsg};

use crate::state::{is_owner, CONTRACT_INFO};
use crate::msg::into_cosmos_msg;


pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response> {
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

pub fn execute<T: Clone + Serialize + Debug>(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg<T>,
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
        ExecuteMsg::SetProjectFeePrice {
            price
        } => set_project_price(
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

pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> Result<Binary> {
    match msg {
        QueryMsg::FeePrice {} => {
            let contract_info = CONTRACT_INFO.load(deps.storage)?;
            let fee_response = FeeResponse{
                fee_price: contract_info.fee_price,
                project_price: contract_info.project_price
            };

            to_binary(&fee_response).map_err(|x| anyhow!(x))
        },
    }
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
