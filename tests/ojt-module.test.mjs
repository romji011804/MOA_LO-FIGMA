import test from "node:test";
import assert from "node:assert/strict";

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    this.map.set(key, String(value));
  }
  removeItem(key) {
    this.map.delete(key);
  }
  clear() {
    this.map.clear();
  }
}

const localStorage = new MemoryStorage();
globalThis.localStorage = localStorage;
globalThis.window = {
  localStorage,
  electronAPI: undefined,
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
};

const { filterOjtRecords, getOjtStats, loadOjtRecords, saveOjtRecords } = await import(
  "../src/modules/ojt/storage.ts"
);

test("OJT records persist independently from MOA/LO records", () => {
  localStorage.clear();
  const records = loadOjtRecords();
  assert.ok(records.length >= 2);

  saveOjtRecords([
    {
      id: "ojt-x",
      date: "2026-04-01",
      createdAt: "2026-04-01T00:00:00.000Z",
      studentName: "Test Student",
      company: "HRMDO",
      school: "PSU Lingayen",
      status: "missing",
    },
  ]);

  const saved = loadOjtRecords();
  assert.equal(saved.length, 1);
  assert.equal(saved[0].studentName, "Test Student");
});

test("OJT search filters by student, company, school, and status", () => {
  const records = [
    {
      id: "1",
      date: "2026-04-01",
      createdAt: "2026-04-01T00:00:00.000Z",
      studentName: "Amber Infante",
      company: "ENRO",
      school: "PNHS",
      status: "complete",
    },
    {
      id: "2",
      date: "2026-04-01",
      createdAt: "2026-04-01T00:00:00.000Z",
      studentName: "Judyl Caramat",
      company: "HRMDO",
      school: "PSU Lingayen",
      status: "missing",
    },
  ];

  const results = filterOjtRecords(records, "HRMDO");
  assert.equal(results.length, 1);
  assert.equal(results[0].studentName, "Judyl Caramat");
});

test("OJT stats separate complete and missing certificate counts", () => {
  const stats = getOjtStats([
    {
      id: "1",
      date: "2026-04-01",
      createdAt: "2026-04-01T00:00:00.000Z",
      studentName: "A",
      company: "A",
      school: "A",
      status: "complete",
    },
    {
      id: "2",
      date: "2026-04-01",
      createdAt: "2026-04-01T00:00:00.000Z",
      studentName: "B",
      company: "B",
      school: "B",
      status: "missing",
    },
  ]);

  assert.deepEqual(stats, {
    totalCertificates: 2,
    completeCertificates: 1,
    missingCertificates: 1,
  });
});
