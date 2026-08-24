import { getWebApiRuntime } from "./runtime.js";

export default {
  async fetch(request: Request): Promise<Response> {
    return (await getWebApiRuntime()).app.fetch(request);
  },
};
