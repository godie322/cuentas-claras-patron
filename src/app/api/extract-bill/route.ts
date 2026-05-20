import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ bill_type: "other", amount: null });
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

    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            } as const,
            {
              type: "text",
              text: `Analyze this document.

If it is an electricity bill (facturas de luz, EDEMSA, EPEN, EDESUR, EDENOR, etc.), extract:
- unit_price: the variable energy price per kWh (look for "Cargo Variable" price per kWh, or compute total variable charge / total kWh)
- total_charges: the total of ALL taxes, fees and contributions that are NOT the pure energy cost (IVA, tasas provinciales, municipales, subsidios, cargo fijo — everything that is NOT proportional to individual kWh usage)
- total_kwh: total kWh consumed in the period
- total_amount: the total amount to pay (TOTAL A PAGAR)

Return ONLY this JSON:
{"bill_type":"electricity","unit_price":216.75,"total_charges":99276.74,"total_kwh":933,"total_amount":300495.00}

If it is any other receipt or invoice, return ONLY:
{"bill_type":"other","amount":1234.56}

If you cannot find the total amount, return:
{"bill_type":"other","amount":null}

Return ONLY the JSON object with no other text.`,
            },
          ],
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      return NextResponse.json({ bill_type: "other", amount: null });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("extract-bill error:", err);
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }
}
