# JobCruncher

A Chrome extension that saves job listings from LinkedIn and Indeed with one
click, tracks each application's status, and exports the lot as CSV. Everything
stays in the browser.

## Installation

Not on the Chrome Web Store. Load it unpacked:

1. Clone this repo.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and pick the repo folder.
4. Open a job listing on LinkedIn or Indeed. A blue **Save Job** button appears
   on the page.

Manifest V3, no build step and no dependencies: `manifest.json` plus four source
files.

## Usage

**Saving.** Click **Save Job** on any listing under
`linkedin.com/jobs/*` or `indeed.com/*`. On LinkedIn the content script scrapes
the title, company, location, salary, applicant count, education and seniority
requirements, work type, featured benefits, and the hiring contact's name and
profile link, then stores the record with today's date. Indeed publishes less,
so that scraper captures the title, company, location, salary, applicant count
and hiring insight only. Fields the listing does not publish are stored empty
and render as "Not listed" in the sidebar rather than being guessed.

Two things save a job without you asking. Submitting an application on a
supported site files it as **Applied**, and clicking LinkedIn's own Save button
files it as **Saved**.

**Tracking.** The toolbar popup lists every saved job as a compact card that
expands to the full detail set, with a counter reading how many are applied
versus saved. Each card carries a status dropdown: Applied, Saved, Contacted,
No Response, Interviewed, Offer, Rejected. Sort by newest, oldest, salary,
title or company, and filter by source. **Sidebar** injects the same list into
the page you are on, so you can compare a listing against what you already
saved without leaving it.

**Exporting.** **CSV** downloads every field, including the elapsed time since
each application and the current status. **Sheets** downloads the same CSV and
opens the Google Sheets import page in a new tab; the extension sends nothing
to Google, you import the file yourself.

**Clear** deletes everything. So does uninstalling the extension.

## Privacy

Jobs live in `chrome.storage.local` and nowhere else. The extension talks to no
server, has no analytics, and bundles no third-party code. It asks for four
permissions: `storage` to keep your jobs across sessions, `activeTab` to read
the listing you are looking at, `scripting` to inject the button and sidebar,
and `tabs` to open the Sheets import page. Full detail in
[PRIVACY_POLICY.md](PRIVACY_POLICY.md).

## Contributing

Pull requests are welcome. For anything larger than a fix, open an issue first
so the change can be discussed.

There is no test suite. Verify a change by reloading the unpacked extension and
exercising it against a real listing on both sites: save a job, expand the
card, change its status, run both exports, and toggle the sidebar. Site markup
is the usual thing to break, and the two scrapers are independent, so check
both `extractLinkedIn()` and `extractIndeed()` in `content.js` when a selector
stops matching.

## License

[MIT](LICENSE)
