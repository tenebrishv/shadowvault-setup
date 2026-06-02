<%*
    // SOURCE CAPTURE - Smart guided input template
    // Requires: Templater plugin
    // Place in: 99 - Meta/00 - Templates/
    
    // --- HELPERS ---

    async function required_prompt(label) {
        let val = "";
        while (!val) {
            val = await tp.system.prompt("REQUIRED: " + label);
            if (val === null) { new Notice("Cancelled."); return null; }
            val = val.trim();
            if (!val) new Notice("This field is required.", 2000);
        }
        return val;
    }

async function optional_prompt(label) {
    const hint = label + "  (Enter to skip)";
    const val = await tp.system.prompt(hint);
    if (val === null) return null;
    return val.trim();
}

async function date_prompt(label) {

    const val = await optional_prompt(label + "  e.g. 2024  or  2024-06  or  2024-06-15");
    if (!val) return "";
    const ok = /^\d{4}(-\d{2}(-\d{2})?)?$/.test(val);
    if (!ok) new Notice("Date should be YYYY, YYYY-MM, or YYYY-MM-DD", 3000);
    return val;
}

const originalFile = app.workspace.getActiveFile();

// --- SOURCE TYPE DEFINITIONS ---

const TYPE_LABELS = [
    "Book",
    "Article",
    "Paper",
    "YouTube",
    "Video",
    "Podcast",
    "Tweet",
    "Thought",
    "Lecture"
];

const TYPE_TAGS = {
    "Book": "source/book",
    "Article": "source/article",
    "Paper": "source/paper",
    "YouTube": "source/youtube",
    "Video": "source/video",
    "Podcast": "source/podcast",
    "Tweet": "source/tweet",
    "Thought": "note/thought",
    "Lecture": "source/lecture"
};

const TYPE_PREFIX = {
    "Book": "{",
    "Article": "(",
    "Paper": "&",
    "YouTube": "+",
    "Video": "+",
    "Podcast": "%",
    "Tweet": "!",
    "Thought": "=",
    "Lecture": "§"
};


// --- STEP 1: SELECT TYPE ---
const TYPE_ICONS = [
    "📚 Book",
    "📰 Article",
    "📜 Paper",
    "🎥 YouTube",
    "🎬 Video",
    "🎧 Podcast",
    "🐦 Tweet",
    "💭 Thought",
    "🎓 Lecture"
];

const selectedIcon = await tp.system.suggester(TYPE_ICONS, TYPE_LABELS, true, "What type of source is this?");

if (!selectedIcon) { new Notice("Cancelled."); return; }

const typeName = selectedIcon;
const tag = TYPE_TAGS[typeName];
const prefix = TYPE_PREFIX[typeName];

// --- STEP 2: COLLECT FIELDS ---

let data = {};
let noteTitle = "";

if (typeName === "Book") {
    data.isbn = await optional_prompt("ISBN (if you have it)");
    if (data.isbn) {
        try {
            const res = await fetch(`https://openlibrary.org/isbn/${encodeURIComponent(data.isbn)}.json`);
            if (!res.ok) throw new Error("Not found");
            const info = await res.json();
            data.title = info.title || "";
            data.authors = info.authors ? info.authors.map(a => a.name).join(", ") : "";
            data.publisher = info.publishers ? info.publishers[0] : "";
            data.publish_date = info.publish_date || "";
            // Open Library doesn't give a general subject, so keep it empty for now
            data.general_subject = "";
            noteTitle = data.title;
            new Notice("Fetched book data from ISBN", 2000);
        } catch (e) {
            new Notice("ISBN lookup failed. Enter details manually.", 3000);
        }
    }

    // Manual fallback if no title was fetched
    if (!data.title) {
        data.title = await required_prompt("Book Title");
        if (!data.title) return;
        data.authors = await required_prompt("Author(s)");
        if (!data.authors) return;
        data.publish_date = await date_prompt("Year Published");
        data.publisher = await optional_prompt("Publisher");
        data.general_subject = await optional_prompt("General Subject");
        noteTitle = data.title;
    } else {
        // Fill in fields that Open Library didn't provide (if any)
        data.general_subject = data.general_subject || await optional_prompt("General Subject");
        data.publish_date = data.publish_date || await date_prompt("Year Published (if missing)");
    }
    data.specific_subject = await optional_prompt("Specific Subject"); // always ask

}

