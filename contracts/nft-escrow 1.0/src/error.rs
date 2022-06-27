use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug, PartialEq)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("NFT provided doesn't match the message sent")]
    IncorrectContract {},

    #[error("Token id provided doesn't match the message sent")]
    IncorrectTokenId {},

    #[error("Token not deposited in the contract yet")]
    TokenNotDeposited {},
}
