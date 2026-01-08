import { callGroq, isDemoMode, parseJsonFromText } from "../ai-utils";

export const runtime = "nodejs";

const systemPrompt =
  "You are a helpful Australian home cook. Suggest up to three meal ideas " +
  "based on the ingredients and the energy level. Keep them realistic, low-fuss, " +
  "and avoid fancy ingredients. Respond with only JSON: " +
  '{ "meals": [{ "name": string, "why": string, "steps": string[], "substitutions": string[] }] }. ' +
  "Keep steps short. Match the number of steps to energy (lower energy = fewer steps).";

const demoMeals = {
  none: [
    {
      name: "Tuna Melt",
      why: "Zero cooking, maximum comfort. Just assembly and a toaster.",
      steps: [
        "Mix tuna with a bit of mayo if you have it",
        "Pile onto bread, top with cheddar",
        "Toast until cheese melts",
      ],
      substitutions: ["Skip the toasting if even that's too much"],
      detail: {
        time: "5 mins",
        equipment: "Toaster or grill",
        temp: "High heat on grill, or just toaster setting",
        tips: "Don't skimp on the cheese. Seriously.",
      },
    },
  ],
  low: [
    {
      name: "Schnitzel Fried Rice",
      why: "One pan, uses up the leftover rice and schnitzel in the best way.",
      steps: [
        "Chop schnitzel into bite-sized bits",
        "Fry rice in a hot pan with soy sauce",
        "Toss in schnitzel, add sweet chilli to taste",
      ],
      substitutions: ["Add an egg if you've got one", "Any leftover meat works"],
      detail: {
        time: "10 mins",
        equipment: "Frying pan or wok",
        temp: "High heat - you want the rice to get a bit crispy",
        tips: "Cold rice works best. If rice is fresh, spread it on a plate to cool for a few mins first.",
      },
    },
    {
      name: "Cheesy Tuna Pasta Bake-ish",
      why: "Comfort food that's mostly just mixing things together.",
      steps: [
        "Mix tuna with chopped tomatoes",
        "Stir through any cooked pasta or rice",
        "Top with cheddar, microwave or grill until melty",
      ],
      substitutions: ["Add herbs if you're feeling fancy"],
      detail: {
        time: "8 mins",
        equipment: "Microwave or grill",
        temp: "Microwave 2-3 mins, or grill on high until cheese bubbles",
        tips: "Use a microwave-safe dish. Season the tuna mix well - a bit of pepper goes a long way.",
      },
    },
  ],
  medium: [
    {
      name: "Schnitzel Katsu-ish Rice Bowl",
      why: "Feels fancy but it's just reheating with extra steps.",
      steps: [
        "Warm schnitzel in pan until crispy again",
        "Heat rice, drizzle with soy and sweet chilli mixed",
        "Slice schnitzel, lay over rice",
        "Top with anything fresh if you have it",
      ],
      substitutions: ["A fried egg on top makes it next level"],
      detail: {
        time: "12 mins",
        equipment: "Frying pan",
        temp: "Medium-high heat for the schnitzel, you want it crispy not burnt",
        tips: "Mix the soy and sweet chilli 50/50 for a quick katsu-ish sauce. Add a splash of water if too thick.",
      },
    },
    {
      name: "Tuna Tomato Rice Skillet",
      why: "One pan, surprisingly good, uses up the cans.",
      steps: [
        "Fry rice in pan for a minute",
        "Add chopped tomatoes, let it absorb",
        "Stir in tuna, season well",
        "Top with cheese, lid on until melted",
      ],
      substitutions: ["Chilli flakes if you want heat"],
      detail: {
        time: "15 mins",
        equipment: "Frying pan with lid",
        temp: "Medium heat throughout",
        tips: "Let the tomatoes simmer into the rice for a few mins before adding tuna. Salt is key here.",
      },
    },
    {
      name: "Loaded Schnitzel Nachos",
      why: "Unconventional but honestly great.",
      steps: [
        "Chop schnitzel, crisp it up in a pan",
        "Layer over chips or toast",
        "Top with tomatoes and lots of cheese",
        "Grill or microwave until bubbly",
      ],
      substitutions: ["Sour cream if you have it"],
      detail: {
        time: "12 mins",
        equipment: "Frying pan + grill or microwave",
        temp: "Medium-high for schnitzel, high grill for melting",
        tips: "Get the schnitzel properly crispy before assembling or it goes soggy.",
      },
    },
  ],
  high: [
    {
      name: "Schnitzel Parmigiana",
      why: "The classic reheat upgrade.",
      steps: [
        "Lay schnitzel in baking dish",
        "Spoon over chopped tomatoes",
        "Cover generously with cheddar",
        "Bake at 180°C until bubbling",
        "Serve with rice on the side",
      ],
      substitutions: ["Add ham if you've got it", "Mozzarella if you have it"],
      detail: {
        time: "25 mins",
        equipment: "Oven + baking dish",
        temp: "180°C (350°F) for about 20 mins",
        tips: "Don't drown it in tomato - you want the schnitzel to stay a bit crispy on the edges.",
      },
    },
    {
      name: "Tuna Rice Cakes",
      why: "Crispy outside, soft inside. Actually impressive.",
      steps: [
        "Mix rice with tuna, bit of egg if you have it",
        "Form into patties",
        "Pan fry until golden on both sides",
        "Serve with sweet chilli for dipping",
      ],
      substitutions: ["Spring onion makes them better"],
      detail: {
        time: "20 mins",
        equipment: "Frying pan",
        temp: "Medium heat - too high and they burn before cooking through",
        tips: "Wet your hands when forming patties so rice doesn't stick. Press them fairly flat, about 1.5cm thick.",
      },
    },
    {
      name: "Tomato Cheese Rice Bake",
      why: "Set and forget comfort food.",
      steps: [
        "Mix rice with chopped tomatoes",
        "Add tuna, season well",
        "Pour into baking dish, top with cheddar",
        "Bake until golden and bubbling",
        "Let it sit 5 mins before serving",
      ],
      substitutions: ["Breadcrumbs on top for crunch"],
      detail: {
        time: "30 mins",
        equipment: "Oven + baking dish",
        temp: "180°C (350°F) for 20-25 mins",
        tips: "Resting it for 5 mins actually matters - it sets up and slices better.",
      },
    },
  ],
};

export async function POST(request: Request) {
  const body = await request.json();
  const ingredients = body.ingredients ?? [];
  const energy = body.energy ?? "low";

  if (isDemoMode()) {
    await new Promise((r) => setTimeout(r, 1000));
    const meals = demoMeals[energy as keyof typeof demoMeals] ?? demoMeals.low;
    return Response.json({ meals });
  }

  try {
    const resultText = await callGroq(
      [{ role: "user", content: `Ingredients: ${ingredients.join(", ")}. Energy level: ${energy}.` }],
      systemPrompt
    );
    const parsed = parseJsonFromText(resultText);

    return Response.json({ meals: parsed.meals ?? [] });
  } catch (error) {
    console.error("Generate error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
