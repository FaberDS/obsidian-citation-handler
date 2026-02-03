# Obsidian Citation Handler

- [Public Domain](https://citation.schuele.at/)

This project is a quick win for writing scientific papers. It reads obsidian .md files, if they contain exports from Zotero (Annotation tool) they can be used to rephrase (via the Chrome Prompt-API) and provide `Latex` ready snippets including citation.

## Used APIs

- [Chrome Prompt-API](https://developer.chrome.com/docs/ai/prompt-api)
- [Temporal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal)
- [File System API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API)

## Supported

Due to the requirements of Chrome desktop 144 for the Prompt-API, the page requires this to allow any interaction.
