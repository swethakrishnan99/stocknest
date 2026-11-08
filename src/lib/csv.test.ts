import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("splits plain rows", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
  });

  it("handles quotes, commas and line breaks inside cells", () => {
    expect(parseCsv('name,note\n"Flour, 10 kg","She said ""hi""\nthen left"')).toEqual([
      ["name", "note"],
      ["Flour, 10 kg", 'She said "hi"\nthen left'],
    ]);
  });

  it("ignores Excel's byte-order mark, Windows line endings and blank lines", () => {
    expect(parseCsv("﻿a,b\r\n1,2\r\n\r\n,\r\n")).toEqual([["a", "b"], ["1", "2"]]);
  });
});
