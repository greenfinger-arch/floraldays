const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { marked } = require('marked');

const SITE_URL = 'https://floraldays.com';
const ROOT_DIR = __dirname;
const POSTS_DIR = path.join(ROOT_DIR, 'posts');

const CATEGORY_MAP = {
  '나무의사·국가자격증 스터디': 'study',
  '수목진료 및 병해충 실무 SOP': 'sop',
  '식물 트렌드 & 스마트 가드닝': 'trend',
  '홈가드닝 & 반려식물 클리닉': 'homecare',
  '도시숲, 생태 및 나무 인문학': 'ecostory'
};

const CATEGORY_PAGES = [
  'study.html',
  'sop.html',
  'trend.html',
  'homecare.html',
  'ecostory.html'
];

marked.setOptions({ gfm: true, breaks: true });

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { meta: {}, body: raw.trim() };
  }
  const meta = yaml.load(match[1]) || {};
  const body = (match[2] || '').trim();
  return { meta, body };
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cleanMarkdownFormatting(html) {
  if (!html) return '';
  return html
    .replace(/\*\s*["'“‘]\s*\*\*(.*?)\*\*\s*["'”’]\s*\*/g, '<em>"$1"</em>')
    .replace(/(["'“‘])\s*\*\*(.*?)\*\*\s*(["'”’])/g, '$1<strong>$2</strong>$3')
    .replace(/\*\*\s*(["'“‘].*?["'”’])\s*\*\*/g, '<strong>$1</strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

function calculateReadingTime(text) {
  const cleanText = text.replace(/<[^>]*>?/gm, '');
  const minutes = Math.ceil(cleanText.length / 200);
  return minutes < 1 ? 1 : minutes;
}

function normalizeThumbnail(thumb) {
  if (!thumb) return `${SITE_URL}/images/logo.png`;
  if (thumb.startsWith('http://') || thumb.startsWith('https://')) return thumb;
  return `${SITE_URL}${thumb.startsWith('/') ? '' : '/'}${thumb}`;
}

function renderPillarHtml(pillarArticle) {
  if (!pillarArticle) return '';
  const thumb = escapeHtml(normalizeThumbnail(pillarArticle.thumbnail));
  const title = escapeHtml(pillarArticle.title);
  const summary = escapeHtml(pillarArticle.summary);
  const dateStr = escapeHtml(pillarArticle.dateStr);
  const url = `/${encodeURIComponent(pillarArticle.slug)}`;

  return `
    <article class="info-card pillar-card" style="margin-bottom: 32px;">
      <div class="card-image">
        <span class="badge" style="background-color: var(--accent);">EXPERT INSIGHT</span>
        <img src="${thumb}" alt="${title}" loading="lazy">
      </div>
      <div class="card-body">
        <h2 class="card-title" style="font-size: 1.4rem; font-weight: 800; color: #ffffff;">
          <a href="${url}">${title}</a>
        </h2>
        <p class="card-text" style="color: rgba(255,255,255,0.9);">${summary}</p>
        <div class="card-meta" style="border-top-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.8);">
          <span>${dateStr}</span>
          <a href="${url}" class="read-more" style="color: #ffffff; font-weight: 700;">전체 가이드 읽기 &rarr;</a>
        </div>
      </div>
    </article>
  `.trim();
}

function renderCardsHtml(articles) {
  if (!articles.length) {
    return '<p style="grid-column: 1 / -1; color: var(--text-muted); padding: 40px 0; text-align: center;">등록된 기사가 곧 업데이트될 예정입니다.</p>';
  }

  return articles.map(article => {
    const thumb = escapeHtml(normalizeThumbnail(article.thumbnail));
    const title = escapeHtml(article.title);
    const category = escapeHtml(article.category);
    const summary = escapeHtml(article.summary);
    const dateStr = escapeHtml(article.dateStr);
    const url = `/${encodeURIComponent(article.slug)}`;

    return `
      <article class="info-card">
        <div class="card-image">
          <span class="badge badge-green">${category}</span>
          <img src="${thumb}" alt="${title}" loading="lazy">
        </div>
        <div class="card-body">
          <h3 class="card-title">
            <a href="${url}">${title}</a>
          </h3>
          <p class="card-text">${summary}</p>
          <div class="card-meta">
            <span>${dateStr}</span>
            <a href="${url}" class="read-more">자세히 보기 &rarr;</a>
          </div>
        </div>
      </article>
    `.trim();
  }).join('\n');
}

function injectIntoSlot(htmlContent, id, innerHtml) {
  const pattern = new RegExp(`(<[^>]+id=["']${id}["'][^>]*>)[\\s\\S]*?(</[a-zA-Z0-9]+>)`);
  if (!pattern.test(htmlContent)) return htmlContent;
  return htmlContent.replace(pattern, `$1\n${innerHtml}\n$2`);
}

function buildArticlePage(templateHtml, article) {
  const canonicalUrl = `${SITE_URL}/${article.slug}`;
  const fullTitle = `${article.title} - 플로럴데이즈 (Floraldays)`;
  const description = article.summary || article.title;
  const ogImage = normalizeThumbnail(article.thumbnail);
  const categoryName = article.category || '기타';
  const categoryUrl = article.categoryKey
    ? `${SITE_URL}/${article.categoryKey}.html`
    : `${SITE_URL}/`;

  let htmlBody = marked.parse(article.body);
  htmlBody = cleanMarkdownFormatting(htmlBody);
  htmlBody = htmlBody.replace(/<img(?![^>]*loading=)/g, '<img loading="lazy"');

  const readingTime = calculateReadingTime(article.body);
  const articleMainHtml = `
    <article class="article-header">
      <span class="article-category">${escapeHtml(categoryName)}</span>
      <h1 class="article-title">${escapeHtml(article.title)}</h1>
      <div class="article-meta-info">
        <span>발행일: ${escapeHtml(article.dateStr)}</span>
        <span>•</span>
        <span>플로럴데이즈 편집국</span>
        <span>•</span>
        <span>소요 시간 약 ${readingTime}분</span>
      </div>
    </article>
    ${article.thumbnail ? `<img src="${escapeHtml(normalizeThumbnail(article.thumbnail))}" class="article-thumb" alt="${escapeHtml(article.title)}">` : ''}
    <div class="article-body">
      ${htmlBody}
    </div>
  `.trim();

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsArticle',
        headline: article.title,
        description,
        image: article.thumbnail ? [ogImage] : [],
        datePublished: article.dateStr,
        author: {
          '@type': 'Organization',
          name: '플로럴데이즈',
          url: SITE_URL
        }
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '홈', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: categoryName, item: categoryUrl },
          { '@type': 'ListItem', position: 3, name: article.title, item: canonicalUrl }
        ]
      }
    ]
  });

  const seoHeadTags = `
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonicalUrl}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="플로럴데이즈 (Floraldays)">
  <meta property="og:title" content="${escapeHtml(fullTitle)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(article.title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">
  <script type="application/ld+json">${jsonLd}</script>
  `.trim();

  let out = templateHtml.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(fullTitle)}</title>`);
  out = out.replace(/<\/head>/i, `${seoHeadTags}\n</head>`);
  out = injectIntoSlot(out, 'articleContent', articleMainHtml);
  return out;
}

function buildSitemap(publishedArticles) {
  const staticUrls = [
    { loc: `${SITE_URL}/`, priority: '1.0' },
    ...CATEGORY_PAGES.map(page => ({ loc: `${SITE_URL}/${page}`, priority: '0.8' }))
  ];

  const postUrls = publishedArticles.map(a => ({
    loc: `${SITE_URL}/${a.slug}`,
    lastmod: a.dateStr || new Date().toISOString().slice(0, 10),
    priority: '0.7'
  }));

  const xmlEntries = [
    ...staticUrls.map(u => `  <url>\n    <loc>${u.loc}</loc>\n    <priority>${u.priority}</priority>\n  </url>`),
    ...postUrls.map(u => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <priority>${u.priority}</priority>\n  </url>`)
  ].join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlEntries}\n</urlset>\n`;
}

function run() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.error('posts 폴더를 찾을 수 없습니다:', POSTS_DIR);
    process.exit(1);
  }

  const now = new Date();
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));

  const published = files
    .map(file => {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
      const { meta, body } = parseFrontmatter(raw);
      const rawDate = meta.date ? new Date(meta.date) : new Date(0);
      const slug = String(
        meta.slug || file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '')
      ).trim();
      const category = String(meta.category || '기타').trim();
      const categoryKey = String(meta.categoryKey || CATEGORY_MAP[category] || '').trim();

      return {
        file,
        slug,
        title: String(meta.title || slug).trim(),
        category,
        categoryKey,
        summary: String(meta.excerpt || meta.summary || meta.description || '').trim(),
        thumbnail: String(meta.thumbnail || '').trim(),
        isPillar: meta.is_pillar === true,
        rawDate,
        dateStr: meta.date ? new Date(meta.date).toISOString().slice(0, 10) : '',
        body
      };
    })
    .filter(item => item.rawDate <= now)
    .sort((a, b) => b.rawDate - a.rawDate);

  // 1. index.html 및 카테고리 페이지 갱신
  const listPages = ['index.html', ...CATEGORY_PAGES];
  for (const pageName of listPages) {
    const pagePath = path.join(ROOT_DIR, pageName);
    if (!fs.existsSync(pagePath)) continue;

    let html = fs.readFileSync(pagePath, 'utf8');
    const gridMatch = html.match(/id=["']articleGrid["'][^>]*data-category=["']([^"']+)["']/);
    const catFilter = gridMatch ? gridMatch[1] : 'all';

    const filtered = (!catFilter || catFilter === 'all')
      ? published
      : published.filter(item => item.categoryKey === catFilter || CATEGORY_MAP[item.category] === catFilter);

    const pillar = filtered.find(item => item.isPillar === true) || null;
    const regular = filtered.filter(item => item !== pillar);

    html = injectIntoSlot(html, 'pillarArea', renderPillarHtml(pillar));
    html = injectIntoSlot(html, 'articleGrid', renderCardsHtml(regular));
    fs.writeFileSync(pagePath, html, 'utf8');
  }

  // 2. 개별 글 정적 HTML 생성 (예: /sop-season1-.../index.html)
  const templatePath = path.join(ROOT_DIR, 'article.html');
  if (fs.existsSync(templatePath)) {
    const templateHtml = fs.readFileSync(templatePath, 'utf8');
    for (const article of published) {
      const outDir = path.join(ROOT_DIR, article.slug);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'index.html'), buildArticlePage(templateHtml, article), 'utf8');
    }
  }

  // 3. sitemap.xml 생성
  fs.writeFileSync(path.join(ROOT_DIR, 'sitemap.xml'), buildSitemap(published), 'utf8');
  console.log(`빌드 완료: 발행 글 ${published.length}개 처리, sitemap.xml 갱신됨.`);
}

run();