const test = require("node:test");
const assert = require("node:assert/strict");
const helpers = require("../02 - Scripts/periodicNoteHelpers.js");
const { createMockTp, installMockMoment } = require("./_testUtils.js");

test("resolvePeriod(weekly): blank prompt defaults to now, computes ISO-week labels, renames to the label", async () => {
    installMockMoment();
    const tp = createMockTp({ prompts: [""] });

    const result = await helpers.resolvePeriod(tp, "weekly");

    assert.match(tp._calls.prompts[0], /current week/);
    assert.equal(result.label, "now|startOf:isoWeek::GGGG-[W]WW");
    assert.equal(result.prevLabel, "now|startOf:isoWeek|subtract:7,days::GGGG-[W]WW");
    assert.equal(result.nextLabel, "now|startOf:isoWeek|add:7,days::GGGG-[W]WW");
    assert.equal(result.periodEnd.format("X"), "now|startOf:isoWeek|add:7,days::X");
    assert.deepEqual(tp._calls.renames, [result.label]);
});

test("resolvePeriod(monthly): explicit input is parsed with the monthly format and stepped by 1 month", async () => {
    const constructed = installMockMoment();
    const tp = createMockTp({ prompts: ["2025-06"] });

    const result = await helpers.resolvePeriod(tp, "monthly");

    assert.deepEqual(constructed[0], { input: "2025-06", format: "YYYY-MM", strict: undefined });
    assert.equal(result.label, "parsed(2025-06,YYYY-MM)|startOf:month::YYYY-MMM");
    assert.equal(result.prevLabel, "parsed(2025-06,YYYY-MM)|startOf:month|subtract:1,month::YYYY-MMM");
    assert.equal(result.nextLabel, "parsed(2025-06,YYYY-MM)|startOf:month|add:1,month::YYYY-MMM");
    assert.deepEqual(tp._calls.renames, [result.label]);
});

test("resolvePeriod(yearly): explicit input is parsed with the yearly format and stepped by 1 year", async () => {
    installMockMoment();
    const tp = createMockTp({ prompts: ["2025"] });

    const result = await helpers.resolvePeriod(tp, "yearly");

    assert.equal(result.label, "parsed(2025,YYYY)|startOf:year::YYYY-[Y]");
    assert.equal(result.prevLabel, "parsed(2025,YYYY)|startOf:year|subtract:1,year::YYYY-[Y]");
    assert.equal(result.nextLabel, "parsed(2025,YYYY)|startOf:year|add:1,year::YYYY-[Y]");
});

test("resolveDailyAnchor: a filename that already parses as YYYYMMDD is used as-is, no rename", async () => {
    installMockMoment({ invalid: [] });
    const tp = createMockTp({ fileTitle: "20250214" });

    const anchor = await helpers.resolveDailyAnchor(tp);

    assert.equal(anchor.format("X"), "parsed(20250214,YYYYMMDD)::X");
    assert.deepEqual(tp._calls.renames, []);
});

test("resolveDailyAnchor: an unparseable filename (e.g. \"Untitled\") falls back to now and renames to YYYYMMDD", async () => {
    installMockMoment({ invalid: ["Untitled"] });
    const tp = createMockTp({ fileTitle: "Untitled" });

    const anchor = await helpers.resolveDailyAnchor(tp);

    assert.equal(anchor.format("X"), "now::X");
    assert.deepEqual(tp._calls.renames, ["now::YYYYMMDD"]);
});

test("parentLabel: applies startOf then format on a clone, leaving the original untouched", async () => {
    installMockMoment();
    const tp = createMockTp({ fileTitle: "20250214" });
    const anchor = await helpers.resolveDailyAnchor(tp);

    const week = helpers.parentLabel(anchor, "isoWeek", "GGGG-[W]WW");

    assert.equal(week, "parsed(20250214,YYYYMMDD)|startOf:isoWeek::GGGG-[W]WW");
    // original anchor's own log is untouched by parentLabel's clone
    assert.equal(anchor.format("X"), "parsed(20250214,YYYYMMDD)::X");
});
