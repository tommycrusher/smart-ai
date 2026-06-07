describe("Test environment", () => {
  test("should have SMARTAI_GLOBAL_DIR env var set to .continue-test", () => {
    expect(process.env.SMARTAI_GLOBAL_DIR).toBeDefined();
    expect(process.env.SMARTAI_GLOBAL_DIR)?.toMatch(/\.continue-test$/);
  });
});
