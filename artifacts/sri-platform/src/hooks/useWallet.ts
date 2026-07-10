/**
 * useWallet — multi-wallet EIP-1193 hook for the SARA token interface.
 * Supports MetaMask, Coinbase, Rabby, Brave, Rainbow, Trust, and any injected provider.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import {
  SARA_ABI,
  SARA_CONTRACT_ADDRESS,
  SEPOLIA_CHAIN_ID,
  SEPOLIA_NETWORK_PARAMS,
  formatSara,
  shortenAddress,
} from "@/lib/sara";
import type { EthereumProvider } from "@/lib/walletProviders";

export type WalletStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "wrong_network"
  | "not_installed"
  | "error";

export interface WalletState {
  status: WalletStatus;
  walletType: string | null;
  address: string | null;
  shortAddress: string | null;
  ethBalance: string | null;
  saraBalance: string | null;
  saraBalanceRaw: bigint | null;
  votingPower: string | null;
  delegate: string | null;
  chainId: number | null;
  errorMessage: string | null;
  // Actions — connectWith returns true on success, false on failure
  connectWith: (provider: EthereumProvider, name: string) => Promise<boolean>;
  disconnect: () => void;
  switchToSepolia: () => Promise<void>;
  delegateTo: (address: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useWallet(): WalletState {
  const [status, setStatus] = useState<WalletStatus>("idle");
  const [walletType, setWalletType] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [saraBalance, setSaraBalance] = useState<string | null>(null);
  const [saraBalanceRaw, setSaraBalanceRaw] = useState<bigint | null>(null);
  const [votingPower, setVotingPower] = useState<string | null>(null);
  const [delegate, setDelegate] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Store the active raw provider for switch/delegate/refresh
  const rawProviderRef = useRef<EthereumProvider | null>(null);

  // ── Fetch balances ──────────────────────────────────────────────────────────

  const fetchBalances = useCallback(async (addr: string, provider: ethers.BrowserProvider) => {
    try {
      const [ethBal, network] = await Promise.all([
        provider.getBalance(addr),
        provider.getNetwork(),
      ]);

      const chainIdNum = Number(network.chainId);
      setChainId(chainIdNum);
      setEthBalance(parseFloat(ethers.formatEther(ethBal)).toFixed(4));

      if (chainIdNum !== SEPOLIA_CHAIN_ID) {
        setStatus("wrong_network");
        return;
      }

      if (SARA_CONTRACT_ADDRESS) {
        const contract = new ethers.Contract(SARA_CONTRACT_ADDRESS, SARA_ABI, provider);
        const [balance, votes, delegatee] = await Promise.allSettled([
          contract.balanceOf(addr) as Promise<bigint>,
          contract.getVotes(addr) as Promise<bigint>,
          contract.delegates(addr) as Promise<string>,
        ]);
        if (balance.status === "fulfilled") {
          setSaraBalanceRaw(balance.value);
          setSaraBalance(formatSara(balance.value));
        }
        if (votes.status === "fulfilled") setVotingPower(formatSara(votes.value));
        if (delegatee.status === "fulfilled") setDelegate(delegatee.value);
      } else {
        setSaraBalance("—");
        setVotingPower("—");
      }

      setStatus("connected");
    } catch (err) {
      setEthBalance(null);
      setSaraBalance(null);
      setSaraBalanceRaw(null);
      setVotingPower(null);
      setDelegate(null);
      setErrorMessage(err instanceof Error ? err.message : "Failed to fetch balances");
      setStatus("error");
    }
  }, []);

  // ── Connect with a specific provider ──────────────────────────────────────

  const connectWith = useCallback(async (rawProvider: EthereumProvider, name: string): Promise<boolean> => {
    setStatus("connecting");
    setErrorMessage(null);
    setWalletType(name);
    rawProviderRef.current = rawProvider;

    try {
      const provider = new ethers.BrowserProvider(rawProvider);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      setAddress(addr);
      await fetchBalances(addr, provider);
      return true;
    } catch (err) {
      setStatus("error");
      setWalletType(null);
      rawProviderRef.current = null;
      setErrorMessage(err instanceof Error ? err.message : "Connection failed");
      return false;
    }
  }, [fetchBalances]);

  // ── Disconnect ──────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    setStatus("idle");
    setWalletType(null);
    setAddress(null);
    setEthBalance(null);
    setSaraBalance(null);
    setSaraBalanceRaw(null);
    setVotingPower(null);
    setDelegate(null);
    setChainId(null);
    setErrorMessage(null);
    rawProviderRef.current = null;
  }, []);

  // ── Switch to Sepolia ───────────────────────────────────────────────────────

  const switchToSepolia = useCallback(async () => {
    const rp = rawProviderRef.current;
    if (!rp) return;
    try {
      await rp.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_NETWORK_PARAMS.chainId }] });
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 4902) {
        await rp.request({ method: "wallet_addEthereumChain", params: [SEPOLIA_NETWORK_PARAMS] });
      }
    }
  }, []);

  // ── Delegate votes ──────────────────────────────────────────────────────────

  const delegateTo = useCallback(async (delegateeAddr: string) => {
    const rp = rawProviderRef.current;
    if (!rp || !SARA_CONTRACT_ADDRESS) return;
    const provider = new ethers.BrowserProvider(rp);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(SARA_CONTRACT_ADDRESS, SARA_ABI, signer);
    const tx = await (contract.delegate as (addr: string) => Promise<ethers.ContractTransactionResponse>)(delegateeAddr);
    await tx.wait();
    setDelegate(delegateeAddr);
  }, []);

  // ── Refresh ─────────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    const rp = rawProviderRef.current;
    if (!address || !rp) return;
    const provider = new ethers.BrowserProvider(rp);
    await fetchBalances(address, provider);
  }, [address, fetchBalances]);

  // ── Listen for account/chain changes (on the active provider) ───────────────

  useEffect(() => {
    const rp = rawProviderRef.current;
    if (!rp?.on) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const accs = accounts as string[];
      if (accs.length === 0) {
        disconnect();
      } else {
        setAddress(accs[0]);
        const provider = new ethers.BrowserProvider(rp);
        fetchBalances(accs[0], provider);
      }
    };

    const handleChainChanged = () => window.location.reload();

    rp.on("accountsChanged", handleAccountsChanged);
    rp.on("chainChanged", handleChainChanged);

    return () => {
      rp.removeListener?.("accountsChanged", handleAccountsChanged);
      rp.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [address, disconnect, fetchBalances]);

  return {
    status,
    walletType,
    address,
    shortAddress: address ? shortenAddress(address) : null,
    ethBalance,
    saraBalance,
    saraBalanceRaw,
    votingPower,
    delegate,
    chainId,
    errorMessage,
    connectWith,
    disconnect,
    switchToSepolia,
    delegateTo,
    refresh,
  };
}
