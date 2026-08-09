# Search & answer engine setup

Everything in the code is done. What is left needs an account, and accounts
cannot be created from a repo — these are the steps only the site owner can do.

## Where things actually stand

Checked against the live site on 9 August 2026, searching as a stranger would:

| Search | Result |
| --- | --- |
| `Hussain web developer portfolio` | Not present — nine other Hussains rank |
| `Hussain AI engineer full stack Next.js` | Not present |
| `Cybogen web developer` | Not present; `cybogen.com` (a London IT firm, trading since 1997) owns the name |
| `hussainsportfolio.vercel.app` | Not in the index at all |

robots.txt, sitemap.xml, JSON-LD and llms.txt were all live and correct, so
the blockers are not technical plumbing. They are, in order of how much they
cost:

1. **The site has never been submitted to Google.** No verification code is
   configured, so Search Console cannot be verified and "Request indexing"
   — the only lever that hurries a first crawl — is unavailable. This is
   step 3 below and it is the single biggest one.
2. **A `.vercel.app` subdomain carries no authority of its own.** Every other
   site on the subdomain shares it. A custom domain is the difference between
   competing and not being eligible to compete.
3. **Nothing links to the site.** Search engines rank pages other pages
   vouch for. Zero inbound links means nothing to weigh.

Fixed in code on the same day: the H1 named nobody (`"Designing and building
high-performance web systems."`), the title tag omitted the person's name,
and the meta description was 62 characters.

## 1. Environment variables

| Variable | Needed for | Where it comes from |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, sitemap, IndexNow | The live domain, e.g. `https://hussainsportfolio.vercel.app` — no trailing slash |
| `GOOGLE_SITE_VERIFICATION` | Google Search Console | Search Console → HTML tag method → the `content="…"` value only |
| `BING_SITE_VERIFICATION` | Bing Webmaster Tools | Bing → HTML Meta Tag → the `content="…"` value only |
| `INDEXNOW_KEY` | Optional | Only if replacing the built-in key with one Bing generated |

Paste the value alone, not the whole `<meta>` tag. They must be set in
**Vercel → Project → Settings → Environment Variables**, not only in
`.env.local` — a local file is never read in production.

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

## 3. Google Search Console — do this first

1. Sign in at <https://search.google.com/search-console>, add a URL-prefix
   property for the live domain.
2. Pick the **HTML tag** method, copy the `content` value into
   `GOOGLE_SITE_VERIFICATION` in Vercel, redeploy, then press Verify.
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
curl -X POST https://hussainsportfolio.vercel.app/api/seo/indexnow -b "auth_token=<token>"
```

  A `GET` on the same route reports whether the key file is reachable and
  which verification codes are configured.

## 5. The two things code cannot do

**A custom domain.** `hussainsportfolio.vercel.app` will always be an uphill
climb. Something like `hussain.dev` or `hussaincodes.com` costs roughly $12 a
year, is added under Vercel → Settings → Domains, and immediately makes the
site a candidate rather than a passenger. Set `NEXT_PUBLIC_SITE_URL` to it on
the same day and re-submit the sitemap to both consoles.

**Somewhere to be linked from.** Ranking for a name means being the most
obviously correct answer for it, and search engines learn that from other
sites agreeing. In rough order of effort against payoff:

- GitHub profile README and every repo's "website" field
- LinkedIn, X and Instagram bios
- A `dev.to` or Hashnode post that links back
- Upwork / Fiverr profile
- Peerlist, Polywork, or an "awesome portfolios" list

## 6. Also worth doing from the dashboard

- The live services heading reads `WHAT I DO // SERVCES` — a typo in saved
  content. Fix it in edit mode; it is a heading a crawler reads.
- **Settings → Meta Description** is a good place to put 150 characters that
  actually describe the work. Anything under 90 characters is ignored in
  favour of the built-in default.

## What to expect

Indexing takes days to weeks, not hours, and neither console shows useful data
until verification passes. IndexNow shortens the Bing side to roughly a day.
Ranking first for a common personal name is a matter of months and inbound
links, not of a single deploy. Nothing being in Google today is normal.

## Files involved

| Path | Purpose |
| --- | --- |
| [`lib/seo.ts`](../lib/seo.ts) | Canonical origin, metadata profile, JSON-LD |
| [`app/sitemap.ts`](../app/sitemap.ts) | Sitemap, including projects and public packages |
| [`app/robots.ts`](../app/robots.ts) | robots.txt; AI crawlers allowed on purpose |
| [`app/llms.txt/route.ts`](../app/llms.txt/route.ts) | Plain-text brief for answer engines |
| [`lib/indexnow.ts`](../lib/indexnow.ts) | IndexNow key and submission |
