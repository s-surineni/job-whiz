# Job Whiz

Chrome extension that auto-fills job applications using your saved profile.

## Features

- Auto-fill LinkedIn Easy Apply forms
- Auto-fill Indeed application forms
- Extensible for custom sites
- Local storage only — your data stays on your machine
- Multiple profile support
- Backup and restore profiles via JSON export/import

## Usage

1. Open the extension popup and fill in your profile details
2. Navigate to a job application on LinkedIn or Indeed
3. Click "Fill Application" in the extension popup
4. Review and submit the form manually

## Development

### Recent fix

- Added support for filling application forms hosted inside same-origin iframes by injecting the fill routine into all accessible frames.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Google Chrome](https://www.google.com/chrome/)

### Setup

```bash
npm install
```

### Run in Development Mode

Start the dev server with hot reload:

```bash
npm run dev
```

This opens a new Chrome window with the extension loaded. Changes to source files will hot-reload automatically.

### Test Hot Reload

1. Run `npm run dev`
2. Click the extension icon to open the popup
3. Edit `entrypoints/popup/style.css` — change the `h1` color to `red`
4. Save the file
5. The popup header color changes instantly without closing/reopening

You can also test with JavaScript — add a `console.log('[HMR test]')` to `entrypoints/popup/main.ts`, save, and check the popup console (right-click popup → Inspect popup → Console).

**Note:** HMR requires the Chrome window opened by `npm run dev`. If you manually load the extension, use `npm run build` and reload instead.

### Build for Production

```bash
npm run build
```

The built extension is output to `.output/chrome-mv3/`.

### Load the Extension Manually

To test the extension in your existing Chrome session:

1. Go to `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `.output/chrome-mv3/` folder from the project directory
5. The extension icon will appear in your toolbar

### Reload After Changes

After making changes, run `npm run build` again, then click the **reload** icon on the extension card in `chrome://extensions/`.

### Debug the Popup

1. Click the extension icon in the toolbar to open the popup
2. Right-click the popup and select **"Inspect popup"**
3. Use the Console tab in DevTools to view logs and errors

### Zip for Distribution

```bash
npm run zip
```

Creates a `.zip` file in `.output/` ready for Chrome Web Store upload.

## Project Structure

```
├── wxt.config.ts                # WXT configuration (manifest overrides)
├── entrypoints/
│   ├── background.ts            # Service worker (onInstalled, badge)
│   ├── content.ts               # Content script (matches https://*/*)
│   └── popup/
│       ├── index.html           # Popup HTML
│       ├── main.ts              # Popup logic
│       └── style.css            # Popup styles
├── utils/
│   ├── storage.ts               # Chrome storage helpers
│   ├── common.ts                # Platform detection, field selectors
│   ├── filler.ts                # Form filling logic
│   └── platforms/
│       ├── indeed.ts            # Indeed-specific selectors
│       └── linkedin.ts          # LinkedIn-specific selectors
└── public/
    └── icons/                   # Extension icons