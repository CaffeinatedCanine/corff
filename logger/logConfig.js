const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "logConfig.json");

function loadLogConfig() {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveLogConfig(config) {
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
}

module.exports = { loadLogConfig, saveLogConfig };
