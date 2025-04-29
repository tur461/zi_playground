import { SorobanContextType } from "@soroban-react/core";
import { Asset } from "@stellar-asset-lists/sdk";
import { Address, nativeToScVal, scValToNative, xdr } from "@stellar/stellar-sdk";

import { contractInvoke } from "@/lib/contract-fe";
import { accountToScVal, scValToNumber } from "@/utils";

const airdropContractId = process.env.NEXT_PUBLIC_AIRDROP_CONTRACT_ID!;
const liquidityContractId = process.env.NEXT_PUBLIC_LIQUIDITY_POOL_CONTRACT_ID!;

export async function tokenBalance(
  sorobanContext: SorobanContextType,
  tokenAddress: string
) {
  const { address } = sorobanContext;

  if (!address) {
    throw new Error("Wallet is not connected yet.");
  }

  const response = await contractInvoke({
    contractAddress: tokenAddress,
    method: "balance",
    args: [accountToScVal(address)],
    sorobanContext,
  });

  return scValToNumber(response);
}

export async function tokenDecimals(
  sorobanContext: SorobanContextType,
  tokenAddress: string
) {
  const response = await contractInvoke({
    contractAddress: tokenAddress,
    method: "decimals",
    sorobanContext,
  });
  
  return scValToNumber(response);
}

export const getAirdropStatus = async (
  sorobanContext: SorobanContextType,
  address: string,
  action: number
) => {
  const response = await contractInvoke({
    contractAddress: airdropContractId,
    method: "is_performed_action",
    args: [accountToScVal(address), xdr.ScVal.scvU32(action)],
    sorobanContext,
  });

  return scValToNative(response as any);
};

export const sendAsset = async (
  sorobanContext: SorobanContextType,
  asset: Asset,
  recipient: string,
  memo: string,
  amount: number
) => {
  const { address } = sorobanContext;

  if (!address) {
    throw new Error("Wallet is not connected yet.");
  }

  return contractInvoke({
    contractAddress: asset.contract,
    method: "transfer",
    args: [
      accountToScVal(address),
      accountToScVal(recipient),
      nativeToScVal(amount * Math.pow(10, asset.decimals), { type: "i128" }),
    ],
    memo,
    sorobanContext,
    signAndSend: true,
    reconnectAfterTx: false,
  })
};


export const getReserves = async (
  sorobanContext: SorobanContextType
) => {
  const response = await contractInvoke({
    contractAddress: liquidityContractId,
    method: "get_reserves",
    args: [],
    sorobanContext,
  });
  return scValToNative(response as any);
};

export const addLiquidity = async (
  sorobanContext: SorobanContextType,
  args: Array<any>
) => {
  const response = await contractInvoke({
    contractAddress: liquidityContractId,
    method: "add_liquidity",
    args,
    sorobanContext,
    signAndSend: true,
    reconnectAfterTx: false,
  });
  console.log("addLiquidity response", response);
  return response;
};

export const getTokenInfo = async (
  sorobanContext: SorobanContextType,
  tokenAddress: string,
  account: string
) => {
  let response = await contractInvoke({
    contractAddress: tokenAddress,
    method: "decimals",
    args: [],
    sorobanContext,
  });
  const decimal = scValToNumber(response);

  response = await contractInvoke({
    contractAddress: tokenAddress,
    method: "symbol",
    args: [],
    sorobanContext,
  });
  const symbol = scValToNative(response as any);

  response = await contractInvoke({
    contractAddress: tokenAddress,
    method: "balance",
    args: [accountToScVal(account)],
    sorobanContext,
  });
  const balance = scValToNative(response as any);
  
  return {
    address: tokenAddress,
    symbol,
    decimal,
    balance
  };
}

async function getSeqNumber(sorobanContext: SorobanContextType): Promise<number> {
  const { server } = sorobanContext;

  if (!server) {
    throw new Error("Not connected to a Soroban server");
  }

  const latestLedger = await server.getLatestLedger();
  const sequence = latestLedger.sequence;
  console.log("Sequence number", sequence);
  return sequence;
}

export const approveSpending = async (
  sorobanContext: SorobanContextType,
  tokenAddress: string,
  approver: string,
  amount: bigint,
  expiration: number,
) => {
  const spender = Address.fromString(liquidityContractId).toScVal();
  const approverScVal = Address.fromString(approver).toScVal();
  const expiry = await getSeqNumber(sorobanContext) + expiration;
  const response = await contractInvoke({
    contractAddress: tokenAddress,
    method: "approve",
    signAndSend: true,
    args: [
      approverScVal, // from
      spender, // spender
      nativeToScVal(amount, { type: "i128" }), // amount
      nativeToScVal(expiry, { type: "u32" }) // expiration
    ],
    sorobanContext,
    reconnectAfterTx: false,
  });
  return response as any;
}

export const hasEnoughAllowance = async (
  sorobanContext: SorobanContextType,
  tokenAddress: string,
  approver: string,
  amount: bigint,
) => {
  const spender = liquidityContractId;
  const response = await contractInvoke({
    contractAddress: tokenAddress,
    method: "allowance",
    args: [
      accountToScVal(approver),
      accountToScVal(spender),
    ],
    sorobanContext,
  });
  console.log("allowance", scValToNative(response as any), scValToNative(response as any) >= amount);
  return (scValToNative(response as any) >= amount);
}