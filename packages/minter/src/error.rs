use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug, PartialEq)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Minter : Unauthorized")]
    Unauthorized {},

    #[error("WrongNft")]
    WrongNft {},

    #[error("Contract Not Initialized")]
    ContractNotInitialized {},

    #[error("Fee not paid correctly, required: {required:?}uust, provided {provided:?}uluna")]
    FeeNotPaidCorrectly { required: u128, provided: u128 },

    #[error("Fee not paid")]
    FeeNotPaid {},
}
