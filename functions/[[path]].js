export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 1. GET/HEAD 외 요청은 그대로 전달
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return env.ASSETS.fetch(request);
  }

  // 2. 확장자가 있는 정적 파일(.html, .css, .js, .png 등)은 파일 그대로 읽기
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(pathname);

  // 3. 플로럴데이즈 5대 카테고리 및 고정 페이지 경로 목록 (확장자 유무 관계없이 통과)
  const staticPaths = [
    '/',
    '/study', '/study.html',         // 나무의사·국가자격증 스터디
    '/sop', '/sop.html',             // 수목진료 및 병해충 실무 SOP
    '/trend', '/trend.html',         // 식물 트렌드 & 스마트 가드닝
    '/homecare', '/homecare.html',   // 홈가드닝 & 반려식물 클리닉
    '/ecostory', '/ecostory.html',   // 도시숲, 생태 및 나무 인문학
    '/index.html',
    '/article.html',
    '/404.html'
  ];

  // 4. 메인, 카테고리, 정적 자원, 관리자 페이지는 Functions가 가로채지 않고 그대로 통과
  if (
    staticPaths.includes(pathname) ||
    hasExtension ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/js')
  ) {
    return env.ASSETS.fetch(request);
  }

  // 5. 그 외의 동적 클린 URL 요청(기사 상세 슬러그)만 article.html 내용을 응답
  const articleUrl = new URL('/article.html', url.origin);
  return env.ASSETS.fetch(articleUrl.toString());
}