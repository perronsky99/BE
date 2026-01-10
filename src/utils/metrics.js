const counters = {
  notifications_created: 0,
  notifications_emitted: 0,
  notifications_failed_emits: 0,
  socket_connections: 0,
  socket_disconnections: 0
};

// Add counters for password reset flow and abuse detection
const passwordCounters = {
  password_reset_requests: 0,
  password_reset_nonexistent: 0,
  password_reset_token_set: 0,
  password_reset_email_fail: 0,
  password_reset_captcha_fail: 0,
  password_reset_rate_limited: 0
};

module.exports = {
  inc(name, n = 1) {
    if (typeof counters[name] === 'number') counters[name] += n;
    if (typeof passwordCounters[name] === 'number') passwordCounters[name] += n;
  },
  getMetrics() {
    return { ...counters, ...passwordCounters };
  }
};
