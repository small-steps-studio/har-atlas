# Troubleshooting

## The report says the file is not valid

A HAR file is JSON with a top-level `log` object that holds an `entries` array. The report names what is missing. Browsers save HAR files from the network panel with "Save all as HAR" (Chrome, Edge) or "Save All As HAR" (Firefox); a file cut off during saving or copying is not valid JSON. A byte order mark at the start is accepted.

## The file is too large

Reports read files up to the size set in `harAtlas.maxFileSizeMB` (50 MB by default and at most). VS Code passes files only up to 50 MB to extensions, so a larger file cannot be read by any extension: split it, or save a shorter one.

## The preview does not open

The report always opens as a Markdown document. If the preview stays closed, set `harAtlas.openReportsAsPreview` to true and check that the built-in Markdown extension is enabled.

## Pro or the trial does not unlock

Run **HAR Atlas: Show Licence Status**. It tells whether a key is stored, whether it was checked, and how many trial days are left. Details are in [licence.md](licence.md).

## Something else

Run **HAR Atlas: Report A Problem**. It copies a diagnostics block (versions, settings, licence state; no file contents) and opens the issues page.
