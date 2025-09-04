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

console.log("Columns:", cache.columns);

// Metadata
app.get("/api/metadata", (req, res) =>
    res.json({ columns: cache.columns, count: cache.rows.length, idField: ID_COLUMN })
);

// List — supports q, sortBy, sortDir, page, pageSize
app.get("/api/items", (req, res) => {
    try {
        let rows = Array.isArray(cache.rows) ? cache.rows.slice() : [];

        const {
            q = "",
            sortBy = "",
            sortDir = "asc",
            page = "1",
            pageSize = "20",
        } = req.query;

        // 1) Search
        if (q && String(q).trim() !== "") {
            const needle = String(q).toLowerCase();
            rows = rows.filter((r) =>
                Object.values(r).some((v) =>
                    String(v ?? "").toLowerCase().includes(needle)
                )
            );
        }

        // 2) Sorting (always normalize key casing)
        if (sortBy) {
            const sortKey = cache.columns.find(
                (c) => c.toLowerCase() === sortBy.toLowerCase()
            ) || sortBy;

            const dir = sortDir === "desc" ? -1 : 1;
            rows.sort((a, b) => {
                const avRaw = a[sortKey];
                const bvRaw = b[sortKey];

                const av = avRaw === null || avRaw === undefined ? "" : String(avRaw).trim();
                const bv = bvRaw === null || bvRaw === undefined ? "" : String(bvRaw).trim();

                const an = parseFloat(av.replace(/,/g, ""));
                const bn = parseFloat(bv.replace(/,/g, ""));

                if (!Number.isNaN(an) && !Number.isNaN(bn)) {
                    return (an - bn) * dir;
                }

                return av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" }) * dir;
            });
        }

        // 3) Pagination
        const p = Math.max(1, parseInt(page, 10) || 1);
        const ps = Math.max(1, parseInt(pageSize, 10) || 20);
        const start = (p - 1) * ps;
        const paged = rows.slice(start, start + ps);

        res.setHeader("X-Total-Count", String(rows.length));
        return res.json(paged);
    } catch (err) {
        console.error("items error", err);
        return res.status(500).json({ error: "Server error" });
    }
});

// Detail
app.get("/api/items/:id", (req, res) => {
    const item = cache.rows.find((r) => String(r._id) === String(req.params.id));
    item ? res.json(item) : res.status(404).json({ error: "Not found" });
});

// Reload
app.post("/api/reload", (req, res) => {
    try {
        reload();
        res.json({ ok: true });
    } catch (err) {
        console.error("reload error", err);
        res.status(500).json({ error: "reload failed" });
    }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend running on http://localhost:${port}`));
