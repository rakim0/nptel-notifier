import { describe, expect, it } from "vitest";
import { exports } from "cloudflare:workers";

describe("POST /subscribers", () => {
  it("creates a new subscriber", async () => {
    const response = await exports.default.fetch(
      new Request("http://example.com/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactType: "email",
          contactValue: "alice@example.com",
        }),
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.subscriber.contactType).toBe("email");
    expect(body.subscriber.contactValue).toBe("alice@example.com");
    expect(body.subscriber.id).toBeDefined();
    expect(body.subscriber.createdAt).toBeDefined();
  });

  it("returns 400 for invalid request body", async () => {
    const response = await exports.default.fetch(
      new Request("http://example.com/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactType: "" }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid subscriber request");
  });
});

describe("GET /subscribers", () => {
  it("lists all subscribers", async () => {
    const createResponse = await exports.default.fetch(
      new Request("http://example.com/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactType: "email",
          contactValue: "list-test@example.com",
        }),
      }),
    );
    const created = await createResponse.json();

    const listResponse = await exports.default.fetch(
      new Request("http://example.com/subscribers"),
    );

    expect(listResponse.status).toBe(200);
    const body = await listResponse.json();
    expect(Array.isArray(body.subscribers)).toBe(true);

    const found = body.subscribers.find(
      (s: { id: string }) => s.id === created.subscriber.id,
    );
    expect(found).toBeDefined();
    expect(found.contactType).toBe("email");
    expect(found.contactValue).toBe("list-test@example.com");
  });
});
