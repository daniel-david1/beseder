import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { brandName, brandDescription } = await req.json();

  if (!brandName) {
    return NextResponse.json({ error: "חסר שם מותג" }, { status: 400 });
  }

  const prompt = `אתה מומחה לשיווק דיגיטלי ותוכן לרשתות חברתיות בישראל.

שם המותג: ${brandName}
תיאור: ${brandDescription || "לא סופק"}

המשימה שלך: צור כותרת מושכת לפוסט אורגני ברשתות חברתיות (אינסטגרם / פייסבוק).

הכותרת צריכה להיות:
- בעברית
- קצרה, מושכת ומעניינת (2-5 מילים אפשריות, עד 15 מילים סה"כ)
- ליצור סקרנות וגרום לאנשים לעצור ולקרוא
- מתאימה לאסתטיקה ויזואלית (תופיע על תמונה)
- בהתאמה לאופי המותג

צור גם כיתוב קצר מאוד (tagline) שיופיע מתחת ללוגו — עד 6 מילים, שמסכם את הערך של המותג.

תן תשובה כ-JSON בדיוק בפורמט הזה, ללא שום טקסט נוסף:
{
  "headline": "הכותרת המושכת כאן",
  "subtitle": "כיתוב קצר מתחת ללוגו"
}`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "תגובה לא תקינה" }, { status: 500 });
    }
    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "שגיאה בקריאה ל-AI" }, { status: 500 });
  }
}
