import { RolePermissionsTable } from "../../ui/role-permissions-table";
import { UsersList } from "../../ui/users-list";

export function UsuariosPanel() {
  return (
    <div>
      <div className="px-5 py-5 sm:px-8">
        <h2 className="text-xl font-semibold text-slate-950">Usuarios</h2>
        <p className="mt-1 text-sm text-slate-500">Gestioná los usuarios y roles</p>
      </div>
      <hr className="border-slate-200" />
      <UsersList />
      <hr className="border-slate-200" />
      <RolePermissionsTable />
    </div>
  );
}
