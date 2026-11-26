const GITHUB_REPO = "greenfinger-arch/floraldays";
const GITHUB_BRANCH = "main";

// 한글 카테고리명과 HTML data-category 키값 매핑
const CATEGORY_MAP = {
  "나무의사·국가자격증 스터디": "study",
  "수목진료 및 병해충 실무 SOP": "sop",
  "식물 트렌드 & 스마트 가드닝": "trend",
  "홈가드닝 & 반려식물 클리닉": "homecare",
  "도시숲, 생태 및 나무 인문학": "ecostory",
  "식물 창업·전업 & 매장 리뉴얼": "biz"
};

// 키값으로 한글 카테고리명을 찾는 역매핑
const REVERSE_CATEGORY_MAP = {
  "study": "나무의사·국가자격증 스터디",
  "sop": "수목진료 및 병해충 실무 SOP",
  "trend": "식물 트렌드 & 스마트 가드닝",
  "homecare": "홈가드닝 & 반려식물 클리닉",
  "ecostory": "도시숲, 생태 및 나무 인문학",
  "biz": "식물 창업·전업 & 매장 리뉴얼"
};

document.addEventListener("DOMContentLoaded", async () => {
  // 1. 모바일 메뉴 토글
  const menuToggle = document.getElementById('menuToggle');
  const mainNav = document.getElementById('mainNav');
  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => mainNav.classList.toggle('open'));
  }

  // 2. 글로벌 링크 클릭 예외 처리
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    if (
      href.startsWith('http') ||
      href.startsWith('//') ||
      href.endsWith('.html') ||
      href === '/' ||
      href.startsWith('#')
    ) {
      return;
    }
  });

  const grid = document.getElementById('articleGrid');
  const pillarArea = document.getElementById('pillarArea');

  if (!grid) return;

  const currentCategoryKey = grid.dataset.category; // 예: "study", "sop", "biz", "all" 등
  const targetKoreanCategory = REVERSE_CATEGORY_MAP[currentCategoryKey] || null;

  try {
    const listUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/posts?ref=${GITHUB_BRANCH}`;
    const res = await fetch(listUrl);
    
    if (!res.ok) throw new Error("포스트 목록을 불러올 수 없습니다.");
    const files = await res.json();

    const mdFiles = files.filter(file => file.name.endsWith('.md'));

    if (mdFiles.length === 0) {
      grid.innerHTML = '<p style="grid-column: 1 / -1; color: var(--text-muted); padding: 40px 0; text-align: center;">등록된 기사가 없습니다.</p>';
      if (pillarArea) pillarArea.innerHTML = '';
      return;
    }

    const now = new Date();

    const articlePromises = mdFiles.map(async (file) => {
      const rawRes = await fetch(file.download_url);
      const text = await rawRes.text();
      const parts = text.split(/^---$/m);

      let metadata = {};
      if (parts.length >= 3) {
        metadata = jsyaml.load(parts[1]) || {};
      }

      let slug = metadata.slug;
      if (!slug) {
        slug = file.name.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
      }

      const categoryName = String(metadata.category || '기타').trim();
      const catKey = metadata.categoryKey || CATEGORY_MAP[categoryName] || '';

      return {
        slug: String(slug).trim(),
        title: metadata.title || slug,
        category: categoryName,
        categoryKey: catKey,
        date: metadata.date ? String(metadata.date).substring(0, 10) : '',
        rawDate: metadata.date ? new Date(metadata.date) : new Date(0),
        summary: metadata.excerpt || metadata.summary || metadata.description || '',
        thumbnail: metadata.thumbnail || 'https://picsum.photos/600/380',
        isPillar: metadata.is_pillar === true
      };
    });

    const articles = await Promise.all(articlePromises);
    const publishedArticles = articles.filter(item => item.rawDate <= now);
    publishedArticles.sort((a, b) => b.rawDate - a.rawDate);

    // 📌 카테고리 필터링 정밀 교정 (키값, 한글명, 대소문자 무관 비교)
    const filteredArticles = (currentCategoryKey && currentCategoryKey !== 'all')
      ? publishedArticles.filter(item => {
          const itemCat = String(item.category).trim();
          const itemKey = String(item.categoryKey).trim();
          return (
            itemKey === currentCategoryKey || 
            itemCat === targetKoreanCategory ||
            itemCat === currentCategoryKey
          );
        })
      : publishedArticles;

    if (filteredArticles.length === 0) {
      grid.innerHTML = '<p style="grid-column: 1 / -1; color: var(--text-muted); padding: 40px 0; text-align: center;">등록된 기사가 곧 업데이트될 예정입니다.</p>';
      if (pillarArea) pillarArea.innerHTML = '';
      return;
    }

    const pillarArticle = filteredArticles.find(item => item.isPillar === true);
    const regularArticles = filteredArticles.filter(item => item !== pillarArticle);

    if (pillarArticle && pillarArea) {
      pillarArea.innerHTML = `
        <article class="info-card pillar-card" style="margin-bottom: 32px;">
          <div class="card-image">
            <span class="badge" style="background-color: var(--accent);">EXPERT INSIGHT</span>
            <img src="${pillarArticle.thumbnail}" alt="${pillarArticle.title}" loading="lazy">
          </div>
          <div class="card-body">
            <h2 class="card-title" style="font-size: 1.4rem; font-weight: 800; color: #ffffff;">
              <a href="/${pillarArticle.slug}">${pillarArticle.title}</a>
            </h2>
            <p class="card-text" style="color: rgba(255,255,255,0.9);">${pillarArticle.summary}</p>
            <div class="card-meta" style="border-top-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.8);">
              <span>${pillarArticle.date}</span>
              <a href="/${pillarArticle.slug}" class="read-more" style="color: #ffffff; font-weight: 700;">전체 가이드 읽기 &rarr;</a>
            </div>
          </div>
        </article>
      `;
    } else if (pillarArea) {
      pillarArea.innerHTML = '';
    }

    grid.innerHTML = regularArticles.map(article => `
      <article class="info-card">
        <div class="card-image">
          <span class="badge badge-green">${article.category}</span>
          <img src="${article.thumbnail}" alt="${article.title}" loading="lazy">
        </div>
        <div class="card-body">
          <h3 class="card-title">
            <a href="/${article.slug}">${article.title}</a>
          </h3>
          <p class="card-text">${article.summary}</p>
          <div class="card-meta">
            <span>${article.date}</span>
            <a href="/${article.slug}" class="read-more">자세히 보기 &rarr;</a>
          </div>
        </div>
      </article>
    `).join('');

  } catch (err) {
    console.error("CMS 데이터 로딩 실패:", err);
    grid.innerHTML = '<p style="grid-column: 1 / -1; color: var(--text-muted); padding: 40px 0; text-align: center;">기사를 불러오는 중 오류가 발생했습니다.</p>';
  }
});
