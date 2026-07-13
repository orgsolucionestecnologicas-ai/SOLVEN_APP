"use client";

import { useEffect, useState } from "react";
import { FileText, Shield } from "lucide-react";
import { UserAvatar } from "./user-avatar";

type GateUserRecord = {
  id: string;
  name: string;
  userCode: string | null;
  avatarUrl: string | null;
};

export type SaleGateResult = {
  sellerId: string;
  sellerCode: string;
  sellerName: string;
  receiptType: "TICKET" | "INVOICE";
};

type SaleGateModalProps = {
  open: boolean;
  arcaEnabled: boolean;
  onConfirm: (result: SaleGateResult) => void;
  onCancel: () => void;
};

export function SaleGateModal({ open, arcaEnabled, onConfirm, onCancel }: SaleGateModalProps) {
  const [users, setUsers] = useState<GateUserRecord[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<GateUserRecord | null>(null);
  const [receiptType, setReceiptType] = useState<"TICKET" | "INVOICE" | null>(null);

  useEffect(() => {
    if (!open) return;

    setSelectedSeller(null);
    setReceiptType(null);

    async function loadUsers() {
      try {
        const res = await fetch("/api/users", { headers: { Accept: "application/json" } });
        const body = await res.json();
        if (res.ok && Array.isArray(body.data)) {
          setUsers(body.data);
        }
      } catch {
        setUsers([]);
      }
    }

    void loadUsers();
  }, [open]);

  if (!open) return null;

  const canConfirm = selectedSeller !== null && receiptType !== null;

  function handleConfirm() {
    if (!selectedSeller || !receiptType) return;
    onConfirm({
      sellerId: selectedSeller.id,
      sellerCode: selectedSeller.userCode ?? "",
      sellerName: selectedSeller.name,
      receiptType
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <Shield className="text-violet-600" size={18} />
          <h3 className="text-sm font-semibold text-slate-950">Iniciar nueva venta</h3>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-5 py-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
              Código vendedor
            </p>
            <div className="grid grid-cols-2 gap-2">
              {users.map((user) => (
                <button
                  key={user.id}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition ${
                    selectedSeller?.id === user.id
                      ? "border-violet-500 bg-violet-50"
                      : "border-slate-200 hover:border-violet-300"
                  }`}
                  onClick={() => setSelectedSeller(user)}
                  type="button"
                >
                  <UserAvatar avatarUrl={user.avatarUrl} name={user.name} size={28} />
                  <span className="min-w-0">
                    <p className="font-mono text-sm font-bold text-violet-700">
                      {user.userCode ?? "—"}
                    </p>
                    <p className="truncate text-xs text-slate-500">{user.name}</p>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
              Tipo de comprobante
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`flex flex-col items-center gap-1 rounded-lg border px-3 py-3 transition ${
                  receiptType === "TICKET"
                    ? "border-violet-500 bg-violet-50 text-violet-700"
                    : "border-slate-200 text-slate-600 hover:border-violet-300"
                }`}
                onClick={() => setReceiptType("TICKET")}
                type="button"
              >
                <FileText size={18} />
                <span className="text-sm font-medium">Ticket de venta</span>
              </button>
              <button
                className={`flex flex-col items-center gap-1 rounded-lg border px-3 py-3 transition ${
                  !arcaEnabled
                    ? "cursor-not-allowed border-dashed border-slate-200 text-slate-400"
                    : receiptType === "INVOICE"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-600 hover:border-emerald-300"
                }`}
                disabled={!arcaEnabled}
                onClick={() => setReceiptType("INVOICE")}
                type="button"
              >
                <FileText size={18} />
                <span className="text-sm font-medium">Factura (ARCA)</span>
                {!arcaEnabled ? (
                  <span className="text-[10px]">Activar en Configuración → ARCA</span>
                ) : null}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canConfirm}
            onClick={handleConfirm}
            type="button"
          >
            Confirmar e iniciar venta
          </button>
        </div>
      </div>
    </div>
  );
}
