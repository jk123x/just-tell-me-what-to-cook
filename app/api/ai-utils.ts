export function requireGroqKey() {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error("Missing GROQ_API_KEY");
  }
  return key;
}

export function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string) {
  const key = requireGroqKey();

  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: mimeType });
  formData.append("file", blob, "audio.webm");
  formData.append("model", "whisper-large-v3");
  formData.append("language", "en");

  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    console.error("Groq transcription error:", response.status, message);
    throw new Error(message || "Transcription failed");
  }

  const data = await response.json();
  return data.text ?? "";
}

export async function callGroq(
  messages: { role: string; content: string }[],
  systemPrompt?: string
) {
  const key = requireGroqKey();

  const allMessages = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...messages]
    : messages;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: allMessages,
      temperature: 0.3,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    console.error("Groq API error:", response.status, message);
    throw new Error(message || "Groq request failed");
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function callGroqVision(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  systemPrompt?: string
) {
  const key = requireGroqKey();

  const messages = [
    ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${imageBase64}` },
        },
      ],
    },
  ];

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.2-90b-vision-preview",
      messages,
      temperature: 0.3,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    console.error("Groq Vision error:", response.status, message);
    throw new Error(message || "Groq vision request failed");
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export function parseJsonFromText(text: string) {
  try {
    return JSON.parse(text);
  } catch (error) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) {
      throw error;
    }
    const slice = text.slice(start, end + 1);
    return JSON.parse(slice);
  }
}

export function normalizeIngredients(items: string[] = []) {
  const cleaned = items
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(cleaned));
}
