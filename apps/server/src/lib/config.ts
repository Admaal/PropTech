import { parseServerConfig } from "./runtime-config.js";

export const serverConfig = parseServerConfig(process.env);
