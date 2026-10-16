// US state lookups for wholesale imports. Nuitee matches cities by name only
// ("Portland" = Oregon and Maine), so each hotel's ZIP code decides its state.

// First three ZIP digits → state, as [from, to, state] ranges.
const ZIP3_RANGES: [number, number, string][] = [
  [5, 5, "NY"], [6, 9, "PR"], [10, 27, "MA"], [28, 29, "RI"], [30, 38, "NH"],
  [39, 49, "ME"], [50, 54, "VT"], [55, 55, "MA"], [56, 59, "VT"], [60, 69, "CT"],
  [70, 89, "NJ"], [100, 149, "NY"], [150, 196, "PA"], [197, 199, "DE"],
  [200, 200, "DC"], [201, 201, "VA"], [202, 205, "DC"], [206, 219, "MD"],
  [220, 246, "VA"], [247, 268, "WV"], [270, 289, "NC"], [290, 299, "SC"],
  [300, 319, "GA"], [320, 349, "FL"], [350, 369, "AL"], [370, 385, "TN"],
  [386, 397, "MS"], [398, 399, "GA"], [400, 427, "KY"], [430, 458, "OH"],
  [460, 479, "IN"], [480, 499, "MI"], [500, 528, "IA"], [530, 549, "WI"],
  [550, 567, "MN"], [569, 569, "DC"], [570, 577, "SD"], [580, 588, "ND"],
  [590, 599, "MT"], [600, 629, "IL"], [630, 658, "MO"], [660, 679, "KS"],
  [680, 693, "NE"], [700, 714, "LA"], [716, 729, "AR"], [730, 732, "OK"],
  [733, 733, "TX"], [734, 749, "OK"], [750, 799, "TX"], [800, 816, "CO"],
  [820, 831, "WY"], [832, 838, "ID"], [840, 847, "UT"], [850, 865, "AZ"],
  [870, 884, "NM"], [885, 885, "TX"], [889, 898, "NV"], [900, 961, "CA"],
  [967, 968, "HI"], [970, 979, "OR"], [980, 994, "WA"], [995, 999, "AK"],
];

export function zipToState(zip: string | null | undefined): string | null {
  const digits = (zip ?? "").trim().match(/^\d{5}/)?.[0];
  if (!digits) return null;
  const zip3 = Number(digits.slice(0, 3));
  const hit = ZIP3_RANGES.find(([from, to]) => zip3 >= from && zip3 <= to);
  return hit ? hit[2] : null;
}

// Main time zone per state (drives the "midnight hotel time" deadline).
const STATE_TZ: Record<string, string> = {
  AL: "America/Chicago", AK: "America/Anchorage", AZ: "America/Phoenix",
  AR: "America/Chicago", CA: "America/Los_Angeles", CO: "America/Denver",
  CT: "America/New_York", DC: "America/New_York", DE: "America/New_York",
  FL: "America/New_York", GA: "America/New_York", HI: "Pacific/Honolulu",
  IA: "America/Chicago", ID: "America/Boise", IL: "America/Chicago",
  IN: "America/Indiana/Indianapolis", KS: "America/Chicago",
  KY: "America/New_York", LA: "America/Chicago", MA: "America/New_York",
  MD: "America/New_York", ME: "America/New_York", MI: "America/Detroit",
  MN: "America/Chicago", MO: "America/Chicago", MS: "America/Chicago",
  MT: "America/Denver", NC: "America/New_York", ND: "America/Chicago",
  NE: "America/Chicago", NH: "America/New_York", NJ: "America/New_York",
  NM: "America/Denver", NV: "America/Los_Angeles", NY: "America/New_York",
  OH: "America/New_York", OK: "America/Chicago", OR: "America/Los_Angeles",
  PA: "America/New_York", PR: "America/Puerto_Rico", RI: "America/New_York",
  SC: "America/New_York", SD: "America/Chicago", TN: "America/Chicago",
  TX: "America/Chicago", UT: "America/Denver", VA: "America/New_York",
  VT: "America/New_York", WA: "America/Los_Angeles", WI: "America/Chicago",
  WV: "America/New_York", WY: "America/Denver",
};

export function stateTimezone(state: string): string {
  return STATE_TZ[state] ?? "America/Los_Angeles";
}
