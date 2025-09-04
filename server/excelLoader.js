const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

function loadExcel(excelPath, idColumn) {
    const full = path.resolve(excelPath);
    if (!fs.existsSync(full)) throw new Error(`Excel not found at ${full}`);

    const wb = xlsx.readFile(full);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    const columns = Object.keys(rows[0] || {});
    const result = rows.map((row, i) => {
        const id =
            idColumn && row[idColumn] ? String(row[idColumn]) : String(i + 1);
        return { _id: id, ...row };
    });

    return { rows: result, columns };
}

module.exports = { loadExcel };
