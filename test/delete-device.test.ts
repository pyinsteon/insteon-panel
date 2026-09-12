import { beforeEach, describe, expect, it, vi } from "vitest";

const showConfirmationDialog = vi.fn();
const navigate = vi.fn();
const removeInsteonDevice = vi.fn(async () => {});

vi.mock("@ha/dialogs/generic/show-dialog-box", () => ({ showConfirmationDialog }));
vi.mock("@ha/common/navigate", () => ({ navigate }));
vi.mock("../src/data/device", () => ({ removeInsteonDevice }));

const { confirmDeleteDevice } = await import("../src/device/delete-device");

const insteon = { localize: (key: string) => key } as any;
const hass = {} as any;
const device = { name: "x", address: "39.43.A8", is_battery: false, aldb_status: "loaded" };

describe("confirmDeleteDevice", () => {
  beforeEach(() => {
    showConfirmationDialog.mockReset();
    navigate.mockReset();
    removeInsteonDevice.mockClear();
  });

  it("does nothing when the first confirmation is dismissed", async () => {
    showConfirmationDialog.mockResolvedValueOnce(false);
    await confirmDeleteDevice(document.body, hass, insteon, device);
    expect(removeInsteonDevice).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("passes the second answer through as remove_all_refs and goes home", async () => {
    showConfirmationDialog.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    await confirmDeleteDevice(document.body, hass, insteon, device);
    expect(removeInsteonDevice).toHaveBeenCalledWith(hass, "39.43.A8", true);
    expect(navigate).toHaveBeenCalledWith("/insteon");
  });

  it("skips the second question for x10 devices", async () => {
    showConfirmationDialog.mockResolvedValueOnce(true);
    await confirmDeleteDevice(document.body, hass, insteon, { ...device, address: "X10.A.01" });
    expect(showConfirmationDialog).toHaveBeenCalledTimes(1);
    expect(removeInsteonDevice).toHaveBeenCalledWith(hass, "X10.A.01", false);
  });
});
