import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildBlog } from './blog.mjs';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

function safeUrl(value) {
  const url = String(value ?? '').trim();
  if (!url || /[\u0000-\u0020\\]/.test(url)) throw new Error(`Invalid URL: ${url}`);
  if (/^https?:\/\//i.test(url)) {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) throw new Error('URLs must not include credentials.');
    return escape(url);
  }
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(url)) return escape(url);
  if (/^(?:assets|files)\/[a-z0-9_./-]+$/i.test(url) && !url.includes('..')) return escape(url);
  throw new Error(`Use an https URL or a relative assets/ or files/ path: ${url}`);
}

function link(label, url, attributes = '') {
  return url ? `<a href="${safeUrl(url)}"${attributes}>${escape(label)}</a>` : escape(label);
}

function section(id, title, content) {
  return content ? { id, title, html: `<section id="${id}" aria-labelledby="${id}-heading">\n<h2 id="${id}-heading">${title}</h2>\n${content}\n</section>` } : null;
}

function list(items, render) {
  return items?.length ? `<ul>\n${items.map(item => `<li>${render(item)}</li>`).join('\n')}\n</ul>` : '';
}

function publicationGroup(items, heading, aliases) {
  if (!items?.length) return '';
  const sorted = [...items].sort((a, b) => Number(b.year) - Number(a.year) || Number(b.order ?? 0) - Number(a.order ?? 0));
  return `<h3>${heading}</h3>${list(sorted, (paper) => {
    if (!paper.title || !paper.authors?.length || !paper.year) throw new Error('Each publication needs title, authors, and year.');
    const authors = paper.authors.map(author => {
      const name = typeof author === 'string' ? author : author.name;
      const mark = typeof author === 'string' ? '' : author.mark ?? '';
      return `${aliases.includes(name) ? `<strong>${escape(name)}</strong>` : escape(name)}${mark ? `<sup>${escape(mark)}</sup>` : ''}`;
    }).join(', ');
    const links = (paper.links ?? []).map(item => `[${link(item.label, item.url)}]`).join(' ');
    const label = paper.id ? `${escape(paper.id)}. ` : '';
    const venue = [paper.venue, paper.year].filter(Boolean).map(escape).join(', ');
    return `<article class="publication"><div>${label}<span class="paper-title">${link(paper.title, paper.url)}</span></div><div>${authors}</div><div class="venue">${venue}.${paper.status ? ` <span class="status">${escape(paper.status)}</span>` : ''}</div>${paper.note ? `<div class="entry-note">${escape(paper.note)}</div>` : ''}${links ? `<div class="paper-links">${links}</div>` : ''}</article>`;
  })}`;
}

