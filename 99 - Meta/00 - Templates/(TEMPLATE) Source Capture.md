<%*
    // SOURCE CAPTURE — orchestrator
    // Requires: Templater plugin, with "User Scripts Folder" set to
    // "99 - Meta/02 - Scripts" (Templater settings). Kept outside this
    // Templates folder so the .js files don't show up in the "Insert
    // Template" picker, which scans this folder's contents.
    //
    // Per-type capture logic (prompts/auto-fetch/YAML/body) lives in
    // 02 - Scripts/sourceCapture<Type>.js. Each module returns
    // { noteTitle, yamlFields, body }, or null if the user cancels.
    // Shared prompt/YAML helpers live in 02 - Scripts/sourceCaptureHelpers.js.

    const helpers = tp.user.sourceCaptureHelpers;
    const originalFile = app.workspace.getActiveFile();

    // --- TYPE DEFINITIONS ---

    const TYPE_LABELS = ["Book", "Article", "Paper", "YouTube", "Video", "Podcast", "Tweet", "Thought", "Lecture"];

    const TYPE_ICONS = [
        "📚 Book", "📰 Article", "📜 Paper", "🎥 YouTube", "🎬 Video",
        "🎧 Podcast", "🐦 Tweet", "💭 Thought", "🎓 Lecture"
    ];

    const TYPE_TAGS = {
        Book: "source/book",
        Article: "source/article",
        Paper: "source/paper",
        YouTube: "source/youtube",
        Video: "source/video",
        Podcast: "source/podcast",
        Tweet: "source/tweet",
        Thought: "note/thought",
        Lecture: "source/lecture",
    };

    const TYPE_PREFIX = {
        Book: "{", Article: "(", Paper: "&", YouTube: "+", Video: "+",
        Podcast: "%", Tweet: "!", Thought: "=", Lecture: "§",
    };

    const TYPE_CAPTURERS = {
        Book: tp.user.sourceCaptureBook,
        Article: tp.user.sourceCaptureArticle,
        Paper: tp.user.sourceCapturePaper,
        YouTube: tp.user.sourceCaptureYoutube,
        Video: tp.user.sourceCaptureVideo,
        Podcast: tp.user.sourceCapturePodcast,
        Tweet: tp.user.sourceCaptureTweet,
        Thought: tp.user.sourceCaptureThought,
        Lecture: tp.user.sourceCaptureLecture,
    };

    // --- STEP 1: SELECT TYPE ---

    const typeName = await tp.system.suggester(TYPE_ICONS, TYPE_LABELS, true, "What type of source is this?");
    if (!typeName) { new Notice("Cancelled."); return; }

    const tag = TYPE_TAGS[typeName];
    const prefix = TYPE_PREFIX[typeName];

    // --- STEP 2: COLLECT FIELDS (delegated to the per-type module) ---

    const result = await TYPE_CAPTURERS[typeName](tp, helpers);
    if (!result) return;
    const { noteTitle, yamlFields, body } = result;

    // --- STEP 3: BUILD NOTE ---

    const baseYaml = helpers.buildBaseYaml(tp, { tag, typeName, noteTitle });
    tR = baseYaml + yamlFields + "---\n\n" + body;

    // --- STEP 4: RENAME FILE ---
    // Rename the ORIGINAL note, not whatever file is active now
    // (Lecture capture creates/opens Course/Unit/Person stubs in between).

    if (noteTitle) {
        const clean = noteTitle.replace(/[\\/:*?"<>|#^\[\]]/g, "").trim();
        const newPath = originalFile.parent.path + "/" + prefix + " " + clean + ".md";
        await app.fileManager.renameFile(originalFile, newPath);
    }
%>
