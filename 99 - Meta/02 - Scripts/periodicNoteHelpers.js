/*
 * Shared helpers for the Daily/Weekly/Monthly/Yearly periodic note templates.
 * Exposed to templates as tp.user.periodicNoteHelpers.<fn>
 */

const PERIOD_PRESETS = {
    weekly: {
        promptText: "Any date within the target week (YYYY-MM-DD) — leave blank for the current week:",
        parseFormat: "YYYY-MM-DD",
        startOfUnit: "isoWeek",
        stepAmount: 7,
        stepUnit: "days",
        labelFormat: "GGGG-[W]WW",
    },
    monthly: {
        promptText: "Month (YYYY-MM) — leave blank for the current month:",
        parseFormat: "YYYY-MM",
        startOfUnit: "month",
        stepAmount: 1,
        stepUnit: "month",
        labelFormat: "YYYY-MMM",
    },
    yearly: {
        promptText: "Year (YYYY) — leave blank for the current year:",
        parseFormat: "YYYY",
        startOfUnit: "year",
        stepAmount: 1,
        stepUnit: "year",
        labelFormat: "YYYY-[Y]",
    },
};

// Prompts for the target period (blank/cancelled -> now), computes the
// period's start/end and this/prev/next labels, and renames the note to the
// canonical label. Used by the Weekly/Monthly/Yearly templates.
async function resolvePeriod(tp, presetName) {
    const preset = PERIOD_PRESETS[presetName];
    const input = await tp.system.prompt(preset.promptText, "", false, false);
    const anchor = input ? moment(input, preset.parseFormat) : moment();
    const periodStart = anchor.clone().startOf(preset.startOfUnit);
    const periodEnd = periodStart.clone().add(preset.stepAmount, preset.stepUnit);
    const label = periodStart.format(preset.labelFormat);
    const prevLabel = periodStart.clone().subtract(preset.stepAmount, preset.stepUnit).format(preset.labelFormat);
    const nextLabel = periodStart.clone().add(preset.stepAmount, preset.stepUnit).format(preset.labelFormat);
    await tp.file.rename(label);
    return { periodStart, periodEnd, label, prevLabel, nextLabel };
}

// Resolves the anchor date for a Daily note: parses the (already-named) file
// title as YYYYMMDD; falls back to today and renames if that fails (e.g. the
// note was created as "Untitled" via "Create new note from template" instead
// of through the Daily Notes plugin, which normally pre-names the file).
async function resolveDailyAnchor(tp) {
    const parsed = moment(tp.file.title, "YYYYMMDD", true);
    const anchor = parsed.isValid() ? parsed : moment();
    if (!parsed.isValid()) {
        await tp.file.rename(anchor.format("YYYYMMDD"));
    }
    return anchor;
}

// Formats the label of the containing parent period, e.g. the ISO week a
// daily note falls in (parentLabel(anchor, "isoWeek", "GGGG-[W]WW")), or the
// month a weekly note falls in (parentLabel(weekStart, "month", "YYYY-MMM")).
function parentLabel(anchor, startOfUnit, labelFormat) {
    return anchor.clone().startOf(startOfUnit).format(labelFormat);
}

module.exports = {
    PERIOD_PRESETS,
    resolvePeriod,
    resolveDailyAnchor,
    parentLabel,
};
