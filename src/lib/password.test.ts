import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CHARACTER_CLASSES,
  CHARACTER_SETS,
  DEFAULT_CLASSES,
  drawPassword,
  enabledClasses,
  generatePassword,
  isSecureRandomAvailable,
  NoCharacterClassError,
  OutOfRangeLengthError,
  PASSWORD_DEFAULT_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  randomInt,
  SecureRandomUnavailableError,
  shuffle,
  type CharacterClass,
  type CharacterClassToggles,
} from "./password";

/** Toggles with only the named classes on. */
function only(...names: readonly CharacterClass[]): CharacterClassToggles {
  return {
    uppercase: names.includes("uppercase"),
    lowercase: names.includes("lowercase"),
    digits: names.includes("digits"),
    symbols: names.includes("symbols"),
  };
}

/** Which class a character belongs to, or undefined if it belongs to none. */
function classOf(character: string): CharacterClass | undefined {
  return CHARACTER_CLASSES.find((name) =>
    CHARACTER_SETS[name].includes(character),
  );
}

/** The distinct classes present in a password. */
function classesIn(password: string): Set<CharacterClass> {
  const found = new Set<CharacterClass>();
  for (const character of password) {
    const name = classOf(character);
    if (name !== undefined) {
      found.add(name);
    }
  }
  return found;
}

/** `count` passwords generated with the same request. */
function generateMany(
  count: number,
  request: { length?: number; classes?: CharacterClassToggles } = {},
): readonly string[] {
  return Array.from({ length: count }, () => generatePassword(request));
}

/**
 * A stand-in for the Web Crypto API that hands out the given 32-bit words in
 * order, so the rejection-sampling loop can be watched. The last word is
 * repeated if more draws are asked for than were supplied.
 */
function cryptoReturning(words: readonly number[]): {
  getRandomValues: ReturnType<typeof vi.fn>;
} {
  let index = 0;
  const getRandomValues = vi.fn((array: Uint32Array): Uint32Array => {
    const word = words[Math.min(index, words.length - 1)] ?? 0;
    index += 1;
    array[0] = word;
    return array;
  });
  return { getRandomValues };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the character sets", () => {
  it("holds the four classes REQ-7 names, in display order", () => {
    expect(CHARACTER_CLASSES).toEqual([
      "uppercase",
      "lowercase",
      "digits",
      "symbols",
    ]);
  });

  it("uses exactly the sets REQ-7 lists", () => {
    expect(CHARACTER_SETS.uppercase).toBe("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    expect(CHARACTER_SETS.lowercase).toBe("abcdefghijklmnopqrstuvwxyz");
    expect(CHARACTER_SETS.digits).toBe("0123456789");
    expect(CHARACTER_SETS.symbols).toBe("!@#$%^&*()-_=+[]{};:,.?/");
  });

  it("repeats no character within a set, and none across two sets", () => {
    const all = CHARACTER_CLASSES.map((name) => CHARACTER_SETS[name]).join("");
    expect(new Set(all).size).toBe(all.length);
  });

  it("starts the tool on 8-64, default 16, with all four classes on", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(PASSWORD_MAX_LENGTH).toBe(64);
    expect(PASSWORD_DEFAULT_LENGTH).toBe(16);
    expect(DEFAULT_CLASSES).toEqual({
      uppercase: true,
      lowercase: true,
      digits: true,
      symbols: true,
    });
  });
});

describe("enabledClasses", () => {
  it("lists the enabled classes in display order", () => {
    expect(enabledClasses(only("symbols", "uppercase"))).toEqual([
      "uppercase",
      "symbols",
    ]);
  });

  it("is empty when every class is off", () => {
    expect(enabledClasses(only())).toEqual([]);
  });
});

describe("generatePassword length", () => {
  const lengths = Array.from(
    { length: PASSWORD_MAX_LENGTH - PASSWORD_MIN_LENGTH + 1 },
    (_unused, offset) => PASSWORD_MIN_LENGTH + offset,
  );

  it.each(lengths)("returns exactly %i characters", (length) => {
    const password = generatePassword({ length });

    expect(typeof password).toBe("string");
    expect(password).toHaveLength(length);
  });

  it("uses the default length of 16 when none is given", () => {
    expect(generatePassword()).toHaveLength(PASSWORD_DEFAULT_LENGTH);
    expect(generatePassword({ classes: DEFAULT_CLASSES })).toHaveLength(
      PASSWORD_DEFAULT_LENGTH,
    );
  });
});

