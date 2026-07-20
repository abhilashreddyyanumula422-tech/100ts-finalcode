import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../services/api';

const AgentsManagement = () => {
  const [agents, setAgents] = useState([]);
  const [form, setForm] = useState({ name: '', employee_id: '', mobile: '', email: '', password: '', is_active: true });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { fetchAgents(); }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch(${API_BASE}/api/admin/agents/);
      if (res.ok) { setAgents(await res.json()); }
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingId ? ${API_BASE}/api/admin/agents// : ${API_BASE}/api/admin/agents/;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      });
      if (res.ok) {
        fetchAgents(); setForm({ name: '', employee_id: '', mobile: '', email: '', password: '', is_active: true }); setEditingId(null);
      } else { alert('Error saving agent'); }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      const res = await fetch(${API_BASE}/api/admin/agents//, { method: 'DELETE' });
      if (res.ok) fetchAgents();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Agent Management</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow mb-8 grid grid-cols-2 gap-4">
        <input className="border p-2 rounded" placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
        <input className="border p-2 rounded" placeholder="Employee ID" value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})} required />
        <input className="border p-2 rounded" placeholder="Mobile" value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} required />
        <input className="border p-2 rounded" placeholder="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
        <input className="border p-2 rounded" placeholder="Password" type={editingId ? "text" : "password"} value={form.password} onChange={e => setForm({...form, password: e.target.value})} required={!editingId} />
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} /> Active
        </label>
        <button className="col-span-2 bg-blue-600 text-white p-2 rounded font-bold">{editingId ? 'Update Agent' : 'Add Agent'}</button>
      </form>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-4">Name</th><th className="p-4">Emp ID</th><th className="p-4">Email</th><th className="p-4">Mobile</th><th className="p-4">Status</th><th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.map(a => (
              <tr key={a.id} className="border-b">
                <td className="p-4">{a.name}</td><td className="p-4">{a.employee_id}</td><td className="p-4">{a.email}</td><td className="p-4">{a.mobile}</td>
                <td className="p-4">{a.is_active ? 'Active' : 'Inactive'}</td>
                <td className="p-4 flex gap-2">
                  <button onClick={() => { setForm(a); setEditingId(a.id); }} className="text-blue-600">Edit</button>
                  <button onClick={() => handleDelete(a.id)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default AgentsManagement;
