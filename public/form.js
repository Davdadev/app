/* ─── Progress bar ─────────────────────────── */
const TOTAL_FIELDS = 10; // questions that count toward progress

const progressBar   = document.getElementById("progress-bar");
const progressLabel = document.getElementById("progress-label");

function countFilled() {
  const f = document.getElementById("apply-form");
  let filled = 0;

  // Text / tel / select fields
  ["fullName","whatsappNumber","ageRange","experience","availability","timezone"].forEach(id => {
    const el = f.elements[id];
    if (el && String(el.value).trim() !== "") filled++;
  });

  // Textarea (whyAdmin)
  if (String(f.elements["whyAdmin"].value).trim() !== "") filled++;

  // At least one skill checked
  const skills = f.querySelectorAll('input[name="skills"]:checked');
  if (skills.length > 0) filled++;

  // Commitment — always has a value (default 5)
  filled++;

  // Agreed checkbox
  if (f.elements["agreedToGuidelines"].checked) filled++;

  return filled;
}

function updateProgress() {
  const filled = countFilled();
  const pct    = Math.round((filled / TOTAL_FIELDS) * 100);
  progressBar.style.width   = pct + "%";
  progressLabel.textContent = `Step ${filled} of ${TOTAL_FIELDS}`;
}

/* ─── Char counter ──────────────────────────── */
const whyAdmin   = document.getElementById("whyAdmin");
const whyCounter = document.getElementById("why-counter");

whyAdmin.addEventListener("input", () => {
  const len = whyAdmin.value.length;
  whyCounter.textContent = `${len} / 600`;
  whyCounter.className = "char-counter" +
    (len >= 600 ? " limit" : len >= 500 ? " near" : "");
  updateProgress();
});

/* ─── Commitment slider ─────────────────────── */
const commitInput = document.getElementById("commitment");
const commitVal   = document.getElementById("commitment-val");
commitInput.addEventListener("input", () => {
  commitVal.textContent = commitInput.value;
});

/* ─── Generic change listeners ──────────────── */
document.getElementById("apply-form").addEventListener("input",  updateProgress);
document.getElementById("apply-form").addEventListener("change", updateProgress);

/* ─── Validation ────────────────────────────── */
function showError(fieldId, show) {
  const el  = document.getElementById(fieldId);
  const msg = document.getElementById("err-" + fieldId);
  if (!el || !msg) return;
  el.classList.toggle("error", show);
  msg.classList.toggle("visible", show);
}

function validate() {
  let ok = true;
  const f = document.getElementById("apply-form");

  // Required text / select fields
  const required = ["fullName","whatsappNumber","ageRange","experience","whyAdmin"];
  required.forEach(id => {
    const empty = String(f.elements[id].value).trim() === "";
    showError(id, empty);
    if (empty) ok = false;
  });

  // WhatsApp number format check (must contain digits)
  const numVal = String(f.elements["whatsappNumber"].value).trim();
  if (numVal && !/^\+?[\d\s\-().]{6,25}$/.test(numVal)) {
    showError("whatsappNumber", true);
    ok = false;
  }

  // Guidelines agreement
  const agreed = f.elements["agreedToGuidelines"].checked;
  showError("agreedToGuidelines", !agreed);
  if (!agreed) ok = false;

  return ok;
}

/* ─── Form submission ───────────────────────── */
document.getElementById("apply-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validate()) return;

  const btn = document.getElementById("submit-btn");
  btn.disabled = true;
  btn.textContent = "Submitting…";

  const f = document.getElementById("apply-form");
  const skills = [...f.querySelectorAll('input[name="skills"]:checked')].map(c => c.value);

  const payload = {
    fullName:           f.elements["fullName"].value.trim(),
    whatsappNumber:     f.elements["whatsappNumber"].value.trim(),
    ageRange:           f.elements["ageRange"].value,
    experience:         f.elements["experience"].value,
    skills,
    availability:       f.elements["availability"].value,
    timezone:           f.elements["timezone"].value.trim(),
    whyAdmin:           f.elements["whyAdmin"].value.trim(),
    commitment:         Number(f.elements["commitment"].value),
    agreedToGuidelines: f.elements["agreedToGuidelines"].checked,
  };

  try {
    const res = await fetch("/api/apply", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || "Submission failed");
    }

    // Show thank-you
    document.getElementById("form-wrap").style.display = "none";
    document.getElementById("thank-you").style.display = "block";

  } catch (err) {
    console.error("Submission error:", err);
    btn.disabled = false;
    btn.textContent = "Submit Application ✓";
    alert("There was a problem submitting your application. Please try again.");
  }
});

/* ─── Init ──────────────────────────────────── */
updateProgress();
