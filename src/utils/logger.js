const format = (level, msg, meta) => {
  const ts = new Date().toISOString();
  const base = { ts, level, msg };
  if (meta) base.meta = meta;
  return JSON.stringify(base);
};

module.exports = {
  info: (msg, meta) => console.log(format('info', msg, meta)),
  warn: (msg, meta) => console.warn(format('warn', msg, meta)),
  error: (msg, meta) => console.error(format('error', msg, meta)),
  debug: (msg, meta) => console.debug(format('debug', msg, meta))
};
