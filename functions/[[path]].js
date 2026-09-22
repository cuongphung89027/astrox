/*
 * Cloudflare Pages Function — bắt toàn bộ đường dẫn không khớp file tĩnh
 * hay /api/* cụ thể nào, phục vụ hai việc:
 *
 *  1) SPA fallback: các route sạch mới (VD: /tuvi, /hoangdao, /kinhdich,
 *     /battu, /thanso, /tarot, /trangchu) đều trả về index.html để router
 *     phía client (xem showView/pathForView/viewForPath trong index.html)
 *     tự nhận diện qua location.pathname, thay vì bị 404.
 *
 *  2) SEO: chèn lại <title>/<meta description>/<og:*>/<twitter:*>/<link
 *     canonical> theo đúng module của route đó ngay trong HTML trả về, để
 *     công cụ tìm kiếm và trình quét liên kết mạng xã hội (không chạy JS)
 *     đọc được nội dung đúng cho từng module thay vì luôn thấy metadata
 *     mặc định của trang chủ.
 *
 * Không đụng tới /api/* (đã có handler riêng trong functions/api/) hay các
 * file tĩnh có phần mở rộng (.js, .css, .png, .svg, ...) — những request đó
 * được chuyển thẳng cho ASSETS.fetch như bình thường.
 *
 * Ảnh og:image dùng thumbnail riêng từng module tại /assets/og/<slug>.png
 * (đã duyệt và upload ngày 2026-09-12).
 */

const ROUTE_META = {
  "/trangchu": {
    title: "Khám phá thế giới của bạn cùng AstroX",
    description: "Khám phá thế giới của bạn cùng AstroX.",
    image: "/assets/og/trangchu.png"
  },
  "/tuvi": {
    title: "Tử Vi Đẩu Số — Luận giải lá số bằng AstroX | AstroX",
    description: "Lập lá số Tử Vi Đẩu Số, xem vận hạn theo ngày, tuần, tháng dựa trên Lưu Niên, Lưu Nguyệt, Lưu Nhật thật, luận giải bằng AstroX.",
    image: "/assets/og/tuvi.png"
  },
  "/hoangdao": {
    title: "Cung Hoàng Đạo — Tử vi phương Tây mỗi ngày | AstroX",
    description: "Xem tử vi 12 cung hoàng đạo theo ngày, tuần, tháng dựa trên vị trí thiên thể thật, luận giải bằng AstroX.",
    image: "/assets/og/hoangdao.png"
  },
  "/kinhdich": {
    title: "Kinh Dịch — Gieo quẻ và luận giải bằng AstroX | AstroX",
    description: "Gieo quẻ Kinh Dịch, xem hào từ và luận giải quẻ theo tình huống của bạn bằng AstroX.",
    image: "/assets/og/kinhdich.png"
  },
  "/battu": {
    title: "Bát Tự (Tứ Trụ) — Luận giải mệnh lý bằng AstroX | AstroX",
    description: "Lập lá số Bát Tự Tứ Trụ, xem Thập Thần, Dụng Thần và luận giải mệnh lý bằng AstroX.",
    image: "/assets/og/battu.png"
  },
  "/thanso": {
    title: "Thần Số Học — Giải mã con số cuộc đời | AstroX",
    description: "Tính Số Chủ Đạo, Số Đường Đời và các chỉ số Thần Số Học, luận giải ý nghĩa bằng AstroX.",
    image: "/assets/og/thanso.png"
  },
  "/tarot": {
    title: "Tarot — Trải bài và luận giải bằng AstroX | AstroX",
    description: "Chọn bộ bài, trải bài Tarot theo nhiều kiểu trải phổ biến và xem luận giải bằng AstroX dựa trên đúng các lá đã rút.",
    image: "/assets/og/tarot.png"
  }
};
ROUTE_META["/"] = ROUTE_META["/trangchu"];

function rewriteMeta(response, meta, canonicalUrl) {
  const attr = (value) => ({ element(el) { el.setAttribute("content", value); } });
  const imageUrl = new URL(meta.image, canonicalUrl).toString();
  return new HTMLRewriter()
    .on("title", { element(el) { el.setInnerContent(meta.title); } })
    .on('meta[name="description"]', attr(meta.description))
    .on('meta[property="og:title"]', attr(meta.title))
    .on('meta[property="og:description"]', attr(meta.description))
    .on('meta[property="og:url"]', attr(canonicalUrl))
    .on('meta[property="og:image"]', attr(imageUrl))
    .on('meta[name="twitter:title"]', attr(meta.title))
    .on('meta[name="twitter:description"]', attr(meta.description))
    .on('meta[name="twitter:image"]', attr(imageUrl))
    .on('link[rel="canonical"]', { element(el) { el.setAttribute("href", canonicalUrl); } })
    .transform(response);
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  let pathname = url.pathname;
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, "");

  // Không can thiệp /api/* hay file tĩnh có phần mở rộng (css/js/png/svg/...)
  if (pathname.startsWith("/api/") || /\.[a-zA-Z0-9]+$/.test(pathname)) {
    return env.ASSETS.fetch(request);
  }

  // Admin is a separately exported Next page, never a legacy SPA fallback.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return env.ASSETS.fetch(request);
  }

  // Lưu ý: phải fetch "/" (không phải "/index.html") — ASSETS.fetch coi
  // "/index.html" là một request tới file .html và trả về redirect 308 sang
  // "/" (chuẩn hoá clean-URL), khiến các route như /tuvi bị lặp redirect vô
  // hạn. Fetch thẳng "/" thì ASSETS trả về nội dung index.html không redirect.
  const indexUrl = new URL(request.url);
  indexUrl.pathname = "/";
  const assetRes = await env.ASSETS.fetch(new Request(indexUrl.toString(), request));

  const meta = ROUTE_META[pathname];
  if (!meta) {
    // Route lạ (không khớp module nào) — vẫn trả index.html để client-side
    // router tự xử lý (mặc định về trang chủ), giữ nguyên metadata gốc.
    return new Response(assetRes.body, assetRes);
  }
  const canonicalUrl = `${url.origin}${pathname === "/" ? "/trangchu" : pathname}`;
  return rewriteMeta(assetRes, meta, canonicalUrl);
}
