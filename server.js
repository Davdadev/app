const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data", "submissions.json");

// Ensure data directory and file exist
if (!fs.existsSync(path.join(__dirname, "data"))) {
  fs.mkdirSync(path.join(__dirname, "data"));
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]), "utf8");
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Helper: read submissions
function readSubmissions() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (err) {
    console.error("Error reading submissions file:", err);
    return [];
  }
}

// Helper: write submissions
function writeSubmissions(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

// POST /api/apply — save a new application
app.post("/api/apply", (req, res) => {
  const body = req.body;
  const required = ["fullName", "whatsappNumber", "ageRange", "experience", "whyAdmin"];
  for (const field of required) {
    if (!body[field] || String(body[field]).trim() === "") {
      return res.status(400).json({ error: `Missing required field: ${field}` });
    }
  }
  if (!body.agreedToGuidelines) {
    return res.status(400).json({ error: "Must agree to community guidelines" });
  }

  const submissions = readSubmissions();
  const entry = {
    id: Date.now().toString(),
    submittedAt: new Date().toISOString(),
    status: "pending",
    fullName: String(body.fullName).trim(),
    whatsappNumber: String(body.whatsappNumber).trim(),
    ageRange: String(body.ageRange).trim(),
    experience: String(body.experience).trim(),
    skills: Array.isArray(body.skills) ? body.skills : [],
    availability: String(body.availability || "").trim(),
    timezone: String(body.timezone || "").trim(),
    whyAdmin: String(body.whyAdmin).trim(),
    commitment: Number(body.commitment) || 5,
    agreedToGuidelines: Boolean(body.agreedToGuidelines),
  };

  submissions.push(entry);
  writeSubmissions(submissions);
  res.status(201).json({ message: "Application submitted successfully" });
});

// GET /api/applications — list all applications (admin)
app.get("/api/applications", (req, res) => {
  const submissions = readSubmissions();
  const { search, status } = req.query;
  let filtered = submissions;

  if (status && status !== "all") {
    filtered = filtered.filter((s) => s.status === status);
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.whatsappNumber.includes(q) ||
        s.whyAdmin.toLowerCase().includes(q)
    );
  }

  res.json(filtered);
});

// PATCH /api/applications/:id — update status (accept/reject)
app.patch("/api/applications/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!["pending", "accepted", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const submissions = readSubmissions();
  const idx = submissions.findIndex((s) => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Application not found" });
  }
  submissions[idx].status = status;
  writeSubmissions(submissions);
  res.json(submissions[idx]);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
