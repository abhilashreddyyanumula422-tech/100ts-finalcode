import React, { useState } from "react";
import { Upload, CheckCircle2 } from "lucide-react";
import { ActionButton } from "../ui";
import { uploadCollectedDocument, updateAssignmentStatus } from "../../../services/api";

export default function DocumentUpload({ agentId, assignmentId, existingUrl, onUploaded }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [isUpdating, setIsUpdating] = useState(false);

  if (existingUrl && !isUpdating) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg bg-emerald-50 ring-1 ring-inset ring-emerald-200 px-3.5 py-3">
        <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
        <div className="flex-1">
          <p className="text-[12px] font-semibold text-emerald-800">Scanned copy uploaded</p>
          <a href={existingUrl} target="_blank" rel="noopener noreferrer"
             className="text-[12px] text-emerald-700 underline hover:text-emerald-900 transition-colors">
            View document
          </a>
        </div>
        <button 
          onClick={() => setIsUpdating(true)} 
          className="text-[11px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-md transition-colors"
        >
          Update
        </button>
      </div>
    );
  }

  const upload = async () => {
    if (!file) return;
    setBusy(true); setError("");
    try {
      const res = await uploadCollectedDocument(agentId, assignmentId, file);
      if (res.ok) { 
        const advanceRes = await updateAssignmentStatus(agentId, assignmentId, "SUBMITTED_TO_UNIVERSITY", "");
        if (!advanceRes.ok) {
           setError("Document uploaded, but failed to advance status.");
        }
        setFile(null); 
        onUploaded?.(); 
      }
      else setError(res.data?.error || "Upload failed.");
    } catch { setError("Network error during upload."); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-lg border border-dashed border-slate-250 border-slate-300 p-4 text-center">
      <Upload size={20} className="mx-auto text-slate-300 mb-2" />
      <p className="text-[12px] text-slate-500 mb-3">Upload the scanned copy of the collected document</p>
      <input type="file" id="collected-doc" className="hidden"
             accept="image/*,application/pdf"
             onChange={(e) => { setFile(e.target.files[0]); setError(""); }} />
      <label htmlFor="collected-doc"
             className="cursor-pointer inline-block text-[12px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition">
        {file ? file.name : "Choose file"}
      </label>
      {file && (
        <ActionButton variant="accent" full loading={busy} onClick={upload}
                      icon={<Upload size={14} />} className="mt-3">
          Upload document
        </ActionButton>
      )}
      {error && <p className="text-[12px] text-rose-600 mt-2">{error}</p>}
    </div>
  );
}
