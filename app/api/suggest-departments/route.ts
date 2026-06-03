import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { brandName, description, goal } = await req.json();

  if (!brandName || !goal) {
    return NextResponse.json({ error: "חסרים פרטים" }, { status: 400 });
  }

  const prompt = `אתה מומחה לניהול פרויקטים ואסטרטגיה עסקית.
המשתמש רוצה ליצור מותג/פרויקט חדש במערכת ה-CRM שלו.

שם המותג: ${brandName}
תיאור: ${description || "לא סופק"}
מטרה: ${goal}

המשימה שלך: המלץ על 3-6 מחלקות (departments) שיעזרו להשיג את המטרה.
לכל מחלקה תן:
- שם קצר ומדויק (2-4 מילים בעברית)
- אייקון אמוג'י מתאים
- תיאור קצר (משפט אחד) מה המחלקה אחראית עליה
- 3-5 שלבים עיקריים שצריך לעשות במחלקה הזו

חשוב: תן תשובה כ-JSON בדיוק בפורמט הזה, ללא שום טקסט נוסף:
{
  "departments": [
    {
      "name": "שם המחלקה",
      "emoji": "🎯",
      "description": "תיאור קצר",
      "stages": ["שלב 1", "שלב 2", "שלב 3"]
    }
  ]
}`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "תגובה לא תקינה מה-AI" }, { status: 500 });
    }
    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "שגיאה בקריאה ל-AI" }, { status: 500 });
  }
}
