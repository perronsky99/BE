const counters = {
  notifications_created: 0,
  notifications_emitted: 0,
  notifications_failed_emits: 0,
  socket_connections: 0,
  socket_disconnections: 0
};

module.exports = {
  inc(name, n = 1) {
    if (typeof counters[name] === 'number') counters[name] += n;
  },
  getMetrics() {
    return { ...counters };
  }
};
