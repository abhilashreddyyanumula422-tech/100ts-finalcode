import React from "react";
import { User, Phone, Mail, FileText, Calendar, Info, Paperclip, MessageCircle } from "lucide-react";
import { Section, Field, ActionButton } from "../ui";
import { whatsappUrl, mailtoUrl, telUrl, greetingFor, displayId, longDate } from "../../utils/format";
import { API_BASE_URL } from "../../../services/api";

export default function StudentPanel({ assignment: a }) {
  const ref = displayId(a);
  
  const getDocUrl = (url) => {
    if (!url) return "#";
    if (url.startsWith("http")) return url;
    return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  return (
    <Section title="Student" icon={<User size={15} />} padded>
      <div className="flex gap-2 flex-wrap mb-5">
        <ActionButton href={whatsappUrl(a.phone, greetingFor(a.applicant_name, ref))}
                      variant="success" size="sm" icon={<MessageCircle size={13} />}>
          WhatsApp
        </ActionButton>
        <ActionButton as="a" href={mailtoUrl(a.email, `100Transcripts — Request ${ref}`)}
                      size="sm" icon={<Mail size={13} />}>
          Email
        </ActionButton>
        <ActionButton as="a" href={telUrl(a.phone)} size="sm" icon={<Phone size={13} />}>
          Call
        </ActionButton>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Full name" value={a.applicant_name} icon={<User size={14} />} />
        <Field label="Phone" value={a.phone} icon={<Phone size={14} />} />
        <Field label="Email" value={a.email} icon={<Mail size={14} />} />
        <Field label="Certificate" icon={<FileText size={14} />}>
          <span className="capitalize">{a.requirement || "—"}</span>
        </Field>
        {a.expected_completion_date && (
          <Field label="Expected completion" icon={<Calendar size={14} />}
                 value={longDate(a.expected_completion_date)} />
        )}
        {a.payment_status && <Field label="Payment" value={a.payment_status} icon={<FileText size={14} />} />}
      </div>

      {a.admin_message && (
        <div className="mt-4 flex gap-2.5 rounded-lg bg-amber-50 ring-1 ring-inset ring-amber-200 px-3.5 py-3">
          <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-amber-800">Admin instructions</p>
            <p className="text-[13px] text-amber-900 mt-0.5">{a.admin_message}</p>
          </div>
        </div>
      )}

      {a.documents?.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-2">
            <Paperclip size={12} /> Uploaded documents
          </p>
          <div className="flex flex-wrap gap-2">
            {a.documents.map((doc, i) => (
              <a key={doc.id || i} href={getDocUrl(doc.url)} target="_blank" rel="noopener noreferrer"
                 className="text-[12px] font-medium text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-200 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition truncate max-w-[250px] inline-block"
                 title={doc.name || "Document"}>
                {doc.name || "Document"}
              </a>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}
