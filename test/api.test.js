const { test, before, after, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const supertest = require("supertest");

// Use a temporary data file so tests don't touch the real submissions.json
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "app-test-"));
const tmpFile = path.join(tmpDir, "submissions.json");
process.env.DATA_FILE_OVERRIDE = tmpFile;

const app = require("../server");
const request = supertest(app);

const validPayload = {
  fullName: "Jane Doe",
  whatsappNumber: "+1 555 123 4567",
  ageRange: "25–34",
  experience: "Some",
  skills: ["Moderation"],
  availability: "2–5 hours",
  timezone: "GMT+2",
  whyAdmin: "I love this community and want to help it grow.",
  commitment: 8,
  agreedToGuidelines: true,
};

before(() => {
  // Ensure the temp data file starts empty
  fs.writeFileSync(tmpFile, JSON.stringify([]), "utf8");
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("POST /api/apply", () => {
  test("accepts a valid application and returns 201", async () => {
    const res = await request.post("/api/apply").send(validPayload);
    assert.equal(res.status, 201);
    assert.equal(res.body.message, "Application submitted successfully");
  });

  test("rejects a submission missing a required field", async () => {
    const { fullName: _omitted, ...noName } = validPayload;
    const res = await request.post("/api/apply").send(noName);
    assert.equal(res.status, 400);
    assert.match(res.body.error, /fullName/);
  });

  test("rejects a submission where agreedToGuidelines is false", async () => {
    const res = await request
      .post("/api/apply")
      .send({ ...validPayload, agreedToGuidelines: false });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /guidelines/i);
  });
});

describe("GET /api/applications", () => {
  test("returns an array of applications", async () => {
    const res = await request.get("/api/applications");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 1);
  });

  test("filters by status=pending", async () => {
    const res = await request.get("/api/applications?status=pending");
    assert.equal(res.status, 200);
    assert.ok(res.body.every((a) => a.status === "pending"));
  });

  test("filters by search query", async () => {
    const res = await request.get("/api/applications?search=jane");
    assert.equal(res.status, 200);
    assert.ok(
      res.body.every(
        (a) =>
          a.fullName.toLowerCase().includes("jane") ||
          a.whatsappNumber.includes("jane") ||
          a.whyAdmin.toLowerCase().includes("jane")
      )
    );
    assert.ok(res.body.length >= 1);
  });
});

describe("PATCH /api/applications/:id", () => {
  let applicationId;

  before(async () => {
    const res = await request.get("/api/applications");
    applicationId = res.body[0]?.id;
    assert.ok(applicationId, "Expected at least one application to exist");
  });

  test("accepts a valid status update", async () => {
    const res = await request
      .patch(`/api/applications/${applicationId}`)
      .send({ status: "accepted" });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "accepted");
  });

  test("rejects an invalid status value", async () => {
    const res = await request
      .patch(`/api/applications/${applicationId}`)
      .send({ status: "unknown" });
    assert.equal(res.status, 400);
  });

  test("returns 404 for a non-existent id", async () => {
    const res = await request
      .patch("/api/applications/nonexistent-id")
      .send({ status: "accepted" });
    assert.equal(res.status, 404);
  });
});