describe("generatePassword character classes", () => {
  it("includes every enabled class in each of 200 passwords", () => {
    for (const password of generateMany(200, { classes: DEFAULT_CLASSES })) {
      expect(
        [...classesIn(password)].sort(),
        `"${password}" is missing a class`,
      ).toEqual(["digits", "lowercase", "symbols", "uppercase"]);
    }
  });

  it("guarantees each class even at the shortest length", () => {
    for (const password of generateMany(200, {
      length: PASSWORD_MIN_LENGTH,
      classes: DEFAULT_CLASSES,
    })) {
      expect(classesIn(password).size).toBe(4);
    }
  });

  it("uses only letters across 200 passwords when digits and symbols are off", () => {
    for (const password of generateMany(200, {
      classes: only("uppercase", "lowercase"),
    })) {
      expect(password).toMatch(/^[A-Za-z]+$/);
      expect(classesIn(password).size).toBe(2);
    }
  });

  it.each(CHARACTER_CLASSES)(
    "draws only from %s when it is the only class enabled",
    (name) => {
      const password = generatePassword({ classes: only(name) });

      for (const character of password) {
        expect(CHARACTER_SETS[name]).toContain(character);
      }
    },
  );

  it("does not always put the guaranteed characters in class order", () => {
    // One character from each class is drawn in CHARACTER_CLASSES order before
    // the shuffle; if the shuffle were missing, every password would start
    // upper, lower, digit, symbol.
    const inClassOrder = generateMany(50, { classes: DEFAULT_CLASSES }).filter(
      (password) =>
        [...password.slice(0, 4)].map(classOf).join(",") ===
        CHARACTER_CLASSES.join(","),
    );

    expect(inClassOrder.length).toBeLessThan(5);
  });
});

describe("generatePassword independence", () => {
  it("produces 200 distinct passwords at the default settings", () => {
    const passwords = generateMany(200, {
      length: PASSWORD_DEFAULT_LENGTH,
      classes: DEFAULT_CLASSES,
    });

    expect(new Set(passwords).size).toBe(200);
  });

  it("keeps no state between calls: the request object is not mutated", () => {
    const request = { length: 20, classes: { ...DEFAULT_CLASSES } };
    generatePassword(request);

    expect(request).toEqual({ length: 20, classes: DEFAULT_CLASSES });
  });
});

