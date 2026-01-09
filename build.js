const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");
const FILES = ["index.html", "sw.js", "manifest.webmanifest", "vercel.json", "README.md", "LICENSE"];
const FOLDERS = ["src", "data", "public"];

function cleanDist() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
}

function copyEntry(source, destination) {
  const stats = fs.statSync(source);
  if (stats.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyEntry(path.join(source, entry), path.join(destination, entry));
    }
  } else {
    fs.copyFileSync(source, destination);
  }
}

function main() {
  cleanDist();
  for (const file of FILES) {
    const srcPath = path.join(ROOT, file);
    if (!fs.existsSync(srcPath)) continue;
    copyEntry(srcPath, path.join(DIST, file));
  }
  for (const folder of FOLDERS) {
    const srcDir = path.join(ROOT, folder);
    if (!fs.existsSync(srcDir)) continue;
    copyEntry(srcDir, path.join(DIST, folder));
  }
}

main();
