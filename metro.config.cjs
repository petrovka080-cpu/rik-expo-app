// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const exclusionList = require("metro-config/src/defaults/exclusionList");

const config = getDefaultConfig(__dirname);

// не даём Metro индексировать мусор сборки Android
config.resolver.blacklistRE = exclusionList([
  /android\/app\/build\/.*/,
  /android\/build\/.*/,
  /android\/\.gradle\/.*/,
]);

module.exports = config;