else if (typeName === "Article") {
    data.url = await required_prompt("Article URL");
    if (!data.url) return;
    // Try automatic metadata
    try {
        const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(data.url)}`);
        const meta = await res.json();
        if (meta.status === "success") {
            data.title = meta.data.title || "";
            data.authors = meta.data.author || "";
            data.publication = meta.data.publisher || "";
            // note: date may not be reliable; still ask if needed
            noteTitle = data.title;
            new Notice("Fetched article metadata", 2000);
        } else throw new Error("No data");
    } catch (e) {
        // fallback to manual
        data.title = await required_prompt("Article Title (auto-fetch failed)");
        if (!data.title) return;
        data.authors = await optional_prompt("Author(s)");
        data.publication = await optional_prompt("Publication / Site name");
        noteTitle = data.title;
    }
    // date is tricky to auto‑parse, so keep the manual date prompt after the block
    data.publish_date = await date_prompt("Date Published");

}


else if (typeName === "Paper") {
    data.doi = await optional_prompt("DOI (e.g. 10.1000/xyz123)");
    if (data.doi) {
        try {
            const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(data.doi)}`);
            const json = await res.json();
            const msg = json.message;
            data.title = msg.title ? msg.title[0] : "";
            data.authors = msg.author ? msg.author.map(a => a.given + " " + a.family).join(", ") : "";
            data.publish_date = msg.created ? msg.created["date-parts"][0][0].toString() : "";
            data.publisher = msg.publisher || "";
            data.keywords = msg.subject ? msg.subject.join(", ") : "";
            data.abstract = msg.abstract || "";
            noteTitle = data.title;
            new Notice("Fetched paper metadata from DOI", 2000);
        } catch (e) {
            new Notice("DOI lookup failed. Enter details manually.", 3000);
        }
    }

    // If no title, fallback to manual
    if (!data.title) {
        data.title = await required_prompt("Paper Title");
        if (!data.title) return;
        data.authors = await required_prompt("Author(s)");
        if (!data.authors) return;
        data.doi = data.doi || await optional_prompt("DOI");
        data.publish_date = await date_prompt("Year Published");
        data.keywords = await optional_prompt("Keywords");
        data.abstract = await optional_prompt("Abstract");
        noteTitle = data.title;
    } else {
        // fill optional fields if not from DOI
        data.keywords = data.keywords || await optional_prompt("Keywords (comma-separated)");
        data.abstract = data.abstract || await optional_prompt("Abstract (brief)");
    }

}

