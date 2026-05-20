import { describe, expect, it } from "vitest";

import { extractEventTypesFromProgrammeConfig } from "@/lib/programme/event-schema-merge";

describe("extractEventTypesFromProgrammeConfig", () => {
  it("dedupes event types case-insensitively", () => {
    const types = extractEventTypesFromProgrammeConfig(
      {
        eventSchema: {
          eventDefinitions: [
            {
              eventType: "SignupBonus",
              coreFields: [{ name: "customerId", type: "string", required: true }],
            },
          ],
        },
      },
      ["SIGNUPBONUS"]
    );

    expect(types).toEqual(["SignupBonus"]);
  });

  it("ignores event definitions without core fields", () => {
    const types = extractEventTypesFromProgrammeConfig({
      eventSchema: {
        eventDefinitions: [
          { eventType: "SIGNUPBONUS", coreFields: [] },
          {
            eventType: "PURCHASE",
            coreFields: [{ name: "amount", type: "number", required: true }],
          },
        ],
      },
    });

    expect(types).toEqual(["PURCHASE"]);
  });
});
