import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { API_BASE_URL } from "../../services/api";
import { MessageSquare, Paperclip, Send, ArrowLeft, User, FileText, Check, Search, ChevronRight } from "lucide-react";

export default function AdminAgentMessages() {
  const { appId } = useParams();
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [messages, setMessages] = useState([]);
  const [appDetails, setAppDetails] = useState(null);
  const [agentDetails, setAgentDetails] = useState(null);
  
  const [newMessage, setNewMessage] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);

  // Poll assignments list and chat (if selected)
  useEffect(() => {
    fetchAssignments();
    if (appId) {
      fetchMessages();
    }
    const intervalId = setInterval(() => {
      fetchAssignments(true);
      if (appId) {
        fetchMessages(true);
      }
    }, 5000);
    return () => clearInterval(intervalId);
  }, [appId]);

  useEffect(() => {
    if (appId && !chatLoading) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, appId, chatLoading]);

  const fetchAssignments = async (isPoll = false) => {
    if (!isPoll && assignments.length === 0) setListLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/agent-support/all-conversations/`, {
        headers: { "Authorization": `Token ${JSON.parse(localStorage.getItem("user"))?.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAssignments(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!isPoll || assignments.length === 0) setListLoading(false);
    }
  };

  const fetchMessages = async (isPoll = false) => {
    if (!isPoll) setChatLoading(true);
    if (!isPoll) setError("");
    try {
      let endpoint = `${API_BASE_URL}/api/admin/applications/${appId}/messages/`;
      if (appId.startsWith("general-")) {
        const agentId = appId.split("-")[1];
        endpoint = `${API_BASE_URL}/api/admin/agent-support/general/${agentId}/`;
      }

      const res = await fetch(endpoint, {
        headers: { "Authorization": `Token ${JSON.parse(localStorage.getItem("user"))?.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
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
      if (!isPoll) setChatLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !attachment) return;
    setSending(true);

    try {
      const formData = new FormData();
      if (newMessage.trim()) formData.append("message", newMessage);
      if (attachment) formData.append("attachment", attachment);

      let endpoint = `${API_BASE_URL}/api/admin/applications/${appId}/messages/`;
      if (appId.startsWith("general-")) {
        const agentId = appId.split("-")[1];
        endpoint = `${API_BASE_URL}/api/admin/agent-support/general/${agentId}/`;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Authorization": `Token ${JSON.parse(localStorage.getItem("user"))?.token}` },
        body: formData,
      });

      if (res.ok) {
        const newMsg = await res.json();
        setMessages([...messages, newMsg]);
        setNewMessage("");
        setAttachment(null);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.error || res.statusText}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error sending message.");
    } finally {
      setSending(false);
    }
  };

  const filteredAssignments = assignments.filter(a => {
    if (!a.agent) return false;
    const q = search.toLowerCase();
    return (
      (a.application_display_id || "").toLowerCase().includes(q) ||
      (a.applicant_name || "").toLowerCase().includes(q) ||
      (a.agent?.name || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* LEFT SIDEBAR: AGENT LIST */}
      <div className="w-full md:w-1/3 lg:w-[380px] bg-white border-r border-slate-200 flex flex-col h-full z-10 flex-shrink-0">
        <div className="p-5 border-b border-slate-100 flex-shrink-0">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Support Chat</h1>
          <p className="text-sm text-slate-500 mb-4">Agent Communications</p>
          
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-indigo-500 transition"
              placeholder="Search ID, Student, or Agent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {listLoading ? (
            <div className="p-8 text-center text-sm text-slate-400">Loading agents...</div>
          ) : filteredAssignments.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400 flex flex-col items-center">
              <MessageSquare size={32} className="opacity-20 mb-2" />
              No active conversations found.
            </div>
          ) : (
            filteredAssignments.map(a => {
              const targetPathId = a.type === 'general' ? 'general-' + a.agent?.id : a.application_id;
              const isActive = appId === targetPathId?.toString();
              const unreadCount = a.unread_count_admin || 0;
              return (
                <div
                  key={a.id}
                  onClick={() => navigate(`/admin/agent-support/${targetPathId}`)}
                  className={`p-4 cursor-pointer transition flex items-start gap-3 hover:bg-slate-50 ${isActive ? 'bg-indigo-50/50 hover:bg-indigo-50/80 border-l-4 border-indigo-600' : 'border-l-4 border-transparent'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {a.agent?.name?.charAt(0) || 'A'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <h4 className={`font-bold text-[14px] truncate pr-2 ${isActive ? 'text-indigo-900' : 'text-slate-800'}`}>
                        {a.agent?.name}
                      </h4>
                      {unreadCount > 0 && (
                        <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                          {unreadCount} New
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-slate-500 flex items-center gap-1.5">
                      <span className="font-semibold">{a.application_display_id}</span>
                      <span>•</span>
                      <span className="truncate">{a.applicant_name}</span>
                    </div>
                  </div>
                </div>
              );
            })
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
            <p className="font-medium text-slate-500">Select an agent conversation to view messages</p>
          </div>
        ) : (
          <>
            {/* Chat Header Details */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0 shadow-sm z-10 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button onClick={() => navigate('/admin/agent-support')} className="md:hidden text-slate-500 hover:bg-slate-100 p-2 rounded-lg">
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h2 className="font-bold text-slate-900 text-[16px] flex items-center gap-2">
                    {agentDetails?.name} 
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold">AGENT</span>
                  </h2>
                  {!appId.startsWith('general-') && (
                    <div className="text-[12px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{appDetails?.id}</span>
                      <span>•</span>
                      <span>{appDetails?.customer_name}</span>
                      <span>•</span>
                      <span className="text-indigo-600 font-medium">{appDetails?.status?.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                  {appId.startsWith('general-') && (
                    <div className="text-[12px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="text-indigo-600 font-medium">General Support Chat</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {chatLoading ? (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">Loading conversation...</div>
              ) : error ? (
                <div className="text-red-500 text-center p-4 bg-red-50 rounded-lg">{error}</div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <MessageSquare size={40} className="opacity-20 mb-3" />
                  <p className="text-sm">No messages yet.</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isAdmin = msg.is_from_admin;
                  return (
                    <div key={idx} className={`flex w-full ${isAdmin ? "justify-end" : "justify-start"}`}>
                      <div className="flex gap-3 max-w-[85%] lg:max-w-[70%]">
                        
                        {/* Avatar Agent (Left) */}
                        {!isAdmin && (
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-4 shadow-sm">
                            {agentDetails?.name?.charAt(0) || 'A'}
                          </div>
                        )}

                        <div className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}>
                          <div className={`text-[11px] font-bold mb-1 ${isAdmin ? "text-indigo-600" : "text-slate-500"}`}>
                            {isAdmin ? "You" : agentDetails?.name}
                          </div>

                          <div className="flex flex-col gap-1 relative">
                            <div className={`px-4 py-3 text-[14px] leading-relaxed shadow-sm relative ${
                              isAdmin
                                ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm"
                                : "bg-white text-slate-800 rounded-2xl rounded-tl-sm border border-slate-100"
                              }`}>
                              {msg.message && <div className="whitespace-pre-wrap">{msg.message}</div>}
                              {msg.attachment && (
                                <div className="mt-2">
                                  {msg.attachment.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                    <img src={`${API_BASE_URL}${msg.attachment}`} alt="Attachment" className="max-w-[250px] sm:max-w-[300px] object-cover rounded-lg shadow-sm border border-black/5" />
                                  ) : (
                                    <a href={`${API_BASE_URL}${msg.attachment}`} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 text-xs font-semibold py-2 px-3 rounded-lg transition border shadow-sm inline-flex ${isAdmin ? 'bg-indigo-700 border-indigo-500 hover:bg-indigo-800 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}`}>
                                      <Paperclip size={14} /> View Attached File
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <div className={`text-[10px] font-medium text-slate-400 mt-0.5 flex items-center gap-1 ${isAdmin ? "justify-end" : "justify-start"}`}>
                              {new Date(msg.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short' })}, {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {isAdmin && <Check size={12} className={msg.is_read ? 'text-blue-500' : 'text-slate-300'} />}
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

            {/* Message Input Box */}
            <div className="bg-white border-t border-slate-200 p-4 flex-shrink-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
              <div className="flex items-end gap-3 max-w-4xl mx-auto">
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition">
                  {attachment && (
                    <div className="flex items-center gap-2 mb-2 bg-indigo-50 text-indigo-700 text-xs px-3 py-1.5 rounded-lg w-fit">
                      <Paperclip size={14} />
                      <span className="truncate max-w-[200px] font-medium">{attachment.name}</span>
                      <button onClick={() => setAttachment(null)} className="hover:text-red-500 transition">
                        &times;
                      </button>
                    </div>
                  )}
                  <textarea
                    placeholder="Type your message to the agent..."
                    className="w-full bg-transparent border-none px-2 py-1 text-[14px] text-slate-800 focus:outline-none placeholder-slate-400 resize-none max-h-32 min-h-[44px]"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    disabled={sending}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                </div>
                
                <div className="flex flex-col gap-2 flex-shrink-0 pb-1">
                  <label className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center cursor-pointer transition shadow-sm border border-slate-200">
                    <Paperclip size={18} />
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => setAttachment(e.target.files[0])}
                    />
                  </label>
                  <button
                    onClick={handleSendMessage}
                    disabled={sending || (!newMessage.trim() && !attachment)}
                    className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={16} className="ml-1" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
