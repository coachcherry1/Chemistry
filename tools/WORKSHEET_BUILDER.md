# Worksheet and test builder

Built into the index page (`index.html`). Source: `tools/worksheet.js` and `tools/worksheet.css`, inlined by `tools/build_index.py`.
No libraries and no server: it runs from GitHub Pages in the browser.

## Using it

1. In the index, click **+ Worksheet** on any question (organic, AP FRQ, anything that is a question). The header **Worksheet** button shows how many are in.
2. Click **Worksheet** to open the builder.
3. Each question is a box on a US Letter page.
   - Drag the blue **Move** bar to move a box.
   - Sizes are separate controls. Drag the **right edge** of a box to change its width: the text re-wraps and nothing shrinks, so you can make a question narrow enough to sit beside another one. Drag the **bottom edge** to add empty space below it. Drag the **orange square** on a picture to resize only that picture (on multiple choice questions with picture choices it resizes all the choice pictures together). Drag the **round corner** to scale everything (text and pictures) together.
   - The toolbar buttons do the same in steps: - and + scale everything, the arrows make it narrower or wider, the picture buttons resize the picture, and the circular arrow resets the size.
   - Click into the question or a choice to edit the wording (edits stay in the worksheet, not in the question bank).
   - Free-response boxes have buttons to add answer lines.
   - **Text box** and **Name / date line** add your own text. Drag and resize them the same way.
   - A red outline means a box crosses a page edge, orange means it overlaps another box.
   - **Arrange in list order** lays the boxes out in the order of the list, side by side when they are narrow enough, then moves down and onto new pages as needed; it stacks the boxes in the order of the list on the left (drag the list or use the arrows to reorder) and moves to new pages as needed. Arrow keys nudge a focused box; Delete removes it.
4. Tick **Add an answer key at the end** for answer pages (with or without explanations).
5. Export:
   - **PDF**: opens the print window; choose "Save as PDF". The PDF is an exact copy of the page layout.
   - **Word**: downloads a .docx with the questions in page order, the edited text and the sizes you set. **It does not keep the exact box positions or widths** (everything runs down the page); fix the layout in Word if you need to.
6. Worksheets save in the browser automatically. **Save as file** and **Open file** move a worksheet between computers. **New**, **Delete** and the drop-down manage several worksheets.

## Notes for maintainers

- A page is 816 x 1056 px (96 dpi). A box has `x`, `y` in sheet coordinates (page k starts at y = k * 1084), a scale `s`, a width `w` (natural px; default 700 for questions) and optional `minH`, `imgW` and `optW`. Its content is laid out at width `w` and then scaled by `s`, so changing `w` re-wraps the text while changing `s` scales everything; `imgW` and `optW` set the picture widths on their own.
- Printing builds a separate print-only copy (`#wsprint`) from the data, uses CSS `zoom` for the scale (a scale transform dropped large pictures from the PDF in Chromium) and falls back to `transform` where `zoom` is not supported. `@page` margin is 0, so browser headers and footers are not printed.
- The Word file is written by hand (a minimal zip writer plus the document XML); it fetches the pictures, so it needs the page served over http(s). Opened as a local file the pictures are left out and a message says so.
- Tested in Chromium (Playwright): adding and removing, reload persistence, editing, resize, drag (also with touch and under zoom), pages, arrange, text boxes, answer key, PDF, Word (opened with python-docx and LibreOffice), file save and open, dark mode, narrow screens. Not tested in Firefox or Safari.
