import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Remove the data:image/png;base64, prefix
    const base64Image = image.split(',')[1];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What is on this screen? Provide a brief summary. If there are passwords or sensitive info, ignore them and do not mention them." },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
    });

    return NextResponse.json({ summary: response.choices[0].message.content });
  } catch (error: any) {
    console.error('Screen Analysis Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
