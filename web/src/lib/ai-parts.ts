export type AiPart = {
  text?: string;
  inline_data?: { mime_type?: string; data: string };
};
type Content =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };
export function aiParts(parts: AiPart[], withImages = false): Content[] {
  return parts.flatMap((part): Content[] => {
    if (part?.text != null) return [{ type: "text", text: String(part.text) }];
    if (part?.inline_data?.data)
      return withImages
        ? [
            {
              type: "image_url",
              image_url: {
                url: `data:${part.inline_data.mime_type || "image/jpeg"};base64,${part.inline_data.data}`,
              },
            },
          ]
        : [
            {
              type: "text",
              text: "[Ảnh lá số đính kèm để đối chiếu — dữ liệu JSON trong tin nhắn vẫn là nguồn chính.]",
            },
          ];
    return [];
  });
}
