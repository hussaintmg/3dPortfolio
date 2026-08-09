# Search & answer engine setup — Vectogen

Everything in the code is done, and the verification codes no longer need a
redeploy: they are fields in **Dashboard → Settings → Search Engines**, saved
to the database and rendered into the page head on the next request. What is
left needs an account, and accounts cannot be created from a repo.

## The brand is a good one

Checked 9 August 2026. Unlike the previous name, **Vectogen is effectively
free in software**:

| Holder | Status |
| --- | --- |
| VectoGen Pty Ltd (Australia, animal-vaccine R&D, later absorbed into Imugene) | Deregistered since 2015, no live site |
| A South African registration under the same word | Dormant, no web presence |
| Anything in web development or AI | **Nothing** |

That matters more than it sounds. `Cybogen` collided with a UK IT firm trading
since 1997 — a branded search was unwinnable. A branded search for *Vectogen*
is winnable, and a branded search is the only search a brand-new site can
realistically win in its first months. Everything below is worth more now than
it was before the rename.

The structured data reflects it: `lib/seo.ts` emits an `Organization` node for
Vectogen with the person as its `founder`, so "what is Vectogen" has an answer
an assistant can quote, rather than the name being a stray attribute.

## 1. Google Search Console — do this first

1. Sign in at <https://search.google.com/search-console> and add a **URL
   prefix** property for the live domain (`https://hussainsportfolio.vercel.app`
   today, or the custom domain once there is one).
2. Choose **HTML tag**. Copy the code — pasting the whole `<meta …>` tag is
   fine, only the `content` value is stored.
3. Dashboard → Settings → **Search Engines** → *Google verification code* →
   **Save**. It is live immediately; there is nothing to redeploy.
   *(If Search Console offers only the HTML-file method, paste the
   `googleXXXX.html` filename into the field below it instead — the site
   serves that file from the same setting.)*
4. Press **Verify** in Search Console.
5. Submit `https://<domain>/sitemap.xml` under **Sitemaps**.
6. **URL Inspection → Request indexing** on the home page, once. Google has no
   IndexNow equivalent; this is the only lever that hurries a first crawl.

The **Re-check** button in that panel fetches the real URLs a crawler would
fetch — robots.txt, sitemap.xml, llms.txt, the IndexNow key file and the
verification file — and reports the actual HTTP status of each. "It exists in
the repo" and "it answers 200 on the live domain" are different claims, and
only the second one verifies a site.

## 2. Bing Webmaster Tools

ChatGPT's search runs on Bing's index. A page Bing has not crawled cannot be
cited there, which makes this the higher-leverage of the two consoles.

1. Sign in at <https://www.bing.com/webmasters>.
2. **Import from Google Search Console** carries the verification across and
   skips the rest.
3. Otherwise pick **HTML Meta Tag** and paste the code into Settings →
   Search Engines → *Bing verification code*. The same value is also served at
   `/BingSiteAuth.xml`, so the XML-file method works without extra steps.
4. Submit `https://<domain>/sitemap.xml` under **Sitemaps**.

## 3. Environment variables

All optional now — the dashboard fields take precedence and the env vars are
only a fallback for deployments that already set them.

| Variable | Needed for | Where it comes from |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, sitemap, IndexNow | The live domain, no trailing slash |
| `GOOGLE_SITE_VERIFICATION` | Fallback for the Google tag | Search Console → HTML tag → the `content` value |
| `GOOGLE_VERIFICATION_FILE` | Fallback for the file method | The `googleXXXX.html` filename |
| `BING_SITE_VERIFICATION` | Fallback for the Bing tag | Bing → HTML Meta Tag → the `content` value |
| `INDEXNOW_KEY` | Optional | Only to replace the built-in key |

**Never use `NEXT_PUBLIC_BASE_URL` for public URLs.** It is for internal calls
and once pointed at a retired deployment, which shipped a sitemap full of dead
links.

## 4. IndexNow — already working, nothing to sign up for

Bing, Yandex, Naver and Seznam accept pushed URLs from anyone who can publish a
key file on the host. That file is served at `/indexnow-key.txt`, so
submissions work on the first deploy with no configuration.

- Every project or package created, edited or deleted is submitted
  automatically. Bespoke (custom) packages never are — they belong to one client.
- **Push all URLs to IndexNow** in the Search Engines panel submits the whole
  sitemap by hand; use it after going live or after a domain change.

## 5. The two things code cannot do

**A custom domain.** `hussainsportfolio.vercel.app` will always be an uphill
climb — every other site on that subdomain shares its reputation. With the
name now free, `vectogen.com` (or `.dev` / `.io`) is worth the ~$12/year: it
makes the branded search winnable instead of merely uncontested. Add it under
Vercel → Settings → Domains, set `NEXT_PUBLIC_SITE_URL` to it the same day,
and re-submit the sitemap to both consoles.

**Somewhere to be linked from.** Search engines rank pages other pages vouch
for, and zero inbound links means nothing to weigh. In rough order of effort
against payoff:

- GitHub profile README and every repo's "website" field
- LinkedIn, X and Instagram bios
- A `dev.to` or Hashnode post that links back
- Upwork / Fiverr profile
- Peerlist, Polywork, or an "awesome portfolios" list

## 6. Also worth doing from the dashboard

- **Settings → Meta Description** now shows a live character count. Under 90
  characters it is ignored and the built-in default is used instead; the saved
  one is currently 63.
- The live services heading reads `WHAT I DO // SERVCES` — a typo in saved
  content. Fix it in edit mode; it is a heading a crawler reads.

## What to expect

Indexing takes days to weeks, not hours, and neither console shows useful data
until verification passes. IndexNow shortens the Bing side to roughly a day.
Ranking first for *Vectogen* is a matter of weeks once the site is verified and
linked from two or three places — far quicker than ranking for a common
personal name, which is a matter of months.

## Files involved

| Path | Purpose |
| --- | --- |
| [`lib/seo.ts`](../lib/seo.ts) | Canonical origin, metadata profile, JSON-LD incl. the Vectogen `Organization` |
| [`app/sitemap.ts`](../app/sitemap.ts) | Sitemap, including projects and public packages |
| [`app/robots.ts`](../app/robots.ts) | robots.txt; AI crawlers allowed on purpose |
| [`app/llms.txt/route.ts`](../app/llms.txt/route.ts) | Plain-text brief for answer engines |
| [`lib/indexnow.ts`](../lib/indexnow.ts) | IndexNow key and submission |
| [`app/api/seo/indexnow/route.ts`](../app/api/seo/indexnow/route.ts) | Live status checks + manual submission |
| [`app/api/seo/google-verify/route.ts`](../app/api/seo/google-verify/route.ts) | Serves `/googleXXXX.html` (rewritten there by `proxy.ts`) |
| [`app/BingSiteAuth.xml/route.ts`](../app/BingSiteAuth.xml/route.ts) | Bing's XML-file proof |
| [`Components/dashboard/SeoPanel.tsx`](../Components/dashboard/SeoPanel.tsx) | The Search Engines panel in Settings |
