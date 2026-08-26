export const log = {
  info: (msg: string, meta?: object) => process.stdout.write(JSON.stringify({ level: "info", msg, ...meta }) + "\n"),
  error: (msg: string, meta?: object) => process.stderr.write(JSON.stringify({ level: "error", msg, ...meta }) + "\n"),
};
