import React, { useMemo, useState } from "react";
import { useBingo } from "../context/BingoContext";

export const UsersAdmin: React.FC = () => {
  const { currentUser, users, createUser, updateUserAccount, deleteUserAccount } = useBingo();
  const [form, setForm] = useState({ username: "", name: "", password: "", role: "operator" as "admin" | "operator" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [edit, setEdit] = useState({ username: "", name: "", password: "", role: "operator" as "admin" | "operator", isActive: true });
  const [error, setError] = useState("");

  const sortedUsers = useMemo(() => users.slice().sort((a, b) => a.name.localeCompare(b.name)), [users]);

  if (currentUser?.role !== "admin") {
    return <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-sm text-rose-100">Somente administrador pode gerenciar usuarios.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white">Gerenciar Usuarios</h2>
        <p className="text-xs text-rose-200/60 mt-1">Cadastre quem pode acessar o sistema.</p>
      </div>

      {error && <div className="bg-rose-500/15 border border-rose-500/30 text-rose-200 rounded-xl px-4 py-3 text-sm">{error}</div>}

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Nome" className="px-4 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" />
        <input value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} placeholder="Usuario" className="px-4 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" />
        <input value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="Senha" type="password" className="px-4 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" />
        <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as "admin" | "operator" }))} className="px-4 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm">
          <option value="operator">Operador</option>
          <option value="admin">Administrador</option>
        </select>
        <button
          onClick={async () => {
            try {
              setError("");
              await createUser(form);
              setForm({ username: "", name: "", password: "", role: "operator" });
            } catch (error: any) {
              setError(error.message || "Falha ao criar usuario.");
            }
          }}
          className="bg-yellow-400 text-black font-bold rounded-xl px-4 py-2 text-sm cursor-pointer"
        >
          Cadastrar
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
        {sortedUsers.map((user) => (
          <div key={user.id} className="border border-white/10 rounded-xl p-4 bg-black/20">
            {editingId === user.id ? (
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <input value={edit.name} onChange={(e) => setEdit((p) => ({ ...p, name: e.target.value }))} className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" />
                <input value={edit.username} onChange={(e) => setEdit((p) => ({ ...p, username: e.target.value }))} className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" />
                <input value={edit.password} onChange={(e) => setEdit((p) => ({ ...p, password: e.target.value }))} placeholder="Nova senha opcional" type="password" className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" />
                <select value={edit.role} onChange={(e) => setEdit((p) => ({ ...p, role: e.target.value as "admin" | "operator" }))} className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm">
                  <option value="operator">Operador</option>
                  <option value="admin">Administrador</option>
                </select>
                <select value={edit.isActive ? "1" : "0"} onChange={(e) => setEdit((p) => ({ ...p, isActive: e.target.value === "1" }))} className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm">
                  <option value="1">Ativo</option>
                  <option value="0">Inativo</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        setError("");
                        await updateUserAccount(user.id, edit);
                        setEditingId(null);
                      } catch (error: any) {
                        setError(error.message || "Falha ao salvar usuario.");
                      }
                    }}
                    className="flex-1 bg-emerald-600 text-white rounded-xl px-3 py-2 text-sm cursor-pointer"
                  >
                    Salvar
                  </button>
                  <button onClick={() => setEditingId(null)} className="bg-white/10 text-white rounded-xl px-3 py-2 text-sm cursor-pointer">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="text-white font-bold">{user.name}</div>
                  <div className="text-xs text-rose-200/60">{user.username} • {user.role} • {user.isActive ? "ativo" : "inativo"}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingId(user.id);
                      setEdit({ username: user.username, name: user.name, password: "", role: user.role, isActive: user.isActive });
                    }}
                    className="bg-white/10 text-white rounded-xl px-3 py-2 text-sm cursor-pointer"
                  >
                    Editar
                  </button>
                  <button
                    onClick={async () => {
                      if (user.id === currentUser.id) {
                        setError("Nao exclua o usuario logado.");
                        return;
                      }
                      if (!window.confirm(`Excluir usuario ${user.name}?`)) return;
                      try {
                        setError("");
                        await deleteUserAccount(user.id);
                      } catch (error: any) {
                        setError(error.message || "Falha ao excluir usuario.");
                      }
                    }}
                    className="bg-rose-900/80 text-white rounded-xl px-3 py-2 text-sm cursor-pointer"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
