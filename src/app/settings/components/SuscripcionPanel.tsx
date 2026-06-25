import { CuentaSubscription } from "../../ui/cuenta-subscription";

export function SuscripcionPanel() {
  return (
    <div>
      <div className="px-5 py-5 sm:px-8">
        <h2 className="text-xl font-semibold text-slate-950">Suscripción</h2>
        <p className="mt-1 text-sm text-slate-500">Tu plan activo y estado de facturación</p>
      </div>
      <hr className="border-slate-200" />
      <CuentaSubscription />
    </div>
  );
}
