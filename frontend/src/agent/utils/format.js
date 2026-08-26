/** Small formatting + linking helpers shared across the agent portal. */

const digits10 = (phone) => String(phone || "").replace(/\D/g, "").slice(-10);

export const mapsUrl = (place) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place || "")}`;

export const whatsappUrl = (phone, text) =>
  `https://wa.me/91${digits10(phone)}?text=${encodeURIComponent(text || "")}`;

export const mailtoUrl = (email, subject) =>
  `mailto:${email || ""}?subject=${encodeURIComponent(subject || "")}`;

export const telUrl = (phone) => `tel:${digits10(phone)}`;

export const greetingFor = (name, ref) =>
  `Hello ${name || "there"}, this is your 100Transcripts agent regarding request ${ref || ""}.`;

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const timeAgo = (iso) => {
  if (!iso) return "";
  const secs = (Date.now() - new Date(iso).getTime()) / 1000;
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 172800) return "yesterday";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

export const shortDate = (d, fallback = "—") => {
  if (!d) return fallback;
  if (d === todayISO()) return "Today";
  return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

export const longDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "—";

export const weekdayLong = () =>
  new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

export const initials = (name) =>
  (name || "A").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export const firstName = (name) => (name || "Agent").split(" ")[0];

export const displayId = (a) =>
  a?.application_display_id || (a?.application_id ? `#${a.application_id}` : "—");

/** Read the agent object the login flow stashed in localStorage. */
export const readAgent = () => {
  try { return JSON.parse(localStorage.getItem("agent") || "null"); }
  catch { return null; }
};
