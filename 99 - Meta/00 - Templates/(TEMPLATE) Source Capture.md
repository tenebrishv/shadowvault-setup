<%*
    // SOURCE CAPTURE — thin adapter.
    //
    // All logic (type picker, type registry, per-type dispatch, note assembly,
    // and the file rename) lives in 02 - Scripts/sourceCaptureOrchestrator.js,
    // where the mocked-tp test suite can reach it. Keep this file to the one
    // line below — anything added here is untestable by definition.
    //
    // Requires Templater's "User Scripts Folder" to be set to
    // "99 - Meta/02 - Scripts". After editing any script there, run Templater's
    // "Reload templates" command — it caches loaded user scripts.

    tR = await tp.user.sourceCaptureOrchestrator(tp);
%>