/* ตรวจว่าทุก key ที่เรียก t("...") มีอยู่ในคลังคำ th/en ครบ */
const fs = require("fs");
const path = require("path");

function flatten(obj, prefix = "") {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null) keys.push(...flatten(v, key));
    else keys.push(key);
  }
  return keys;
}

// ดึง keys จากไฟล์ locale ด้วย regex เบื้องต้น (โครงสร้าง object ล้วน)
function extractLocaleKeys(file) {
  const src = fs.readFileSync(file, "utf8");
  const keys = [];
  const stack = [];
  let lastIdent = null;
  const re = /(\w+)\s*:\s*\{|([A-Za-z0-9_.]+)\s*:\s*(?:"[^"]*"|'[^']*'|`[^`]*`)/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[1]) {
      // object opening
      if (stack.length === 0 && m[1] !== "th" && m[1] !== "en") continue;
      stack.push(m[1]);
    } else if (m[2]) {
      keys.push([...stack, m[2]].join("."));
    }
  }
  // crude close tracking: fallback — return flat by evaluating via require trick
  return { keys, stackLen: stack.length };
}

const srcDir = "src";
const used = new Set();
function scan(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) scan(p);
    else if (/\.tsx?$/.test(f.name)) {
      const c = fs.readFileSync(p, "utf8");
      const re = /\bt\(\s*["'`]([^"'`]+)["'`]/g;
      let m;
      while ((m = re.exec(c))) used.add(m[1]);
      const re2 = /\bt\(\s*([A-Za-z0-9_.]+(?:\.key|Key))/g;
      while ((m = re2.exec(c))) used.add("DYNAMIC:" + m[1]);
    }
  }
}
scan(srcDir);

// สร้าง keys จริงจาก locale ผ่าน eval ปลอดภัย (ไฟล์ของเราเอง)
const thSrc = fs.readFileSync("src/i18n/locales/th.ts", "utf8");
const enSrc = fs.readFileSync("src/i18n/locales/en.ts", "utf8");
const thKeys = flatten(eval("(" + thSrc.slice(thSrc.indexOf("{"), thSrc.lastIndexOf("}") + 1) + ")"));
const enKeys = new Set(flatten(eval("(" + enSrc.slice(enSrc.indexOf("{"), enSrc.lastIndexOf("}") + 1) + ")")));

const missing = [...used].filter((k) => !k.startsWith("DYNAMIC:") && !thKeys.includes(k));
console.log("keys used:", used.size, "| th keys:", thKeys.length);
if (missing.length === 0) console.log("✅ ทุก key มีในคลังคำครบ");
else {
  console.log("❌ MISSING KEYS:");
  missing.forEach((k) => console.log("  -", k));
}
// แจ้ง key ที่มีใน en แต่ไม่มีใน th (กัน EN แปลแล้ว TH ว่าง)
const thSet = new Set(thKeys);
const enOnly = [...enKeys].filter((k) => !thSet.has(k));
if (enOnly.length) console.log("⚠️ in EN but missing in TH:", enOnly.join(", "));
