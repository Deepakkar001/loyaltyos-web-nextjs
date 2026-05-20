import { describe, expect, it } from "vitest";

import { buildCampaignEventSchemaFromSelectedTriggers } from "@/lib/campaigns/campaign-event-schema-sync";

describe("buildCampaignEventSchemaFromSelectedTriggers", () => {
  it("prefers campaign event definitions over programme when syncing", () => {
    const schema = buildCampaignEventSchemaFromSelectedTriggers({
      triggerEventType: "SIGNUPBONUS",
      campaignEventSchema: {
        eventDefinitions: [
          {
            eventType: "SIGNUPBONUS",
            coreFields: [{ name: "customerId", type: "string", required: true }],
          },
        ],
      },
      programmeConfigRoot: {
        eventSchema: {
          eventDefinitions: [
            {
              eventType: "PURCHASE",
              coreFields: [{ name: "amount", type: "number", required: true }],
            },
          ],
        },
      },
    });

    expect(schema).not.toBeNull();
    const defs = (schema!.eventDefinitions as Array<{ eventType: string; coreFields: unknown[] }>) ?? [];
    expect(defs).toHaveLength(1);
    expect(defs[0]?.eventType).toBe("SIGNUPBONUS");
    expect(defs[0]?.coreFields).toEqual([
      { name: "customerId", type: "string", required: true },
    ]);
  });

  it("falls back to programme definitions when campaign schema is empty", () => {
    const schema = buildCampaignEventSchemaFromSelectedTriggers({
      triggerEventType: "PURCHASE",
      programmeConfigRoot: {
        eventSchema: {
          eventDefinitions: [
            {
              eventType: "PURCHASE",
              coreFields: [{ name: "amount", type: "number", required: true }],
            },
          ],
        },
      },
    });

    expect(schema).not.toBeNull();
    const defs = (schema!.eventDefinitions as Array<{ eventType: string }>) ?? [];
    expect(defs.map((d) => d.eventType)).toEqual(["PURCHASE"]);
  });

  it("does not emit placeholder core fields with empty names", () => {
    const schema = buildCampaignEventSchemaFromSelectedTriggers({
      triggerEventType: "SIGNUPBONUS",
      programmeConfigRoot: {
        eventSchema: {
          eventDefinitions: [
            {
              eventType: "PURCHASE",
              coreFields: [{ name: "amount", type: "number", required: true }],
            },
          ],
        },
      },
    });

    expect(schema).toBeNull();
  });

  it("merges multiple triggers from campaign and programme sources", () => {
    const schema = buildCampaignEventSchemaFromSelectedTriggers({
      triggerEventType: "SIGNUPBONUS,PURCHASE",
      campaignEventSchema: {
        eventDefinitions: [
          {
            eventType: "SIGNUPBONUS",
            coreFields: [{ name: "customerId", type: "string", required: true }],
          },
        ],
      },
      programmeConfigRoot: {
        eventSchema: {
          eventDefinitions: [
            {
              eventType: "PURCHASE",
              coreFields: [{ name: "amount", type: "number", required: true }],
            },
          ],
        },
      },
    });

    expect(schema).not.toBeNull();
    const defs = (schema!.eventDefinitions as Array<{ eventType: string }>) ?? [];
    expect(defs.map((d) => d.eventType)).toEqual(["SIGNUPBONUS", "PURCHASE"]);
  });
});