else if (typeName === "YouTube") {
    data.url = await required_prompt("YouTube URL");
    if (!data.url) return;
    try {
        const res = await fetch("https://youtube.com/oembed?url=" + data.url + "&format=json");
        const yt = await res.json();
        data.yt_title = yt.title;
        data.yt_channel = yt.author_name;
        data.yt_chanurl = yt.author_url;
        data.yt_thumb = yt.thumbnail_url;
        const idMatch = /(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/.exec(data.url);
        data.yt_id = idMatch ? idMatch[1] : "";
        noteTitle = yt.title.replace(/[:"#^|[\]\\\/]/g, "").trim();
        new Notice("Fetched: " + yt.title, 2000);
    } catch (e) {
        new Notice("Could not auto-fetch YouTube data. Fill manually.", 3000);
        data.yt_title = await required_prompt("Video Title (auto-fetch failed)");
        if (!data.yt_title) return;
        data.yt_channel = await optional_prompt("Channel Name");
        data.yt_chanurl = "";
        data.yt_thumb = "";
        data.yt_id = "";
        noteTitle = data.yt_title.replace(/[:"#^|[\]\\\/]/g, "").trim();
    }

}



else if (typeName === "Video") {
    data.title = await required_prompt("Video Title");
    if (!data.title) return;
    data.source = await optional_prompt("Platform / Source  e.g. Vimeo, Nebula");
    data.channel = await optional_prompt("Channel / Creator");
    data.url = await optional_prompt("URL");
    data.released = await date_prompt("Release Date");
    noteTitle = data.title;
}

else if (typeName === "Podcast") {
    data.title = await required_prompt("Episode Title");
    if (!data.title) return;
    data.host = await optional_prompt("Host");
    data.guest = await optional_prompt("Guest(s)");
    data.url = await optional_prompt("Episode URL");
    data.publish_date = await date_prompt("Date Published");
    data.general_subject = await optional_prompt("Subject / Topic");
    noteTitle = data.title;
}

else if (typeName === "Tweet") {
    data.url = await required_prompt("Tweet URL");
    if (!data.url) return;
    let autoFetched = false;
    try {
        const res = await fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(data.url)}`);
        const tw = await res.json();
        data.account = tw.author_name.replace(/^@/, "");
        data.tweet_text = tw.title;              // plain‑text tweet content
        autoFetched = true;
        new Notice("Fetched tweet metadata", 2000);
    } catch (e) {
        new Notice("Could not auto-fetch tweet data. Enter manually.", 3000);
    }

    if (!autoFetched) {
        data.account = await required_prompt("Account (@handle)");
        if (!data.account) return;
        data.tweet_text = await optional_prompt("Tweet text (for reference)");
    }

    data.keywords = await optional_prompt("Keywords / Topics");
    data.publish_date = await date_prompt("Tweet Date");

    // Clean the note‑title (remove any forbidden chars and newlines)
    noteTitle = (data.account + " — " + tp.date.now("YYYY-MM-DD"))
        .replace(/[\\/:*?"<>|#^\[\]]/g, "")
        .replace(/\n/g, " ")
        .trim();
}

else if (typeName === "Thought") {
    data.title = await required_prompt("Thought title - one sentence claim or question");
    if (!data.title) return;
    data.context = await optional_prompt("Relevant context");
    data.led_here = await optional_prompt("What led me here?");
    noteTitle = data.title;
}

// ==================== NEW LECTURE BLOCK ====================

else if (typeName === "Lecture") {
    const COURSE_FOLDER = "04 - MOCs/Courses";
    const UNIT_FOLDER = "04 - MOCs/Units";
    const PEOPLE_FOLDER = "09 - Agents/People";
    
    async function getNotesInFolder(folderPath) {
        const folder =
            app.vault.getAbstractFileByPath(folderPath);
        if (!folder || !folder.children)
            return [];
        return folder.children.filter(
            file => file.extension === "md"
        );
    }

    async function createStub(path, content) {
        const existing =
            app.vault.getAbstractFileByPath(path);
        if (!existing) {
            await app.vault.create(path, content);
        }
    }
    
    async function pickOrCreate(label, existingItems) {
        const choices = [
            ...existingItems.sort(),
            "➕ Create New"
        ];
        const picked =
            await tp.system.suggester(
                choices,
                choices,
                false,
                label
            );
        if (!picked) return null;
        if (picked !== "➕ Create New")
            return picked;
        return await required_prompt(
            `New ${label}`
        );
    }
    // =====================
    // COURSE
    // =====================
    const courseFiles =
        await getNotesInFolder(
            COURSE_FOLDER
        );
    const courseNames =
        courseFiles.map(
            f => f.basename
        );
    data.course =
        await pickOrCreate(
            "Course",
            courseNames
        );
    if (!data.course) return;
    const coursePath =
`${COURSE_FOLDER}/${data.course}.md`;

    await createStub(
        coursePath,
`---
tags:
  - course
aliases:
  - "${data.course}"
created: ${tp.date.now("YYYY-MM-DDTHH:mm")}
default_lecturer:
---

# ${data.course}

## Units

\`\`\`dataview
LIST
FROM #course-unit
WHERE contains(course, this.file.link)
SORT file.name ASC
\`\`\`

## Core Concepts

`
    );

    // =====================
    // UNIT
    // =====================

    const unitFiles =
        await getNotesInFolder(
            UNIT_FOLDER
        );

    const matchingUnits =
        unitFiles.filter(file => {

            const cache =
                app.metadataCache
                .getFileCache(file);

            const courseField =
                cache?.frontmatter?.course;

            if (!courseField)
                return false;

            return String(courseField)
                .replaceAll("[[","")
                .replaceAll("]]","")
                .includes(data.course);

        });

    const unitNames =
        matchingUnits.map(
            f => f.basename
        );

    data.unit =
        await pickOrCreate(
            "Unit",
            unitNames
        );

    if (!data.unit) return;

    const unitPath =
`${UNIT_FOLDER}/${data.unit}.md`;

    await createStub(
        unitPath,
`---
tags:
  - course-unit
course: "[[${data.course}]]"
aliases:
  - "${data.unit}"
created: ${tp.date.now("YYYY-MM-DDTHH:mm")}
---

# ${data.unit}

## Lectures

\`\`\`dataview
LIST
FROM #source/lecture
WHERE contains(unit, [[]])
SORT date_given ASC
\`\`\`

## Core Concepts

`
    );

    // =====================
    // LECTURER
    // =====================

    let defaultLecturer = "";

    const courseFile =
        app.vault.getAbstractFileByPath(
            coursePath
        );

    if (courseFile) {

        const cache =
            app.metadataCache
            .getFileCache(courseFile);

        defaultLecturer =
            cache?.frontmatter
            ?.default_lecturer || "";
    }

    const peopleFiles =
        await getNotesInFolder(
            PEOPLE_FOLDER
        );

    let peopleNames =
        peopleFiles.map(
            f => f.basename
        );

    if (
        defaultLecturer &&
        !peopleNames.includes(
            defaultLecturer
        )
    ) {
        peopleNames.unshift(
            defaultLecturer
        );
    }

    data.lecturer =
        await pickOrCreate(
            "Lecturer",
            peopleNames
        );

    if (!data.lecturer) return;

    const personPath =
`${PEOPLE_FOLDER}/${data.lecturer}.md`;

    await createStub(
        personPath,
`---
tags:
  - person
aliases:
  - "${data.lecturer}"
created: ${tp.date.now("YYYY-MM-DDTHH:mm")}---

# ${data.lecturer}

> [!info]- About
> Role:
> Organisation:
> Contact:
> Website:

## Notes

-

## Related

\`\`\`dataview
LIST
FROM [[]] AND !#person
SORT file.name ASC
\`\`\`
`
    );

    // =====================
    // LECTURE DETAILS
    // =====================

    data.title =
        await required_prompt(
            "Lecture Title"
        );

    if (!data.title) return;

    data.lecture_num =
        await optional_prompt(
            "Lecture Number"
        );

    data.date_given =
        await date_prompt(
            "Lecture Date"
        );

    data.url =
        await optional_prompt(
            "Recording URL"
        );

    data.keywords =
        await optional_prompt(
            "Keywords"
        );

    noteTitle = data.title;
}

// ==================== END NEW LECTURE BLOCK ====================

// --- STEP 3: RENAME FILE ---


// if (noteTitle) {

   //) const clean = noteTitle.replace(/[\\/:*?"<>|#^\[\]]/g, "").trim();

    //await tp.file.rename(prefix + " " + clean);

//}



// --- STEP 4: BUILD YAML ---



const today = tp.date.now("YYYY-MM-DDTHH:mm");



function yf(key, val) {

    if (val) return key + ": \"" + val + "\"\n";

    return key + ":\n";

}



let yaml = "---\n";

yaml += "tags: " + tag + "\n";

yaml += "publish: true\n";

yaml += "aliases:\n  - \"" + (noteTitle || "") + "\"\n";

yaml += "created: " + today + "\n";

const id = tp.date.now("YYYYMMDDHHmm");

const reviewDate = tp.date.now("YYYY-MM-DD", 14);

let typeField = "source";                // default for all captured inputs
if (typeName === "Thought") {
    typeField = "thought";                // only thoughts are not "source"
}
yaml += "id: " + id + "\n";

yaml += "type: " + typeField + "\n";

yaml += "review: " + reviewDate + "\n";

yaml += "status: inbox\n";   // every captured note starts as inbox

yaml += "growth: seedling\n";



if (typeName === "Book") {

    yaml += yf("authors", data.authors);

    yaml += yf("publish_date", data.publish_date);

    yaml += yf("publisher", data.publisher);

    yaml += yf("isbn", data.isbn);

    yaml += yf("general_subject", data.general_subject);

    yaml += yf("specific_subject", data.specific_subject);

}

else if (typeName === "Article") {

    yaml += yf("authors", data.authors);

    yaml += yf("url", data.url);

    yaml += yf("publication", data.publication);

    yaml += yf("publish_date", data.publish_date);

}

else if (typeName === "Paper") {

    yaml += yf("authors", data.authors);

    yaml += yf("doi", data.doi);

    yaml += yf("citekey", data.citekey);

    yaml += yf("url", data.url);

    yaml += yf("publish_date", data.publish_date);

    yaml += yf("keywords", data.keywords);

    yaml += yf("general_subject", data.general_subject);

}

else if (typeName === "YouTube") {

    yaml += yf("channel", data.yt_channel);

    yaml += yf("url", data.url);

    yaml += "watched: \"" + tp.date.now("YYYY-MM-DD") + "\"\n";

    yaml += "released:\n";

}

else if (typeName === "Video") {

    yaml += yf("source", data.source);

    yaml += yf("channel", data.channel);

    yaml += yf("url", data.url);

    yaml += yf("released", data.released);

    yaml += "watched: \"" + tp.date.now("YYYY-MM-DD") + "\"\n";

}

else if (typeName === "Podcast") {

    yaml += yf("host", data.host);

    yaml += yf("guest", data.guest);

    yaml += yf("url", data.url);

    yaml += yf("publish_date", data.publish_date);

    yaml += yf("general_subject", data.general_subject);

}

else if (typeName === "Tweet") {
    yaml += yf("account", data.account);
    yaml += yf("url", data.url);
    yaml += yf("keywords", data.keywords);
    yaml += yf("publish_date", data.publish_date);
    if (data.tweet_text) {
        // Escape double quotes inside the tweet text
        const safeText = data.tweet_text.replace(/"/g, '\\"');
        yaml += `tweet_text: "${safeText}"\n`;
    }
}

else if (typeName === "Thought") {

    yaml += yf("context", data.context);

    yaml += yf("led_here", data.led_here);

}

else if (typeName === "Lecture") {

    yaml += `course: "[[${data.course}]]"\n`;

    yaml += `unit: "[[${data.unit}]]"\n`;

    yaml += `lecturer: "[[${data.lecturer}]]"\n`;

    yaml += yf(
        "lecture_num",
        data.lecture_num
    );

    yaml += yf(
        "date_given",
        data.date_given
    );

    yaml += yf(
        "url",
        data.url
    );

    yaml += yf(
        "keywords",
        data.keywords
    );
}

yaml += "---\n\n";



// --- STEP 5: BUILD NOTE BODY ---

let body = "";

if (noteTitle) {
    body += `# ${noteTitle}\n\n`;
}


if (typeName === "Book") {

    body = "> [!meta]- Metadata\n> citation::\n\n";

    body += "## Notes\n\n- \n\n";

    body += "> [!summary] Summary of Key Points\n> - \n\n";

    body += "> [!context]\n> %%How this relates to other work%%\n> - \n\n";

    body += "> [!significance]\n> %%Why this matters to me%%\n> - \n\n";

    body += "> [!related] Cited References\n> - \n";

}



else if (typeName === "Article") {

    body = "> [!meta]- Metadata\n";

    body += "> source:: [" + data.title + "](" + data.url + ")\n";

    if (data.authors) body += "> authors:: " + data.authors + "\n";

    if (data.publication) body += "> publication:: " + data.publication + "\n";

    if (data.publish_date) body += "> published:: " + data.publish_date + "\n";

    body += "\n---\n\n- \n";

}



else if (typeName === "Paper") {

    body = "> [!abstract]\n> " + (data.abstract || "") + "\n\n";

    body += "> [!hypothesis]\n> hypothesis::\n\n";

    body += "> [!methodology]\n> methodology::\n\n";

    body += "> [!result] Result(s)\n> results::\n\n";

    body += "> [!summary] Summary of Key Points\n> summary::\n\n";

    body += "## Notes\n\n";

    body += "| Highlight | Meaning |\n";

    body += "| --- | --- |\n";

    body += "| Orange | Important point by author |\n";

    body += "| Green  | Important to me |\n";

    body += "| Red    | Disagree with author |\n";

    body += "| Purple | Follow-up needed |\n";

    body += "| Blue   | Notes added later |\n\n";

    body += "- \n\n";

    body += "> [!context]\n> context::\n\n";

    body += "> [!significance]\n> significance::\n";

}



else if (typeName === "YouTube") {

    body = "> [!meta]- Metadata\n";

    body += "> source:: [" + data.yt_title + "](" + data.url + ")\n";

    body += "> channel:: [" + data.yt_channel + "](" + data.yt_chanurl + ")\n";

    body += "> released::\n";

    body += "> watched:: " + tp.date.now("YYYY-MM-DD") + "\n";

    if (data.yt_thumb) body += "> thumbnail:: ![](" + data.yt_thumb + ")\n";

    body += "\n---\n\n";

    if (data.yt_id) {

        body += "<iframe src=\"https://www.youtube-nocookie.com/embed/" + data.yt_id + "?vq=hd1080&modestbranding=1&rel=0&iv_load_policy=3\" width=\"569\" height=\"317\" frameborder=\"0\" style=\"margin: 0 auto; display: block;\"></iframe>\n\n";

    }

    body += "---\n\n## Notes\n\n";

    body += "%% [mm:ss](" + data.url + "?t=0) - Timestamp note %%\n\n- \n";

}



else if (typeName === "Video") {

    body = "> [!meta]- Metadata\n";

    body += "> source:: " + (data.url || "") + "\n";

    body += "> channel:: " + (data.channel || "") + "\n";

    body += "> platform:: " + (data.source || "") + "\n";

    body += "> released:: " + (data.released || "") + "\n";

    body += "> watched:: " + tp.date.now("YYYY-MM-DD") + "\n\n";

    body += "---\n\n- \n";

}



else if (typeName === "Podcast") {

    body = "> [!meta]- Metadata\n";

    body += "> host:: " + (data.host || "") + "\n";

    body += "> guest:: " + (data.guest || "") + "\n";

    body += "> url:: " + (data.url || "") + "\n";

    body += "> published:: " + (data.publish_date || "") + "\n\n";

    body += "---\n\n## Notes\n\n";

    body += "%% [mm:ss](" + (data.url || "url") + "?t=0) - Timestamp note %%\n\n- \n";

}



else if (typeName === "Tweet") {
    // Tweet text as a blockquote (always works, searchable, offline)
    if (data.tweet_text) {
        body += `> [!quote] Tweet\n> ${data.tweet_text}\n\n`;
    } else {
        body += `> [!quote] Tweet\n> *(text not available)*\n\n`;
    }

    // Link to the original tweet (opens in browser)
    body += `🔗 [Open original tweet](${data.url})\n\n`;

    body += "---\n\n## Notes\n\n- \n";
}

else if (typeName === "Thought") {

    body = "## The Thought\n\n- \n\n";

    body += "### TL;DR\n\n- \n\n";

    body += "### Chew On It\n\n- \n\n";

    body += "### Refined\n\n- \n\n";

    body += "## Relevant Context\n\n" + (data.context || "- ") + "\n\n";

    body += "## What Led Me Here\n\n" + (data.led_here || "- ") + "\n";

}

else if (typeName === "Lecture") {

    body += `> [!meta]- Metadata\n`;
    body += `> Course:: [[${data.course}]]\n`;
    body += `> Unit:: [[${data.unit}]]\n`;
    body += `> Lecturer:: [[${data.lecturer}]]\n`;

    if (data.date_given)
        body += `> Date:: ${data.date_given}\n`;

    if (data.lecture_num)
        body += `> Lecture:: ${data.lecture_num}\n`;

    if (data.url)
        body += `> Recording:: ${data.url}\n`;

    body += `\n---\n\n`;

    body += `# Learning Objectives\n\n`;
    body += `- \n\n`;

    body += `# Pre-Lecture Notes\n\n`;
    body += `- \n\n`;

    body += `# In-Lecture Notes\n\n`;
    body += `- \n\n`;

    body += `# Key Concepts\n\n`;
    body += `| Concept | Explanation |\n`;
    body += `|----------|-------------|\n`;
    body += `| | |\n\n`;

    body += `# Questions Raised\n\n`;
    body += `- \n\n`;

    body += `# Follow-Up Tasks\n\n`;
    body += `- [ ] Review lecture\n`;
    body += `- [ ] Extract permanent notes\n`;
    body += `- [ ] Update MOCs\n\n`;

    body += `---\n\n`;

    body += `# Extracted Permanent Notes\n\n`;

    body += "```dataview\n";
    body += "LIST\n";
    body += "FROM [[]] AND !#source\n";
    body += "SORT file.name ASC\n";
    body += "```\n\n";

    body += `---\n\n`;

    body += `# Related Lectures\n\n`;

    body += "```dataview\n";
    body += "LIST\n";
    body += `FROM #source/lecture\n`;
    body += `WHERE contains(course, [[${data.course}]])\n`;
    body += `AND file.name != this.file.name\n`;
    body += `SORT date_given ASC\n`;
    body += "```\n";
}



tR = yaml + body;

// Rename the ORIGINAL lecture note,
// not whatever file is active now.

if (noteTitle) {

    const clean =
        noteTitle
        .replace(/[\\/:*?"<>|#^\[\]]/g, "")
        .trim();

    const newPath =
        originalFile.parent.path +
        "/" +
        prefix +
        " " +
        clean +
        ".md";

    await app.fileManager.renameFile(
        originalFile,
        newPath
    );
}
%>