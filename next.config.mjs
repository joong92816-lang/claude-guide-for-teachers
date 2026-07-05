/** @type {import('next').NextConfig} */
const nextConfig = {
  // MDX 파일은 next-mdx-remote로 런타임 컴파일하므로 별도 설정 불필요.
  // gray-matter 등 CJS 패키지를 서버 번들 외부로 두어 안전하게 로드.
  serverExternalPackages: ["gray-matter"],

  // ⚠️ 서버리스(Netlify Functions) 배포 필수 설정.
  // /chat(레이아웃의 Sidebar) 와 /api/chat(지식 베이스) 는 런타임에 fs 로
  // content/ 를 읽는다. 경로가 동적으로 조합되므로 Next 의 파일 트레이싱이
  // 자동으로 포함하지 못한다 → 함수 번들에 content/ 를 명시적으로 포함시킨다.
  outputFileTracingIncludes: {
    "/api/chat": ["./content/**/*"],
    "/chat": ["./content/**/*"],
    "/": ["./content/**/*"],
  },
};

export default nextConfig;
