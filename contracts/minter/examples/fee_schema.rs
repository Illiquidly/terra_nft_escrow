use cosmwasm_std::Empty;
use std::env::current_dir;
use std::fs::create_dir_all;

use cosmwasm_schema::{export_schema, remove_schemas, schema_for};

// This is a simple type to let us handle empty extensions
pub type Extension = Option<Empty>;

use minter_export::msg::{ExecuteMsg, InstantiateMsg, QueryMsg};

fn main() {
    let mut out_dir = current_dir().unwrap();
    out_dir.push("schema");
    create_dir_all(&out_dir).unwrap();
    remove_schemas(&out_dir).unwrap();

    export_schema(&schema_for!(InstantiateMsg), &out_dir);
    export_schema(&schema_for!(ExecuteMsg<Extension>), &out_dir);
    export_schema(&schema_for!(QueryMsg), &out_dir);
}
