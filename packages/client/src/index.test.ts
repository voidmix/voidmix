import { describe, expect, it } from "vite-plus/test";

import { createApiClient } from "./index.js";

describe("createApiClient", () => {
  it("creates a typed lazy client without making a request", () => {
    const client = createApiClient({ baseUrl: "https://api.example.com/" });
    expect(client.admin.users.list).toBeTypeOf("function");
  });

  it("supports a relative same-origin transport", () => {
    const client = createApiClient({});
    expect(client.health).toBeTypeOf("function");
  });
});