describe("generatePassword refusals", () => {
  it("throws NoCharacterClassError when every class is off", () => {
    expect(() => generatePassword({ classes: only() })).toThrow(
      NoCharacterClassError,
    );
    expect(() => generatePassword({ classes: only() })).toThrow(
      /at least one character type/i,
    );
  });

  it.each([7, 65])("throws OutOfRangeLengthError for length %i", (length) => {
    expect(() => generatePassword({ length })).toThrow(OutOfRangeLengthError);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "throws OutOfRangeLengthError for the length %p",
    (length) => {
      expect(() => generatePassword({ length })).toThrow(OutOfRangeLengthError);
    },
  );

  it("accepts the ends of the range it refuses just outside", () => {
    expect(generatePassword({ length: PASSWORD_MIN_LENGTH })).toHaveLength(8);
    expect(generatePassword({ length: PASSWORD_MAX_LENGTH })).toHaveLength(64);
  });
});

describe("drawPassword with fewer positions than classes", () => {
  // REQ-7: "If the requested length is smaller than the number of enabled
  // classes, the password still has the requested length and includes as many
  // distinct classes as fit, chosen at random." generatePassword's floor of 8
  // puts this out of a visitor's reach; the rule is checked where it lives.
  const three: readonly CharacterClass[] = ["uppercase", "lowercase", "digits"];

  it("returns exactly the requested length", () => {
    for (let run = 0; run < 50; run += 1) {
      expect(drawPassword(2, three)).toHaveLength(2);
    }
  });

  it("uses two distinct classes, never the same class twice", () => {
    for (let run = 0; run < 50; run += 1) {
      expect(classesIn(drawPassword(2, three)).size).toBe(2);
    }
  });

  it("chooses the subset at random rather than always the first classes", () => {
    const seen = new Set<CharacterClass>();
    for (let run = 0; run < 100; run += 1) {
      for (const name of classesIn(drawPassword(2, three))) {
        seen.add(name);
      }
    }

    expect([...seen].sort()).toEqual(["digits", "lowercase", "uppercase"]);
  });

  it("still refuses a length below one, and an empty class list", () => {
    expect(() => drawPassword(0, three)).toThrow(RangeError);
    expect(() => drawPassword(8, [])).toThrow(NoCharacterClassError);
  });
});

describe("randomInt", () => {
  it("stays inside the range it is given", () => {
    for (let run = 0; run < 1000; run += 1) {
      const value = randomInt(7);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(7);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it("always returns 0 for a bound of 1", () => {
    expect(randomInt(1)).toBe(0);
  });

  it.each([0, -1, 2.5, Number.NaN, 2 ** 32 + 1])(
    "refuses the bound %p",
    (bound) => {
      expect(() => randomInt(bound)).toThrow(RangeError);
    },
  );

  /**
   * A per-bucket band of 2% at 100,000 draws is only about 2.1 standard
   * deviations wide, which a fair generator would step outside roughly one run
   * in three. Uniformity is therefore asserted twice: the 100,000-draw sample
   * REQ-7's criterion names, at a band wide enough not to cry wolf, and the 2%
   * band on a sample large enough for it to mean something (4.7 sigma).
   */
  it("spreads 100,000 draws of randomInt(10) evenly across the ten buckets", () => {
    const draws = 100_000;
    const buckets = new Array<number>(10).fill(0);

    for (let draw = 0; draw < draws; draw += 1) {
      const value = randomInt(10);
      buckets[value] = (buckets[value] ?? 0) + 1;
    }

    const expected = draws / 10;
    expect(buckets.reduce((total, count) => total + count, 0)).toBe(draws);
    for (const [value, count] of buckets.entries()) {
      expect(
        Math.abs(count - expected) / expected,
        `bucket ${value} held ${count} of ${draws} draws`,
      ).toBeLessThan(0.05);
    }
  });

  it("keeps every bucket within 2% of expectation over 500,000 draws", () => {
    const draws = 500_000;
    const buckets = new Array<number>(10).fill(0);

    for (let draw = 0; draw < draws; draw += 1) {
      const value = randomInt(10);
      buckets[value] = (buckets[value] ?? 0) + 1;
    }

    const expected = draws / 10;
    for (const [value, count] of buckets.entries()) {
      expect(
        Math.abs(count - expected) / expected,
        `bucket ${value} held ${count} of ${draws} draws`,
      ).toBeLessThan(0.02);
    }
  });

  it("discards a draw in the unfair tail and takes the next one", () => {
    // For a bound of 10 the last complete block ends at 4294967290, so that
    // word and everything above it must be thrown away; 13 is fair and gives 3.
    const fake = cryptoReturning([4_294_967_295, 4_294_967_290, 13]);
    vi.stubGlobal("crypto", fake);

    expect(randomInt(10)).toBe(3);
    expect(fake.getRandomValues).toHaveBeenCalledTimes(3);
  });

  it("accepts the largest fair word without redrawing", () => {
    const fake = cryptoReturning([4_294_967_289]);
    vi.stubGlobal("crypto", fake);

    expect(randomInt(10)).toBe(9);
    expect(fake.getRandomValues).toHaveBeenCalledTimes(1);
  });

  it("takes every draw when the bound divides 2^32 evenly", () => {
    const fake = cryptoReturning([4_294_967_295]);
    vi.stubGlobal("crypto", fake);

    // 16 divides 2^32, so there is no unfair tail to reject.
    expect(randomInt(16)).toBe(15);
    expect(fake.getRandomValues).toHaveBeenCalledTimes(1);
  });
});

describe("shuffle", () => {
  it("returns a new array with the same items", () => {
    const items = [1, 2, 3, 4, 5];
    const shuffled = shuffle(items);

    expect(shuffled).not.toBe(items);
    expect([...shuffled].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5]);
  });

  it("handles the empty and single-item cases", () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle(["a"])).toEqual(["a"]);
  });

  it("reaches every position: over many runs each item lands first", () => {
    const first = new Set<string>();
    for (let run = 0; run < 200; run += 1) {
      const [head] = shuffle(["a", "b", "c", "d"]);
      if (head !== undefined) {
        first.add(head);
      }
    }

    expect([...first].sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("does not simply return the input order every time", () => {
    const identical = Array.from({ length: 50 }, () =>
      shuffle([1, 2, 3, 4, 5, 6, 7, 8]).join(","),
    ).filter((order) => order === "1,2,3,4,5,6,7,8");

    expect(identical.length).toBeLessThan(5);
  });
});

describe("isSecureRandomAvailable", () => {
  it("is true where the Web Crypto API is there", () => {
    expect(isSecureRandomAvailable()).toBe(true);
  });

  it("is false when there is no crypto object at all", () => {
    vi.stubGlobal("crypto", undefined);
    expect(isSecureRandomAvailable()).toBe(false);
  });

  it("is false when crypto has no getRandomValues", () => {
    vi.stubGlobal("crypto", {});
    expect(isSecureRandomAvailable()).toBe(false);
  });

  it("makes generation fail loudly rather than fall back to weaker randomness", () => {
    vi.stubGlobal("crypto", undefined);

    expect(() => generatePassword()).toThrow(SecureRandomUnavailableError);
    expect(() => randomInt(10)).toThrow(SecureRandomUnavailableError);
  });
});

describe("what generation touches", () => {
  it("writes no cookie", () => {
    const before = document.cookie;
    generatePassword({ length: 32, classes: DEFAULT_CLASSES });

    expect(document.cookie).toBe(before);
    expect(document.cookie).toBe("");
  });

  it("reads and writes no localStorage or sessionStorage entry", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const getItem = vi.spyOn(Storage.prototype, "getItem");

    generatePassword({ length: 32, classes: DEFAULT_CLASSES });

    expect(setItem).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it("makes no network call and logs nothing", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const open = vi.spyOn(XMLHttpRequest.prototype, "open");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    generatePassword({ length: 32, classes: DEFAULT_CLASSES });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
