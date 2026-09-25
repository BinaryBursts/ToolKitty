const fs = require("node:fs");

const html = fs.readFileSync("out/tools/weight-converter.html", "utf8");
const start = html.indexOf("t-privacy");
const end = html.indexOf('data-section="tool"');

console.log(html.slice(start - 140, end).split("><").join(">\n<"));

const text = html
  .slice(start, end)
  .split(/<[^>]+>/)
  .join(" ")
  .split(/\s+/)
  .join(" ")
  .trim();

console.log("\n--- notice text ---\n" + text);
console.log("\ncharacters:", text.length);
