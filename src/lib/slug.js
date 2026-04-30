export function slugFromUrl(url) {
  try {
    const u = new URL(url);
    const raw = (u.hostname + u.pathname)
      .replace(/\/+/g, "/")
      .replace(/\/$/, "");
    return slugify(raw || u.hostname);
  } catch {
    return slugify(String(url || "run"));
  }
}

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "run";
}