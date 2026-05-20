import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ amount: null });
  }

  const client = new Anthropic();

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mediaType = file.type as string;
    const isPdf = mediaType === "application/pdf";

    const contentBlock = isPdf
      ? ({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64,
          },
        } as const)
      : ({
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType as
              | "image/jpeg"
              | "image/png"
              | "image/gif"
              | "image/webp",
            data: base64,
          },
        } as const);

    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: [
            contentBlock,
            {
              type: "text",
              text: 'This is a receipt or invoice. Extract the final total amount to pay. Return ONLY a JSON object like {"amount": 1234.56} with the numeric value (no currency symbol, no thousands separator, use dot as decimal separator). If you cannot find a clear total amount, return {"amount": null}.',
            },
          ],
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON from response, tolerating markdown code blocks
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      return NextResponse.json({ amount: null });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const amount =
      typeof parsed.amount === "number" && isFinite(parsed.amount)
        ? parsed.amount
        : null;

    return NextResponse.json({ amount });
  } catch (err) {
    console.error("extract-amount error:", err);
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }
}
