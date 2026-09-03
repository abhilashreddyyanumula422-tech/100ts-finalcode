import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { API_BASE_URL } from "../../services/api";
import useAgentWebSocket from "../hooks/useAgentWebSocket";
import { MessageSquare, Paperclip, Send, ArrowLeft, User, FileText, Check, Search, ChevronRight, Bell, CheckCheck } from "lucide-react";

export default function AgentAdminMessages() {
  const { appId } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [appDetails, setAppDetails] = useState(null);
  const [agentDetails, setAgentDetails] = useState(null);

  const [newMessage, setNewMessage] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // State for the assignment list (when appId is missing)
  const [assignments, setAssignments] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef(null);

const token = localStorage.getItem("agent_token");

const agentData = JSON.parse(
  localStorage.getItem("agent") || "{}"
);

const agentId = agentData.id;

console.log("Agent ID:", agentId);
console.log("Agent Token exists:", !!token);
const handleWebSocketMessage = (message) => {
  console.log("WebSocket message received:", message);

  if (message.type === "message") {
    setMessages((prev) => [...prev, message.message]);   // ✅ push the inner chat object
  }
};

const { sendMessage } = useAgentWebSocket(
    agentId,
    appId,
    handleWebSocketMessage
);

  useEffect(() => {
    if (agentId && token) {
      fetchUnreadCount();
      const intervalId = setInterval(() => {
        fetchUnreadCount();
      }, 5000);
      return () => clearInterval(intervalId);
    }
  }, [agentId, token]);

  useEffect(() => {
    if (agentId && token) {
      fetchAssignments();
    }
  }, [agentId, token]);

  useEffect(() => {
    if (appId && agentId && token) {
      fetchMessages();
      const intervalId = setInterval(() => {
        fetchMessages(true);
      }, 5000);
      return () => clearInterval(intervalId);
    }
  }, [appId, agentId, token]);

  useEffect(() => {
    if (appId && !loading) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, appId, loading]);

  const fetchAssignments = async () => {
    setListLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/agent/${agentId}/dashboard/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.active_requests || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setListLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/agent/${agentId}/admin-messages/unread-count/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unread_count || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMessages = async (isPoll = false) => {
    if (!isPoll) setLoading(true);
    if (!isPoll) setError("");
    try {
      const endpoint = `${API_BASE_URL}/api/agent/${agentId}/admin-messages/${appId}/`;
        
      const res = await fetch(endpoint, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const incoming = data.messages || [];
        setMessages((prev) => {
          if (!isPoll) return incoming; // initial load: trust server fully
          const byId = new Map(incoming.map((m) => [m.id, m]));
          const merged = [...incoming];
          for (const m of prev) {
            if (m.id && !byId.has(m.id)) merged.push(m);
          }
          merged.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          return merged;
        });
        setAppDetails(data.application_details);
        setAgentDetails(data.agent_details);
      } else {
        if (!isPoll) {
          const errData = await res.json();
          setError(errData.error || "Failed to load chat.");
        }
      }
    } catch (err) {
      console.error(err);
      if (!isPoll) setError("Network error while loading chat.");
    } finally {
      if (!isPoll) setLoading(false);
    }
  };

const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() && !attachment) return;

    // WebSocket currently handles text messages.
    // Attachment handling will be done separately.
    if (attachment) {
        alert("Attachments will be handled separately.");
        return;
    }

    setSending(true);

    try {
        const success = sendMessage(
            newMessage.trim(),
            appId === "general" ? null : appId,
            false
        );

        if (success) {
            setNewMessage("");
        } else {
            alert("WebSocket is not connected.");
        }
    } catch (err) {
        console.error(err);
        alert("Error sending message.");
    } finally {
        setSending(false);
    }
};

  // -------------------------------------------------------------
  // RENDER: COMBINED SPLIT-SCREEN LAYOUT
  // -------------------------------------------------------------
  const filtered = assignments.filter(a => {
    const q = search.toLowerCase();
    return (
      (a.application_display_id || "").toLowerCase().includes(q) ||
      (a.student || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* LEFT SIDEBAR: AGENT LIST */}
      <div className={`w-full md:w-1/3 lg:w-[380px] bg-white border-r border-slate-200 flex flex-col h-full z-10 flex-shrink-0 ${appId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-5 border-b border-slate-100 flex-shrink-0">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Admin Support</h1>
          <p className="text-sm text-slate-500 mb-4">Select an active request to view or send messages</p>
          
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-[#108a55] transition"
              placeholder="Search by Request ID or Student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {listLoading ? (
            <div className="p-8 text-center text-sm text-slate-400">Loading requests...</div>
          ) : (
            <>


              {filtered.length === 0 ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                  <MessageSquare size={32} className="opacity-20 mb-2" />
                  No active requests found.
                </div>
              ) : (
                filtered.map(a => {
                  const isActive = appId === a.application_id?.toString();
                  return (
                    <div
                      key={a.id}
                      onClick={() => navigate(`/agent/support/${a.application_id}`)}
                      className={`p-4 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between group ${isActive ? 'bg-[#108a55]/5 border-l-4 border-[#108a55]' : 'border-l-4 border-transparent'}`}
                    >
                      <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-[#108a55] text-white' : 'bg-[#108a55]/10 text-[#108a55]'}`}>
                          <MessageSquare size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-bold text-slate-800">{a.application_display_id}</h4>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                              {a.status?.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">
                            <span className="font-medium text-slate-700">{a.student}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-slate-300 group-hover:text-[#108a55] transition pr-4">
                        <ChevronRight size={20} />
                      </div>
                    </div>
                  )
                })
              )}
            </>
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR: CHAT WINDOW */}
      <div className={`flex-1 flex flex-col h-full bg-slate-50/50 ${!appId ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
        {!appId ? (
          <div className="text-center text-slate-400 flex flex-col items-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-4">
              <MessageSquare size={32} className="text-slate-300" />
            </div>
            <p className="font-medium text-slate-500">Select an active request to view or send messages</p>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">Loading chat details...</div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-red-500 mb-4">{error}</div>
            <button onClick={() => navigate('/agent/support')} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300">
              Back to List
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full bg-white relative">
            
            {/* Top Header - Dark Green */}
            <div className="bg-[#0e774a] text-white px-5 py-4 flex items-center justify-between z-10 flex-shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                <button onClick={() => navigate('/agent/support')} className="text-white/80 hover:text-white mr-1 md:hidden">
                  <ArrowLeft size={20} />
                </button>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                  <User size={16} className="text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-[16px] leading-none">{agentDetails?.name || agentData.name || 'Agent'}</h2>
                  <div className="flex items-center gap-1.5 bg-black/10 px-2 py-0.5 rounded-full mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                    <span className="text-[10px] font-medium opacity-90">Online</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <Bell size={20} className="text-white/90" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-[#0e774a]">
                    {unreadCount}
                  </span>
                )}
              </div>
            </div>

            {/* Inner Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              <div className="p-4 flex-shrink-0">
                {/* Application Details Block */}
                {appId !== "general" && (
                <div className="border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 mb-1">Application Details</div>
                    <div className="font-bold text-[#5c3cff] text-[15px] mb-1.5">{appDetails?.id}</div>
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-medium text-slate-600">{appDetails?.university || 'University'}</span>
                      <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {appDetails?.status?.replace(/_/g, ' ') || 'In Progress'}
                      </span>
                    </div>
                  </div>
                  <button className="flex items-center justify-center gap-2 text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 px-4 py-2 rounded-lg text-[13px] font-semibold transition">
                    <FileText size={14} /> View Application
                  </button>
                </div>
                )}
                {appId === "general" && (
                <div className="border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 mb-1">Support Category</div>
                    <div className="font-bold text-[#5c3cff] text-[15px] mb-1.5">General Queries</div>
                  </div>
                </div>
                )}
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto px-4 custom-scrollbar pb-4">
                <div className="flex justify-center my-3">
                  <span className="bg-slate-100 text-slate-500 text-[10px] font-semibold px-3 py-1 rounded-full">Today</span>
                </div>

                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 min-h-[200px]">
                    <MessageSquare size={40} className="opacity-20" />
                    <p className="text-sm">No messages yet.</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isAdmin = msg.is_from_admin;
                    return (
                      <div key={idx} className={`flex w-full mb-5 ${!isAdmin ? "justify-end" : "justify-start"}`}>
                        <div className={`flex gap-3 max-w-[85%] sm:max-w-[75%] ${!isAdmin ? "flex-row-reverse" : "flex-row"}`}>
                          
                          {/* Avatar */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-auto shadow-sm ${
                            isAdmin ? 'bg-[#5c3cff] text-white' : 'bg-[#108a55] text-white'
                          }`}>
                            {isAdmin ? 'A' : <User size={14} />}
                          </div>

                          {/* Bubble */}
                          <div className="flex flex-col">
                            <div className={`px-4 py-3 text-[13px] leading-relaxed relative ${
                                isAdmin
                                  ? "bg-[#f4f2ff] text-slate-800 rounded-2xl rounded-bl-sm"
                                  : "bg-[#e8f6ef] text-slate-800 rounded-2xl rounded-br-sm"
                              }`}>
                              {msg.message && <div className="whitespace-pre-wrap">{msg.message}</div>}
                              {msg.attachment && (
                                <div className="mt-2">
                                  {msg.attachment.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                    <img src={`${API_BASE_URL}${msg.attachment}`} alt="Attachment" className="max-w-[200px] sm:max-w-[250px] object-cover rounded-xl shadow-sm border border-black/5" />
                                  ) : (
                                    <a href={`${API_BASE_URL}${msg.attachment}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-semibold bg-white/60 py-2 px-3 rounded-lg hover:bg-white transition border border-black/5 shadow-sm inline-flex">
                                      <Paperclip size={14} /> View Attached File
                                    </a>
                                  )}
                                </div>
                              )}

                              {/* Time & Read Receipts */}
                              <div className={`text-[9px] font-medium mt-1.5 flex items-center gap-1 opacity-60 ${!isAdmin ? "justify-end" : "justify-end"}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {!isAdmin && (
                                  <CheckCheck size={12} className={msg.is_read ? 'text-[#108a55]' : 'text-slate-400'} />
                                )}
                                {isAdmin && (
                                  <CheckCheck size={12} className={'text-[#5c3cff]'} />
                                )}
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Message Input Box */}
            <div className="bg-white border-t border-slate-100 p-4 flex-shrink-0">
              <div className="flex items-center gap-3 border border-slate-200 rounded-xl p-1.5 pl-3 focus-within:border-[#108a55] focus-within:ring-1 focus-within:ring-[#108a55] transition">
                <div className="flex-shrink-0">
                  {attachment ? (
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg max-w-[150px]">
                      <Paperclip size={14} className="flex-shrink-0" />
                      <span className="truncate">{attachment.name}</span>
                      <button type="button" onClick={() => setAttachment(null)} className="text-slate-400 hover:text-red-500 ml-1 flex-shrink-0">
                        &times;
                      </button>
                    </div>
                  ) : (
                    <label className="text-slate-400 hover:text-slate-600 cursor-pointer transition flex items-center justify-center">
                      <Paperclip size={18} strokeWidth={2.5} />
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => setAttachment(e.target.files[0])}
                      />
                    </label>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Type your message..."
                  className="flex-1 bg-transparent border-none px-2 py-2 text-[13px] text-slate-800 focus:outline-none placeholder-slate-400"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={sending}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />

                <button
                  onClick={handleSendMessage}
                  disabled={sending || (!newMessage.trim() && !attachment)}
                  className="bg-[#108a55] text-white px-5 py-2.5 rounded-lg font-semibold text-[13px] flex items-center gap-1.5 hover:bg-[#0e774a] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex-shrink-0"
                >
                  <Send size={14} /> Send
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
