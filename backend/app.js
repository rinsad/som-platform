// Netlify serverless entrypoint. Delegate to the real Express app (CommonJS)
// so the deployed /api exposes the full route set instead of an empty stub.
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const app = require("./src/index.js");

export default app;
