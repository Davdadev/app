/* ─── State ─────────────────────────────────── */
let allApplications = [];
let activeStatus    = "all";
let searchQuery     = "";

/* ─── Fetch & Render ────────────────────────── */
async function fetchApplications() {
  try {
    const res  = await fetch("/api/applications");
    allApplications = await res.json();
    render();
    updateStats();
  } catch {
    document.getElementById("applicant-list").innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <p>Could not load applications. Make sure the server is running.</p>
      </div>`;
  }
}

function applyFilters() {
  let list = allApplications;

  if (activeStatus !== "all") {
    list = list.filter(a => a.status === activeStatus);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(a =>
      a.fullName.toLowerCase().includes(q) ||
      a.whatsappNumber.includes(q) ||
      a.whyAdmin.toLowerCase().includes(q)
    );
  }

  return list;
}

function updateStats() {
  const counts = { total: allApplications.length, pending: 0, accepted: 0, rejected: 0 };
  allApplications.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++; });
  document.getElementById("stat-total").textContent    = counts.total;
  document.getElementById("stat-pending").textContent  = counts.pending;
  document.getElementById("stat-accepted").textContent = counts.accepted;
  document.getElementById("stat-rejected").textContent = counts.rejected;
}

function initials(name) {
  return name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
}

function commitmentDots(n) {
  return Array.from({ length: 10 }, (_, i) =>
    `<span class="commitment-dot${i < n ? " filled" : ""}"></span>`
  ).join("");
}

function formatDate(iso) {
  try { return new Date(iso).toLocaleDateString(undefined, { year:"numeric", month:"short", day:"numeric" }); }
  catch { return iso; }
}

function render() {
  const list = applyFilters();
  const container = document.getElementById("applicant-list");

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <p>No applications found.</p>
      </div>`;
    return;
  }

  container.innerHTML = list.map(a => {
    const skills = Array.isArray(a.skills) && a.skills.length ? a.skills.join(", ") : "—";
    return `
    <div class="applicant-card ${a.status}" data-id="${a.id}">
      <div class="applicant-header">
        <div class="applicant-avatar">${initials(a.fullName)}</div>
        <div class="applicant-meta">
          <div class="applicant-name">${escHtml(a.fullName)}</div>
          <div class="applicant-sub">📱 ${escHtml(a.whatsappNumber)} · 📅 ${formatDate(a.submittedAt)}</div>
        </div>
        <span class="badge badge-${a.status}">${a.status}</span>
      </div>

      <div class="applicant-details">
        <span><strong>Age:</strong> ${escHtml(a.ageRange)}</span>
        <span><strong>Experience:</strong> ${escHtml(a.experience)}</span>
        <span><strong>Availability:</strong> ${escHtml(a.availability || "—")}</span>
        <span><strong>Time Zone:</strong> ${escHtml(a.timezone || "—")}</span>
        <span><strong>Skills:</strong> ${escHtml(skills)}</span>
        <span>
          <strong>Commitment:</strong>
          <span class="commitment-bar">
            <span class="commitment-dots">${commitmentDots(a.commitment)}</span>
            ${a.commitment}/10
          </span>
        </span>
      </div>

      <div class="applicant-why">"${escHtml(a.whyAdmin)}"</div>

      <div class="applicant-actions">
        ${a.status !== "accepted" ? `<button class="btn btn-success btn-sm action-btn" data-id="${escHtml(a.id)}" data-status="accepted">✓ Accept</button>` : ""}
        ${a.status !== "rejected" ? `<button class="btn btn-danger  btn-sm action-btn" data-id="${escHtml(a.id)}" data-status="rejected">✗ Reject</button>` : ""}
        ${a.status !== "pending"  ? `<button class="btn btn-ghost   btn-sm action-btn" data-id="${escHtml(a.id)}" data-status="pending">↩ Reset to Pending</button>` : ""}
      </div>
    </div>`;
  }).join("");
}

/* ─── Escape HTML ───────────────────────────── */
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ─── Status update ─────────────────────────── */
async function updateStatus(id, status) {
  try {
    const res = await fetch(`/api/applications/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Failed to update");
    const updated = await res.json();
    const idx = allApplications.findIndex(a => a.id === id);
    if (idx !== -1) allApplications[idx] = updated;
    render();
    updateStats();
  } catch (err) {
    console.error("updateStatus error:", err);
    alert("Could not update status. Please try again.");
  }
}

/* ─── Search ────────────────────────────────── */
document.getElementById("search-input").addEventListener("input", e => {
  searchQuery = e.target.value.trim();
  render();
});

/* ─── Filter Tabs ───────────────────────────── */
document.querySelectorAll(".filter-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeStatus = btn.dataset.status;
    render();
  });
});

/* ─── Action button delegation ──────────────── */
document.getElementById("applicant-list").addEventListener("click", e => {
  const btn = e.target.closest(".action-btn");
  if (!btn) return;
  const { id, status } = btn.dataset;
  if (id && status) updateStatus(id, status);
});

/* ─── Boot ──────────────────────────────────── */
fetchApplications();
