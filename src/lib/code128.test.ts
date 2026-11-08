import { code128 } from "./code128";

describe("code128", () => {
  it("draws start, data, checksum and stop symbols with quiet zones", () => {
    const { bars, width } = code128("ING-0012");
    // 11 modules per symbol (start + 8 characters + checksum), 13 for stop, 10 quiet zone each side
    expect(width).toBe(10 + 11 * 10 + 13 + 10);
    // three bars per symbol, four in the stop pattern
    expect(bars).toHaveLength(3 * 10 + 4);
    expect(bars[0]).toEqual({ x: 10, w: 2 }); // start B begins with a 2-module bar
  });

  it("gives different barcodes for different text", () => {
    expect(code128("ING-0012").bars).not.toEqual(code128("ING-0013").bars);
  });

  it("drops characters it can't encode", () => {
    expect(code128("ABé").width).toBe(code128("AB").width);
  });
});
