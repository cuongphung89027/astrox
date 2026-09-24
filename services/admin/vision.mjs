const invalid = () => {
  throw Object.assign(new Error("INVALID_MESSAGES"), {
    code: "INVALID_MESSAGES",
    status: 400,
  });
};
export function normalizeMessages(messages, allowImages = false) {
  let images = 0,
    total = 0;
  if (!Array.isArray(messages) || !messages.length || messages.length > 100)
    invalid();
  const result = messages.map((m) => {
    if (
      !m ||
      !["system", "user", "assistant"].includes(m.role) ||
      Object.keys(m).some((k) => !["role", "content"].includes(k))
    )
      invalid();
    const text = (v) => {
      if (typeof v !== "string" || !v.trim() || v.length > 100000) invalid();
      total += v.length;
      return v;
    };
    let content = m.content;
    if (Array.isArray(content)) {
      if (!content.length || content.length > 10) invalid();
      content = content.map((p) => {
        if (
          p &&
          ["text", undefined].includes(p.type) &&
          Object.keys(p).every((k) => ["type", "text"].includes(k))
        )
          return { type: "text", text: text(p.text) };
        if (
          !allowImages ||
          m.role !== "user" ||
          p?.type !== "image_url" ||
          Object.keys(p).some((k) => !["type", "image_url"].includes(k)) ||
          !p.image_url ||
          Object.keys(p.image_url).some((k) => k !== "url")
        )
          invalid();
        const url = p.image_url.url;
        if (typeof url !== "string" || url.length > 1200000 || ++images > 1)
          invalid();
        const match =
          /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
            url,
          );
        if (!match || match[2].length % 4 !== 0) invalid();
        let bytes;
        try {
          bytes = atob(match[2].slice(0, 32));
        } catch {
          invalid();
        }
        if (
          (match[1] === "jpeg" && !bytes.startsWith("\xff\xd8\xff")) ||
          (match[1] === "png" && !bytes.startsWith("\x89PNG\r\n\x1a\n")) ||
          (match[1] === "webp" &&
            !(bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP"))
        )
          invalid();
        return { type: "image_url", image_url: { url } };
      });
      if (!content.some((p) => p.type === "image_url"))
        content = content.map((p) => p.text).join("\n");
    } else content = text(content);
    return { role: m.role, content };
  });
  if (total > 200000) invalid();
  return result;
}
export function withManagedText(messages, text) {
  const images = messages.flatMap((m) =>
    Array.isArray(m.content)
      ? m.content.filter((p) => p.type === "image_url")
      : [],
  );
  return [
    {
      role: "user",
      content: images.length ? [{ type: "text", text }, ...images] : text,
    },
  ];
}
export function providerMessages(messages, protocol) {
  return messages.map((m) => ({
    ...m,
    content: !Array.isArray(m.content)
      ? m.content
      : m.content.map((p) => {
          if (protocol === "responses")
            return p.type === "text"
              ? { type: "input_text", text: p.text }
              : { type: "input_image", image_url: p.image_url.url };
          if (protocol === "anthropic") {
            if (p.type === "text") return p;
            const [, media_type, data] = /^data:([^;]+);base64,(.+)$/.exec(
              p.image_url.url,
            );
            return {
              type: "image",
              source: { type: "base64", media_type, data },
            };
          }
          return p;
        }),
  }));
}