export async function buildSite({ dataPath = resolve(root, 'content/profile.json'), outputPath = resolve(root, 'dist') } = {}) {
  const p = JSON.parse(await readFile(dataPath, 'utf8'));
  for (const key of ['name', 'role', 'biography', 'education']) {
    if (!p[key] || (Array.isArray(p[key]) && !p[key].length)) throw new Error(`Missing required content: ${key}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.updated)) throw new Error('updated must use YYYY-MM-DD.');
  if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) throw new Error('Invalid public email address.');
  const description = `${p.name}${p.chineseName ? ` (${p.chineseName})` : ''} — ${p.role}, ${p.university.name}. ${p.researchInterests.map(item => item.name).join('; ')}.`;
  const sections = [
    section('biography', 'Biography', p.biography.map(paragraph => `<p>${escape(paragraph)}</p>`).join('\n')),
    section('research', 'Research Interests', list(p.researchInterests, item => `${escape(item.name)}${item.description ? `<span class="interest-description">${escape(item.description)}</span>` : ''}`)),
    section('publications', 'Publications', [
      publicationGroup(p.publications.conference, 'Conference Papers', p.authorNames ?? [p.name]),
      publicationGroup(p.publications.journal, 'Journal Papers', p.authorNames ?? [p.name]),
      publicationGroup(p.publications.preprints, 'Preprints', p.authorNames ?? [p.name])
    ].join('\n').trim()),
    section('education', 'Education', list(p.education, item => `<div>${escape(item.degree)}${item.field ? ` in ${escape(item.field)}` : ''}, ${link(item.institution, item.url)}<span class="period">${escape(item.period)}</span></div>${item.note ? `<div class="entry-note">${escape(item.note)}</div>` : ''}`)),
    section('experience', 'Experience', list(p.experience, item => `<div>${escape(item.role)}, ${link(item.organization, item.url)}<span class="period">${escape(item.period)}</span></div>${item.description ? `<div class="entry-note">${escape(item.description)}</div>` : ''}`)),
    section('teaching', 'Teaching', list(p.teaching, item => `<div>${link([item.code, item.title].filter(Boolean).join(' · '), item.url)}<span class="period">${escape(item.period)}</span></div>${item.role ? `<div class="entry-note">${escape(item.role)}</div>` : ''}`)),
    section('awards', 'Awards', list(p.awards, item => `<div>${link(item.title, item.url)}<span class="period">${escape(item.year)}</span></div>${item.description ? `<div class="entry-note">${escape(item.description)}</div>` : ''}`))
  ].filter(Boolean);

  const socialLinks = [
    ...(p.links ?? []),
    ...(p.lab?.url ? [{ label: p.lab.name, url: p.lab.url }] : [])
  ];
  const portrait = p.portrait
    ? `<img class="portrait" src="${safeUrl(p.portrait)}" alt="Portrait of ${escape(p.name)}" width="160" height="200">`
    : `<div class="portrait portrait-monogram" role="img" aria-label="${escape(p.name)} initials"><span>${escape(p.name.split(/\s+/).map(word => word[0]).join(''))}</span></div>`;
  const fullName = `${escape(p.name)}${p.chineseName ? ` <span class="chinese-name" lang="zh-Hans">(${escape(p.chineseName)})</span>` : ''}`;
  const nav = sections.map(item => `<a href="#${item.id}">${item.title}</a>`).join('\n') + '\n<a href="blog/">Blog</a>';
  const schema = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Person', name: p.name, alternateName: p.chineseName, url: p.siteUrl, jobTitle: p.role, affiliation: { '@type': 'CollegeOrUniversity', name: p.university.name, url: p.university.url }, sameAs: (p.links ?? []).filter(item => /^https?:/.test(item.url)).map(item => item.url) }).replace(/</g, '\\u003c');
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escape(description)}">
  <meta name="theme-color" content="#f1f2f3">
  <meta property="og:type" content="profile">
  <meta property="og:title" content="${escape(p.name)} | Academic Homepage">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:url" content="${safeUrl(p.siteUrl)}">
  <title>${escape(p.name)}${p.chineseName ? ` · ${escape(p.chineseName)}` : ''} | Academic Homepage</title>
  <link rel="canonical" href="${safeUrl(p.siteUrl)}">
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="assets/style.css">
  <script type="application/ld+json">${schema}</script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="page">
    <header class="profile" id="top">
      ${portrait}
      <div class="profile-text">
        <h1>${fullName}</h1>
        <p class="role">${escape(p.role)}</p>
        ${p.department?.name ? `<p>${link(p.department.name, p.department.url)}</p>` : ''}
        <p>${link(p.university.name, p.university.url)}</p>
        ${p.program ? `<p class="program">${escape(p.program)}</p>` : ''}
        ${p.advisor?.name ? `<p class="advisor"><span class="label">Advisor:</span> ${link(p.advisor.name, p.advisor.url)}</p>` : ''}
        ${p.email ? `<p><span class="label">Email:</span> ${link(p.email, `mailto:${p.email}`)}</p>` : ''}
        <nav class="profile-links" aria-label="Profile links">${socialLinks.map(item => link(item.label, item.url)).join('<span aria-hidden="true"> / </span>')}</nav>
      </div>
    </header>
    <nav class="section-nav" aria-label="On this page">${nav}</nav>
    <main id="main">${sections.map(item => item.html).join('\n')}</main>
    <footer><span>© ${escape(p.updated.slice(0, 4))} ${escape(p.name)}</span><span>Updated <time datetime="${escape(p.updated)}">${escape(p.updated)}</time></span><a href="#top">Back to top ↑</a></footer>
  </div>
</body>
</html>
`;
  await mkdir(outputPath, { recursive: true });
  await cp(resolve(root, 'public'), outputPath, { recursive: true });
  await writeFile(resolve(outputPath, 'index.html'), html);
  await writeFile(resolve(outputPath, '.nojekyll'), '');
  const posts = await buildBlog({ root, outputPath, profile: p });
  await writeFile(resolve(outputPath, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${p.siteUrl.replace(/\/$/, '')}/sitemap.xml\n`);
  const sitemapEntries = [{ url: p.siteUrl, date: p.updated }, { url: new URL('blog/', p.siteUrl).href, date: p.updated }, ...posts];
  await writeFile(resolve(outputPath, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapEntries.map(item => `<url><loc>${escape(item.url)}</loc><lastmod>${item.date}</lastmod></url>`).join('')}</urlset>\n`);
  console.log(`Built ${sections.length} sections and ${posts.length} blog posts → ${outputPath}`);
  return { html, profile: p, outputPath };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await buildSite();
