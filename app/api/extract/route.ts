import { callGroq, callGroqVision, isDemoMode, normalizeIngredients, parseJsonFromText, transcribeAudio } from "../ai-utils";

export const runtime = "nodejs";

const systemPrompt =
  "You extract cooking ingredients from user inputs. Respond with only JSON: " +
  '{ "ingredients": string[], "confidence": number, "question": string | null }. ' +
  "Confidence is 0 to 1. If confidence is under 0.6, ask ONE short clarifying question in a casual Australian tone. " +
  "If confidence is 0.6 or higher, question must be null. No extra keys. " +
  "Include quantities/states when mentioned (e.g. 'leftover schnitzel', 'half a pumpkin', '2 cans of tuna').";

const demoIngredients = [
  "leftover schnitzel",
  "cooked rice",
  "soy sauce",
  "sweet chilli sauce",
  "2 cans of tuna",
  "can of chopped tomatoes",
  "cheddar cheese",
];

export async function POST(request: Request) {
  if (isDemoMode()) {
    await new Promise((r) => setTimeout(r, 800));
    return Response.json({
      ingredients: demoIngredients,
      confidence: 0.85,
      question: null,
    });
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      const audio = formData.get("audio");
      if (audio instanceof File) {
        const buffer = Buffer.from(await audio.arrayBuffer());

        const transcript = await transcribeAudio(buffer, audio.type || "audio/webm");

        if (!transcript.trim()) {
          return Response.json({
            ingredients: [],
            confidence: 0,
            question: "Didn't catch that - mind saying it again?",
          });
        }

        const resultText = await callGroq(
          [{ role: "user", content: `Extract ingredients from: "${transcript}"` }],
          systemPrompt
        );
        const parsed = parseJsonFromText(resultText);

        return Response.json({
          ingredients: normalizeIngredients(parsed.ingredients),
          confidence: parsed.confidence ?? 0.5,
          question: parsed.question ?? null,
        });
      }

      const images = formData.getAll("images").filter(Boolean) as File[];
      if (images.length > 0) {
        const firstImage = images[0];
        const buffer = Buffer.from(await firstImage.arrayBuffer());
        const base64 = buffer.toString("base64");

        const resultText = await callGroqVision(
          base64,
          firstImage.type,
          "Extract the visible ingredients and pantry items from this image. Ignore utensils.",
          systemPrompt
        );
        const parsed = parseJsonFromText(resultText);

        return Response.json({
          ingredients: normalizeIngredients(parsed.ingredients),
          confidence: parsed.confidence ?? 0.5,
          question: parsed.question ?? null,
        });
      }

      return Response.json({ error: "No audio or images provided" }, { status: 400 });
    }

    const body = await request.json();
    const text = body.text ?? "";
    const priorIngredients = Array.isArray(body.priorIngredients)
      ? body.priorIngredients
      : [];
    const mode = body.mode ?? "text";

    const clarificationNote =
      mode === "clarify"
        ? `Prior ingredients: ${priorIngredients.join(", ")}`
        : "";

    const resultText = await callGroq(
      [{ role: "user", content: `Extract ingredients from: "${text}". ${clarificationNote}` }],
      systemPrompt
    );
    const parsed = parseJsonFromText(resultText);
    const ingredients = normalizeIngredients(parsed.ingredients);
    const merged =
      mode === "clarify"
        ? normalizeIngredients([...priorIngredients, ...ingredients])
        : ingredients;

    return Response.json({
      ingredients: merged,
      confidence: parsed.confidence ?? 0.5,
      question: parsed.question ?? null,
    });
  } catch (error) {
    console.error("Extract error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Extract failed" },
      { status: 500 }
    );
  }
}
