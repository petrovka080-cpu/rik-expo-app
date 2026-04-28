"use strict";

const DEFAULT_HEALTH_THRESHOLDS = Object.freeze({
  totalErrors: {
    last1h: { warn: 10, critical: 25 },
    last24h: { warn: 75, critical: 200 },
    last7d: { warn: 300, critical: 800 },
  },
  domainErrors: {
    last1h: { warn: 5, critical: 15 },
    last24h: { warn: 40, critical: 120 },
    last7d: { warn: 150, critical: 400 },
  },
  signalCounts: {
    warn: 3,
    critical: 10,
  },
});

module.exports = {
  DEFAULT_HEALTH_THRESHOLDS,
};
