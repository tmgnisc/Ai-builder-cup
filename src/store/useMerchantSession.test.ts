import { beforeEach, describe, expect, it } from "vitest";
import { useMerchantSession } from "./useMerchantSession";

describe("useMerchantSession", () => {
  beforeEach(() => {
    useMerchantSession.getState().reset();
  });

  it("records a new missing_info event and increments ask count on repeat", () => {
    const store = useMerchantSession.getState();
    expect(store.missing).toHaveLength(0);

    store.recordMissingInfo({
      productId: "acer-swift-go-14",
      field: "SD card reader",
      question: "Does it have a full-size SD card slot?",
    });

    let current = useMerchantSession.getState().missing;
    expect(current).toHaveLength(1);
    expect(current[0].productId).toBe("acer-swift-go-14");
    expect(current[0].field).toBe("SD card reader");
    expect(current[0].asks).toBe(1);
    expect(current[0].example).toBe("Does it have a full-size SD card slot?");

    // Repeat ask for the same product and field
    store.recordMissingInfo({
      productId: "acer-swift-go-14",
      field: "SD card reader",
      question: "Can I put my camera SD card in it?",
    });

    current = useMerchantSession.getState().missing;
    expect(current).toHaveLength(1);
    expect(current[0].asks).toBe(2);
    expect(current[0].example).toBe("Can I put my camera SD card in it?");

    // Reset clears the store
    store.reset();
    expect(useMerchantSession.getState().missing).toHaveLength(0);
  });
});
