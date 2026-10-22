import { describe, expect, it } from "vitest";
import { fetchAll, PAGE_SIZE } from "./fetch-all";

describe("fetchAll", () => {
  it("читає всі сторінки до неповної", async () => {
    const all = Array.from({ length: PAGE_SIZE * 2 + 5 }, (_, i) => i);
    const calls: [number, number][] = [];
    const result = await fetchAll((from, to) => {
      calls.push([from, to]);
      return Promise.resolve({ data: all.slice(from, to + 1), error: null });
    });
    expect(result.data).toHaveLength(all.length);
    expect(calls).toEqual([
      [0, PAGE_SIZE - 1],
      [PAGE_SIZE, PAGE_SIZE * 2 - 1],
      [PAGE_SIZE * 2, PAGE_SIZE * 3 - 1],
    ]);
  });

  it("повертає помилку будь-якої сторінки", async () => {
    const result = await fetchAll((from) =>
      Promise.resolve(from === 0 ? { data: Array(PAGE_SIZE).fill(1), error: null } : { data: null, error: { message: "boom" } }),
    );
    expect(result).toEqual({ data: null, error: { message: "boom" } });
  });
});
