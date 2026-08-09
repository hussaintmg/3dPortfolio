# Search & answer engine setup

Everything in the code is done. What is left needs an account, and accounts
cannot be created from a repo — these are the steps only the site owner can do.

## 1. Environment variables

| Variable | Needed for | Where it comes from |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, sitemap, IndexNow | The live domain, e.g. `https://hussainsportfolio.vercel.app` — no trailing slash |
| `GOOGLE_SITE_VERIFICATION` | Google Search Console | Search Console → HTML tag method → the `content="…"` value only |
| `BING_SITE_VERIFICATION` | Bing Webmaster Tools | Bing → HTML Meta Tag → the `content="…"` value only |
| `INDEXNOW_KEY` | Optional | Only if replacing the built-in key with one Bing generated |

Paste the value alone, not the whole `<meta>` tag.

## 2. Bing Webmaster Tools

ChatGPT's search runs on Bing's index. A page Bing has not crawled cannot be
cited there, which makes this the higher-leverage of the two consoles.

1. Sign in at <https://www.bing.com/webmasters>.
2. Choose **Import from Google Search Console** if Google is already set up —
   it carries the verification across and skips step 3.
3. Otherwise add the site manually, pick **HTML Meta Tag**, copy the `content`
   value into `BING_SITE_VERIFICATION`, redeploy, then press Verify.
   The XML-file method works too: the same variable is served at
   `/BingSiteAuth.xml`.
4. Submit `https://<domain>/sitemap.xml` under **Sitemaps**.

## 3. Google Search Console

1. Sign in at <https://search.google.com/search-console>, add a URL-prefix
   property for the live domain.
2. Pick the **HTML tag** method, copy the `content` value into
   `GOOGLE_SITE_VERIFICATION`, redeploy, then press Verify.
3. Submit `https://<domain>/sitemap.xml`.
4. Use **URL Inspection → Request indexing** on the home page once. Google has
   no IndexNow equivalent, so this is the only way to hurry the first crawl.

## 4. IndexNow — already working, nothing to sign up for

Bing, Yandex, Naver and Seznam accept pushed URLs from anyone who can publish a
key file on the host. That file is served at `/indexnow-key.txt`, so
submissions work on the first deploy with no configuration.

- Every project or package that is created, edited or deleted is submitted
  automatically.
- Bespoke (custom) packages are never submitted — they belong to one client.
- To submit the whole sitemap by hand, signed in as the owner:

```bash
curl -X POST https://<domain>/api/seo/indexnow -b "auth_token=<token>"
```

  A `GET` on the same route reports whether the key file is reachable and
  which verification codes are configured.

Do this once after the first deploy: nothing has changed since launch, so
nothing has pinged yet.

## What to expect

Indexing takes days to weeks, not hours, and neither console shows useful data
until verification passes. IndexNow shortens the Bing side to roughly a day.
Nothing being in Google on launch day is normal, not a fault.

## Files involved

| Path | Purpose |
| --- | --- |
| [`lib/seo.ts`](../lib/seo.ts) | Canonical origin, metadata profile, JSON-LD |
| [`app/sitemap.ts`](../app/sitemap.ts) | Sitemap, including projects and public packages |
| [`app/robots.ts`](../app/robots.ts) | robots.txt; AI crawlers allowed on purpose |
| [`app/llms.txt/route.ts`](../app/llms.txt/route.ts) | Plain-text brief for answer engines |
| [`lib/indexnow.ts`](../lib/indexnow.ts) | IndexNow key and submission |
