// server/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { loadExcel } = require("./excelLoader");

const app = express();
app.use(cors());
app.use(express.json());

const EXCEL_PATH = process.env.EXCEL_PATH;
const ID_COLUMN = process.env.ID_COLUMN || "ID";

let cache = { rows: [], columns: [] };
function reload() {
  cache = loadExcel(EXCEL_PATH, ID_COLUMN);
  console.log(`Loaded ${cache.rows.length} rows from Excel`);
}
reload();

console.log(cache.columns);
// Metadata
app.get("/api/metadata", (req, res) =>
  res.json({ columns: cache.columns, count: cache.rows.length })
);

// List
app.get("/api/items", (req, res) => res.json(cache.rows));

// Detail
app.get("/api/items/:id", (req, res) => {
  const item = cache.rows.find((r) => r._id === req.params.id);
  item ? res.json(item) : res.status(404).json({ error: "Not found" });
});

// Reload
app.post("/api/reload", (req, res) => {
  reload();
  res.json({ ok: true });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend running on http://localhost:${port}`));
