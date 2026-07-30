<%*
    // MOVE SOURCE NOTE — thin adapter.
    //
    // All logic (type resolution, destination lookup, folder creation, the
    // move itself) lives in 02 - Scripts/moveSourceNote.js, where the mocked
    // tp/app test suite can reach it. Keep this file to the one line below.
    //
    // This is an ACTION, not a note template: the <%* %> block emits nothing,
    // so running it inserts no text — it moves the active note out of
    // "00 - Inbox" into its type folder under "01 - Sources".
    //
    // Bind it to a hotkey via Templater -> Settings -> Template Hotkeys, which
    // registers it as a command palette entry. See PLUGINS.md.
    //
    // Requires Templater's "User Scripts Folder" to be set to
    // "99 - Meta/02 - Scripts". After editing any script there, run Templater's
    // "Reload templates" command — it caches loaded user scripts.

    await tp.user.moveSourceNote(tp);
%>
