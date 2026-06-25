import { Settings } from "../../ui/settings";

export function NegocioPanel() {
  return (
    <div>
      <div className="px-5 py-5 sm:px-8">
        <h2 className="text-xl font-semibold text-slate-950">Mi Negocio</h2>
        <p className="mt-1 text-sm text-slate-500">Nombre, contacto e información fiscal</p>
      </div>
      <hr className="border-slate-200" />
      <Settings />
    </div>
  );
}
