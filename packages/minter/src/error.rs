use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug, PartialEq)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("WrongNft")]
    WrongNft {},

    #[error("Contract Not Initialized")]
    ContractNotInitialized{},

    #[error("Fee not paid correctly, required: {required:?}uust, provided {provided:?}uluna")]
    FeeNotPaidCorrectly { required: u128, provided: u128 },

    #[error("Fee not paid")]
    FeeNotPaid {},

    #[error("Trade not accepted")]
    TradeNotAccepted {},

    #[error("Fee Teers not ordered, you can't change them")]
    TeersNotOrdered {},

    #[error("Error when encoding response message to binary string")]
    BinaryEncodingError {},
}
