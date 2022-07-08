use cosmwasm_std::{Addr, Deps};
use cw_storage_plus::Item;
use minter_export::error::ContractError;
use minter_export::state::{ContractInfo};

pub const CONTRACT_INFO: Item<ContractInfo> = Item::new("contract_info");

pub fn is_owner(deps: Deps, addr: Addr) -> Result<(), ContractError> {
    if CONTRACT_INFO.load(deps.storage)?.owner == addr {
        Ok(())
    } else {
        Err(ContractError::Unauthorized {})
    }
}
