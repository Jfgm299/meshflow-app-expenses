import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("returns the app health payload", () => {
    const controller = new HealthController();

    expect(controller.getHealth()).toEqual({
      status: "ok",
      app: "finance",
      version: "1.0.0"
    });
  });
});
