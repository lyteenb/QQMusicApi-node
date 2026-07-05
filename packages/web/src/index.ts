/** Web 服务入口 */

import { createApp } from "./app.js";

async function main() {
  const { app, settings } = await createApp();

  try {
    await app.listen({ host: settings.server.host, port: settings.server.port });
    app.log.info(`QQMusic API server running at http://${settings.server.host}:${settings.server.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
