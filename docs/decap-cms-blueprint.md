[사용자/관리자 브라우저]
       │
       ├─► [Decap CMS Admin UI] (floraldays.com/admin/)
       │          │
       │          ├─► [OAuth 인증 요청] ──► [Cloudflare Worker]
       │          │                             │ (black-sun-634d...workers.dev)
       │          │                             ▼
       │          │                     [GitHub OAuth API] (Token 발급)
       │          │
       │          └─► [Markdown Content (.md) Commit/Push]
       │                                │
       ▼                                ▼
[Cloudflare Pages] ◄─── (Auto Build) ─── [GitHub Repository]
 (Jamstack 웹사이트)                       (greenfinger-arch/floraldays)