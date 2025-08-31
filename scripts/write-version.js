// scripts/write-version.js
const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "..", "public");
const outFile = path.join(outDir, "version.json");

// Make a unique version like 2025-09-01.201530
const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const version =
  `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}.` +
  `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

const data = JSON.stringify({ version }, null, 2);

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, data);
console.log("Wrote", outFile, "=>", data);
