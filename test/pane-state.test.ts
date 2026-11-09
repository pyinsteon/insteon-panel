import { describe, expect, it } from "vitest";
import { paneState } from "../src/device/pane-state";

describe("paneState", () => {
  it("is loading while records are still being fetched", () => {
    expect(paneState({ status: "loaded", records: undefined })).toBe("loading");
  });

  it("is loading while the device reports loading or a load was started", () => {
    expect(paneState({ status: "loading", records: [] })).toBe("loading");
    expect(paneState({ status: "loaded", records: [], loading: true })).toBe("loading");
  });

  it("is error when the fetch failed, whatever the status", () => {
    expect(paneState({ status: "loaded", records: undefined, error: true })).toBe("error");
  });

  it("is not_loaded for empty, failed and unknown statuses", () => {
    expect(paneState({ status: "empty", records: [] })).toBe("not_loaded");
    expect(paneState({ status: "failed", records: [] })).toBe("not_loaded");
    expect(paneState({ status: undefined, records: [] })).toBe("not_loaded");
  });

  it("is partial only for partial", () => {
    expect(paneState({ status: "partial", records: [] })).toBe("partial");
    expect(paneState({ status: "dirty", records: [] })).toBe("not_loaded");
  });

  it("is loaded only for loaded with records present", () => {
    expect(paneState({ status: "loaded", records: [] })).toBe("loaded");
  });
});
