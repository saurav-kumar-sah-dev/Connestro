// lib/ffprobe.js
const { spawn } = require("child_process");
const ffprobe = require("ffprobe-static");

function runFFprobe(filePath) {
  return new Promise((resolve, reject) => {
    const args = [
      "-v", "error",
      "-print_format", "json",
      "-show_format",
      "-show_streams",
      filePath,
    ];
    const ps = spawn(ffprobe.path, args);
    let out = "";
    let err = "";

    ps.stdout.on("data", (d) => (out += d.toString()));
    ps.stderr.on("data", (d) => (err += d.toString()));

    ps.on("error", (e) => reject(e));
    ps.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(err || `ffprobe exited with code ${code}`));
      }
      try {
        const json = JSON.parse(out || "{}");
        resolve(json);
      } catch (e) {
        reject(e);
      }
    });
  });
}


async function probeDurationSec(filePath) {
  try {
    const data = await runFFprobe(filePath);
    // Prefer format.duration
    const fmtDur = parseFloat(data?.format?.duration);
    if (Number.isFinite(fmtDur) && fmtDur > 0) return fmtDur;

    // Fallback to streams durations
    const streams = Array.isArray(data?.streams) ? data.streams : [];
    let best = 0;
    for (const s of streams) {
      const d = parseFloat(s?.duration);
      if (Number.isFinite(d) && d > best) best = d;
    }
    return best || 0;
  } catch {
    return 0;
  }
}

module.exports = { probeDurationSec };