"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, Users } from "lucide-react";
import { UserAvatar } from "./user-avatar";

type CashierUserRecord = {
  id: string;
  name: string;
  userCode: string | null;
  avatarUrl: string | null;
};

export type SwitchCashierResult = {
  id: string;
  name: string;
  userCode: string | null;
};

type SwitchCashierModalProps = {
  open: boolean;
  onConfirm: (result: SwitchCashierResult) => void;
  onCancel: () => void;
};

export function SwitchCashierModal({ open, onConfirm, onCancel }: SwitchCashierModalProps) {
  const [users, setUsers] = useState<CashierUserRecord[]>([]);
  const [selectedUser, setSelectedUser] = useState<CashierUserRecord | null>(null);
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setSelectedUser(null);
    setPin("");
    setError(null);

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

  async function handleSubmit() {
    if (!selectedUser || pin.length !== 4) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/switch-cashier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id, pin })
      });
      const body = await res.json();
      if (!res.ok || !body.data) {
        setError(body.error?.message ?? "PIN incorrecto.");
        return;
      }
      onConfirm(body.data.activeCashier);
    } catch {
      setError("No se pudo cambiar de cajero.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <Users className="text-violet-600" size={18} />
          <h3 className="text-sm font-semibold text-slate-950">Cambiar de cajero</h3>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          {!selectedUser ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Seleccioná el usuario</p>
              <div className="grid grid-cols-2 gap-2">
                {users.map((user) => (
                  <button
                    key={user.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:border-violet-300"
                    onClick={() => {
                      setSelectedUser(user);
                      setPin("");
                      setError(null);
                    }}
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
          ) : (
            <div>
              <button
                className="mb-3 flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
                onClick={() => {
                  setSelectedUser(null);
                  setError(null);
                }}
                type="button"
              >
                <ChevronLeft size={14} />
                Elegir otro usuario
              </button>
              <div className="mb-3 flex items-center gap-2">
                <UserAvatar avatarUrl={selectedUser.avatarUrl} name={selectedUser.name} size={32} />
                <p className="text-sm font-medium text-slate-800">{selectedUser.name}</p>
              </div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="switch-cashier-pin">
                PIN de 4 dígitos
              </label>
              <input
                autoFocus
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-center text-lg tracking-[0.5em] text-slate-950 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                id="switch-cashier-pin"
                inputMode="numeric"
                maxLength={4}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && pin.length === 4) handleSubmit();
                }}
                placeholder="••••"
                type="password"
                value={pin}
              />
              {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
            </div>
          )}
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
            disabled={!selectedUser || pin.length !== 4 || isSubmitting}
            onClick={handleSubmit}
            type="button"
          >
            {isSubmitting ? "Verificando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
