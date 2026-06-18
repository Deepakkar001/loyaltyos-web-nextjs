import { describe, expect, it } from "vitest";

import {
  buildConditionFieldCatalog,
  buildConditionFieldCatalogFromEventSchema,
  CONDITION_OPERATOR_OPTIONS,
  opsForFieldType,
} from "@/lib/rules/condition-field-catalog";

describe("buildConditionFieldCatalog", () => {
  it("for PURCHASE shows only that event schema payload fields", () => {
    const catalog = buildConditionFieldCatalog({
      programmeUid: "default",
      triggerEventType: "PURCHASE",
      configRoot: {
        eventSchema: {
          eventDefinitions: [
            {
              eventType: "PURCHASE",
              coreFields: [
                { name: "transactionId", type: "string", required: true },
                { name: "timestamp", type: "date-time", required: true },
                { name: "eventType", type: "string", required: true },
                { name: "customerId", type: "string", required: true },
                { name: "amount", type: "number", required: true },
              ],
            },
          ],
          customFields: [],
        },
      },
    });

    expect(catalog.eventDefinitionMatched).toBe(true);
    expect(catalog.fields.map((f) => f.value)).toEqual([
      "event.transactionId",
      "event.timestamp",
      "event.eventType",
      "event.customerId",
      "event.amount",
    ]);
  });

  it("includes only matching event core fields, not other events or programme custom fields", () => {
    const catalog = buildConditionFieldCatalog({
      programmeUid: "prog_1",
      triggerEventType: "LOGIN",
      configRoot: {
        eventSchema: {
          eventDefinitions: [
            {
              eventType: "LOGIN",
              coreFields: [
                { name: "sessionId", type: "string", required: true },
                { name: "deviceType", type: "string", required: false },
              ],
            },
            {
              eventType: "PURCHASE",
              coreFields: [
                { name: "amount", type: "number", required: true },
                { name: "sku", type: "string", required: false },
              ],
            },
          ],
          customFields: [{ name: "campaignCode", type: "string", required: false }],
        },
      },
    });

    expect(catalog.eventDefinitionMatched).toBe(true);
    expect(catalog.fields.map((f) => f.value)).toEqual(["event.sessionId", "event.deviceType"]);
    expect(catalog.fields.some((f) => f.value === "event.campaignCode")).toBe(false);
    expect(catalog.fields.some((f) => f.value === "event.sku")).toBe(false);
  });

  it("returns empty fields when trigger event is not in schema", () => {
    const catalog = buildConditionFieldCatalog({
      programmeUid: "prog_1",
      triggerEventType: "REFERRAL",
      configRoot: {
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

    expect(catalog.eventDefinitionMatched).toBe(false);
    expect(catalog.fields).toEqual([]);
  });

  it("keeps campaign eventSchema when programme config is also passed", () => {
    const catalog = buildConditionFieldCatalogFromEventSchema({
      programmeUid: "prog_1",
      triggerEventType: "SIGNUPBONUS",
      eventSchema: {
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

    expect(catalog.eventDefinitionMatched).toBe(true);
    expect(catalog.fields.map((f) => f.value)).toEqual(["event.customerId"]);
  });

  it("maps schema field types for operator value editors", () => {
    const catalog = buildConditionFieldCatalog({
      programmeUid: "default",
      triggerEventType: "PURCHASE",
      configRoot: {
        eventSchema: {
          eventDefinitions: [
            {
              eventType: "PURCHASE",
              coreFields: [
                { name: "amount", type: "number", required: true },
                { name: "customerId", type: "string", required: true },
                { name: "timestamp", type: "date-time", required: true },
              ],
            },
          ],
        },
      },
    });

    expect(catalog.metadata["event.amount"]?.type).toBe("number");
    expect(catalog.metadata["event.customerId"]?.type).toBe("string");
    expect(catalog.metadata["event.timestamp"]?.type).toBe("datetime");
  });
});

describe("condition operators", () => {
  it("exposes the full operator set for every field type", () => {
    for (const type of ["number", "string", "enum", "datetime"] as const) {
      expect(opsForFieldType(type).map((o) => o.value)).toEqual(
        CONDITION_OPERATOR_OPTIONS.map((o) => o.value)
      );
    }
    expect(CONDITION_OPERATOR_OPTIONS.map((o) => o.value)).toEqual([
      "EQ",
      "NEQ",
      "GT",
      "GTE",
      "LT",
      "LTE",
      "BETWEEN",
      "CONTAINS",
      "STARTS_WITH",
      "IN",
      "NOT_IN",
      "IS_NULL",
      "IS_NOT_NULL",
    ]);
  });
});
