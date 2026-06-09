import { create } from "zustand"
import { apiRequest } from "@/store/apiClient"
import type { Profile } from "@/lib/verity"
import { toast } from "@/lib/toast"
import { queryClient } from "@/lib/queryClient"
import { useAuthStore } from "@/store/authStore"

export interface TxCall {
  contractAddress: string
  abiFunctionSignature: string
  abiParameters: any[]
}

export interface TxConfirmationState {
  isOpen: boolean
  calls: TxCall[]
  description: string
  estimatedCostUsdc: number
  claimAmountUsdc?: number
  resolve: ((txHash: string) => void) | null
  reject: ((err: Error) => void) | null
}

export interface TxStore {
  txConfirmState: TxConfirmationState
  isExecutingTx: boolean
  txError: string

  setTxConfirmState: (state: Partial<TxConfirmationState>) => void
  setTxError: (error: string) => void
  setIsExecutingTx: (isExecuting: boolean) => void

  executeTxBatch: (
    calls: TxCall[],
    description: string,
    estimatedCostUsdc: number,
    claimAmountUsdc?: number,
  ) => Promise<string>

  handleConfirmTx: () => Promise<void>
  handleCancelTx: () => void
}

export const useTxStore = create<TxStore>((set, get) => ({
  txConfirmState: {
    isOpen: false,
    calls: [],
    description: "",
    estimatedCostUsdc: 0,
    resolve: null,
    reject: null,
  },
  isExecutingTx: false,
  txError: "",

  setTxConfirmState: (state) =>
    set((s) => ({ txConfirmState: { ...s.txConfirmState, ...state } })),
  setTxError: (txError) => set({ txError }),
  setIsExecutingTx: (isExecutingTx) => set({ isExecutingTx }),

  executeTxBatch: (calls, description, estimatedCostUsdc, claimAmountUsdc) => {
    const user = queryClient.getQueryData<Profile>(["profile"])
    if (!user) {
      useAuthStore.getState().login()
      return Promise.reject(
        new Error("User must be signed in to execute transactions."),
      )
    }

    return new Promise<string>((resolve, reject) => {
      set({
        txConfirmState: {
          isOpen: true,
          calls,
          description,
          estimatedCostUsdc,
          claimAmountUsdc,
          resolve,
          reject,
        },
        txError: "",
      })
    })
  },

  handleConfirmTx: async () => {
    const { txConfirmState } = get()
    if (!txConfirmState.resolve || !txConfirmState.reject) return

    set({ isExecutingTx: true, txError: "" })
    try {
      const res = await apiRequest<{ txHash: string }>(
        "/circle-wallet/execute-batch",
        {
          method: "POST",
          body: JSON.stringify(
            {
              calls: txConfirmState.calls,
              estimatedCostUsdc: txConfirmState.estimatedCostUsdc,
            },
            (key, value) => {
              if (typeof value === "bigint") {
                return value.toString()
              }
              return value
            },
          ),
        },
      )

      txConfirmState.resolve(res.txHash)
      set((s) => ({ txConfirmState: { ...s.txConfirmState, isOpen: false } }))
      queryClient.invalidateQueries()
    } catch (err: any) {
      const parsedError = err.message || "Transaction execution failed."
      set({ txError: parsedError })
    } finally {
      set({ isExecutingTx: false })
    }
  },

  handleCancelTx: () => {
    const { txConfirmState } = get()
    if (txConfirmState.reject) {
      txConfirmState.reject(new Error("Transaction rejected by user."))
    }
    set((s) => ({ txConfirmState: { ...s.txConfirmState, isOpen: false } }))
  },
}))
