import React, { useState } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, CalendarClock, Package, Activity,
  LogOut, Menu, X, MessageSquare,
} from "lucide-react";
import { clearAgentSession } from "../../services/api";
import { AgentDataProvider, useAgentData } from "../context/AgentDataContext";
import { initials } from "../utils/format";

const NAV = [
  { to: "/agent/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/agent/requests",  label: "Requests", icon: ClipboardList, badge: "requests" },
  { to: "/agent/visits",    label: "University Visits", icon: CalendarClock, badge: "visits" },
  { to: "/agent/delivery",  label: "Delivery", icon: Package, badge: "deliveries" },
  { to: "/agent/activity",  label: "Activity", icon: Activity },
  { to: "/agent/support",   label: "Support", icon: MessageSquare },
];

function badgeCount(key, data) {
  if (!data) return 0;
  if (key === "requests") return data.active_requests?.length || 0;
  if (key === "visits") return data.visits?.length || 0;
  if (key === "deliveries") return data.deliveries?.length || 0;
  return 0;
}

function Shell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { agent, data } = useAgentData();

  const logout = () => { clearAgentSession(); navigate("/agent/login"); };

  const nav = NAV.map(({ to, label, icon: Icon, end, badge }) => {
    const count = badge ? badgeCount(badge, data) : 0;
    return (
      <NavLink
        key={to}
        to={to}
        end={end}
        onClick={() => setOpen(false)}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition ${
            isActive
              ? "bg-white/10 text-white"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`
        }
      >
        {({ isActive }) => (
          <>
            <Icon size={16} className={isActive ? "text-blue-400" : ""} />
            <span className="flex-1">{label}</span>
            {count > 0 && (
              <span className="text-[10px] font-semibold bg-white/10 text-slate-300 px-1.5 py-0.5 rounded">
                {count}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  });

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className={`fixed inset-y-0 left-0 z-50 w-[248px] bg-[#0b1f38] flex flex-col
        transform transition-transform duration-200
        ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static`}>

        <div className="px-5 py-5 border-b border-white/5">
          <p className="text-[17px] font-semibold tracking-tight">
            <span className="text-white">1</span>
            <span className="text-rose-400">0</span>
            <span className="text-emerald-400">0</span>
            <span className="text-white ml-1.5">Transcripts</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Agent Portal</p>
        </div>

        {agent && (
          <div className="mx-3 mt-3 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
            <span className="w-9 h-9 rounded-full bg-blue-600 grid place-items-center text-[13px] font-semibold text-white shrink-0">
              {initials(agent.name)}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-white truncate">{agent.name}</p>
              <p className="text-[11px] text-slate-400 truncate">
                {agent.employee_id}{agent.location ? ` · ${agent.location}` : ""}
              </p>
            </div>
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-0.5">{nav}</nav>

        <div className="p-3 border-t border-white/5">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-slate-900/50 z-40 md:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
          <button onClick={() => setOpen((p) => !p)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100">
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
          <span className="text-[14px] font-semibold text-slate-800">{agent?.name || "Agent"}</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AgentLayout() {
  return (
    <AgentDataProvider>
      <Shell />
    </AgentDataProvider>
  );
}
