# Worksheet and test builder

Built into the index page (`index.html`). Source: `tools/worksheet.js` and `tools/worksheet.css`, inlined by `tools/build_index.py`.
No libraries and no server: it runs from GitHub Pages in the browser.

## Using it

1. In the index, click **+ Worksheet** on any question (organic, AP FRQ, anything that is a question). The header **Worksheet** button shows how many are in.
2. Click **Worksheet** to open the builder.
3. Each question is a box on a US Letter page.
   - Drag the blue **Move** bar to move a box. Drag the round handle at its bottom-right corner to resize; the text and pictures scale together. The + and - buttons do the same in steps.
   - Click into the question or a choice to edit the wording (edits stay in the worksheet, not in the question bank).
   - Free-response boxes have buttons to add answer lines.
   - **Text box** and **Name / date line** add your own text. Drag and resize them the same way.
   - A red outline means a box crosses a page edge, orange means it overlaps another box.
   - **Arrange in list order** stacks the boxes in the order of the list on the left (drag the list or use the arrows to reorder) and moves to new pages as needed. Arrow keys nudge a focused box; Delete removes it.
4. Tick **Add an answer key at the end** for answer pages (with or without explanations).
5. Export:
   - **PDF**: opens the print window; choose "Save as PDF". The PDF is an exact copy of the page layout.
   - **Word**: downloads a .docx with the questions in page order, the edited text and the sizes you set. **It does not keep the exact box positions**; fix the layout in Word if you need to.
6. Worksheets save in the browser automatically. **Save as file** and **Open file** move a worksheet between computers. **New**, **Delete** and the drop-down manage several worksheets.

## Notes for maintainers

- A page is 816 x 1056 px (96 dpi). A box has `x`, `y` in sheet coordinates (page k starts at y = k * 1084) and a scale `s`; its content is laid out at a fixed natural width (700 px) and scaled, which is why resizing scales everything.
- Printing builds a separate print-only copy (`#wsprint`) from the data, uses CSS `zoom` for the scale (a scale transform dropped large pictures from the PDF in Chromium) and falls back to `transform` where `zoom` is not supported. `@page` margin is 0, so browser headers and footers are not printed.
- The Word file is written by hand (a minimal zip writer plus the document XML); it fetches the pictures, so it needs the page served over http(s). Opened as a local file the pictures are left out and a message says so.
- Tested in Chromium (Playwright): adding and removing, reload persistence, editing, resize, drag (also with touch and under zoom), pages, arrange, text boxes, answer key, PDF, Word (opened with python-docx and LibreOffice), file save and open, dark mode, narrow screens. Not tested in Firefox or Safari.
