"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type EnergyLevel = "none" | "low" | "medium" | "high";

type MealDetail = {
  time: string;
  equipment: string;
  temp: string;
  tips: string;
};

type MealOption = {
  name: string;
  why: string;
  steps: string[];
  substitutions: string[];
  detail?: MealDetail;
};

type AppState = "ready" | "recording" | "processing" | "results";

const prompts = [
  "What's in the fridge?",
  "Talk me through it",
  "What are we working with?",
  "Just say what you've got",
];

const energyOptions: { id: EnergyLevel; label: string; note: string }[] = [
  { id: "none", label: "Can't be bothered", note: "Assemble only" },
  { id: "low", label: "Low", note: "One pan max" },
  { id: "medium", label: "Some", note: "A few steps" },
  { id: "high", label: "Keen", note: "Let's cook" },
];

export default function Home() {
  const [appState, setAppState] = useState<AppState>("ready");
  const [promptIndex, setPromptIndex] = useState(0);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [energy, setEnergy] = useState<EnergyLevel>("low");
  const [meals, setMeals] = useState<MealOption[]>([]);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [inputMode, setInputMode] = useState<"voice" | "photo" | "text" | null>(null);
  const [textInput, setTextInput] = useState("");
  const [images, setImages] = useState<File[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const resultsRef = useRef<HTMLElement>(null);

  const [canRecord, setCanRecord] = useState(false);

  useEffect(() => {
    setCanRecord("MediaRecorder" in window);
  }, []);

  const previews = useMemo(
    () => images.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [images]
  );

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  useEffect(() => {
    if (appState !== "ready") return;
    const interval = setInterval(() => {
      setPromptIndex((i) => (i + 1) % prompts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [appState]);

  useEffect(() => {
    if (appState === "results" && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [appState]);

  async function startRecording() {
    setError("");
    setInputMode("voice");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await processAudio(blob);
      };
      recorder.start();
      setAppState("recording");
    } catch {
      setError("Couldn't access the mic. Try the text option?");
      setInputMode(null);
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    setAppState("processing");
  }

  async function processAudio(blob: Blob) {
    try {
      const formData = new FormData();
      formData.append("audio", blob, "voice.webm");
      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Couldn't process that");
      const data = await response.json();
      const list = data.ingredients ?? [];
      setIngredients(list);
      if (list.length > 0) {
        await generateMeals(list, energy);
      } else {
        setError("Didn't catch any ingredients. Mind trying again?");
        setAppState("ready");
      }
    } catch {
      setError("Something went sideways. Give it another go?");
      setAppState("ready");
    }
  }

  async function processImages() {
    if (images.length === 0) return;
    setAppState("processing");
    try {
      const formData = new FormData();
      images.forEach((file) => formData.append("images", file));
      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Couldn't read the photos");
      const data = await response.json();
      const list = data.ingredients ?? [];
      setIngredients(list);
      if (list.length > 0) {
        await generateMeals(list, energy);
      } else {
        setError("Couldn't spot any ingredients. Try a clearer photo?");
        setAppState("ready");
      }
    } catch {
      setError("Photo processing didn't work. Try again?");
      setAppState("ready");
    }
  }

  async function processText() {
    if (!textInput.trim()) return;
    setAppState("processing");
    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textInput }),
      });
      if (!response.ok) throw new Error("Couldn't process that");
      const data = await response.json();
      const list = data.ingredients ?? [];
      setIngredients(list);
      if (list.length > 0) {
        await generateMeals(list, energy);
      } else {
        setError("Didn't catch any ingredients there. Try rephrasing?");
        setAppState("ready");
      }
    } catch {
      setError("Something went wrong. Try again?");
      setAppState("ready");
    }
  }

  async function generateMeals(ingredientList: string[], energyLevel: EnergyLevel) {
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: ingredientList, energy: energyLevel }),
      });
      if (!response.ok) throw new Error("Couldn't generate meals");
      const data = await response.json();
      setMeals(data.meals ?? []);
      setAppState("results");
    } catch {
      setError("Meal ideas didn't come through. Hit refresh?");
      setAppState("ready");
    }
  }

  async function regenerate(newEnergy?: EnergyLevel) {
    const useEnergy = newEnergy ?? energy;
    if (newEnergy) setEnergy(newEnergy);
    setAppState("processing");
    await generateMeals(ingredients, useEnergy);
  }

  function startOver() {
    setAppState("ready");
    setIngredients([]);
    setMeals([]);
    setError("");
    setInputMode(null);
    setTextInput("");
    setImages([]);
  }

  function removeIngredient(name: string) {
    setIngredients((curr) => curr.filter((i) => i !== name));
  }

  function addIngredient(name: string) {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return;
    setIngredients((curr) => Array.from(new Set([...curr, trimmed])));
  }

  if (appState === "ready") {
    return (
      <main className="centered-main">
        <div className="voice-hero">
          <p className="tagline">just tell me what to cook</p>

          {!inputMode && (
            <>
              <div className="prompt-area">
                <span className="current-prompt" key={promptIndex}>
                  {prompts[promptIndex]}
                </span>
              </div>

              {canRecord ? (
                <button className="voice-button" onClick={startRecording}>
                  <span className="mic-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
                    </svg>
                  </span>
                  <span className="voice-label">Tap to talk</span>
                </button>
              ) : (
                <p className="no-mic-note">Your browser doesn't support recording</p>
              )}

              <div className="alt-inputs">
                <button className="alt-button" onClick={() => setInputMode("photo")}>
                  snap a photo
                </button>
                <span className="alt-divider">or</span>
                <button className="alt-button" onClick={() => setInputMode("text")}>
                  type it out
                </button>
              </div>
            </>
          )}

          {inputMode === "photo" && (
            <div className="input-panel">
              <label className="file-picker">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setImages(Array.from(e.target.files ?? []).slice(0, 3))}
                />
                <span>Pick 1-3 photos</span>
              </label>
              {previews.length > 0 && (
                <div className="photo-row">
                  {previews.map((p) => (
                    <img key={p.url} src={p.url} alt="" />
                  ))}
                </div>
              )}
              <div className="panel-actions">
                <button className="action-button primary" onClick={processImages} disabled={images.length === 0}>
                  Go
                </button>
                <button className="action-button ghost" onClick={() => { setInputMode(null); setImages([]); }}>
                  Back
                </button>
              </div>
            </div>
          )}

          {inputMode === "text" && (
            <div className="input-panel">
              <textarea
                rows={3}
                placeholder="e.g. leftover schnitzel, rice, some sauces, cans of tuna, chopped tomatoes, cheddar"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                autoFocus
              />
              <div className="panel-actions">
                <button className="action-button primary" onClick={processText} disabled={!textInput.trim()}>
                  Go
                </button>
                <button className="action-button ghost" onClick={() => { setInputMode(null); setTextInput(""); }}>
                  Back
                </button>
              </div>
            </div>
          )}

          {error && <p className="error-message">{error}</p>}

          <p className="reassurance">No accounts. Photos stay on your device.</p>
        </div>
      </main>
    );
  }

  if (appState === "recording") {
    return (
      <main className="centered-main">
        <div className="voice-hero">
          <p className="tagline">listening...</p>

          <button className="voice-button recording" onClick={stopRecording}>
            <span className="pulse-ring" />
            <span className="pulse-ring delay" />
            <span className="mic-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
              </svg>
            </span>
            <span className="voice-label">Tap when done</span>
          </button>

          <p className="recording-hint">Just list what you've got</p>
        </div>
      </main>
    );
  }

  if (appState === "processing") {
    return (
      <main className="centered-main">
        <div className="voice-hero">
          <p className="tagline">working on it...</p>
          <div className="loader">
            <span /><span /><span />
          </div>
          <p className="processing-hint">Finding you something good</p>
        </div>
      </main>
    );
  }

  return (
    <main className="results-main">
      <section className="results-section" ref={resultsRef}>
        <div className="results-header">
          <p className="tagline">here's what I reckon</p>
          <button className="start-over" onClick={startOver}>Start over</button>
        </div>

        <div className="meals-list">
          {meals.map((meal, idx) => {
            const isExpanded = expandedMeal === meal.name;
            return (
              <article
                key={meal.name}
                className={`meal-card ${isExpanded ? "expanded" : ""}`}
                style={{ animationDelay: `${idx * 0.1}s` }}
                onClick={() => setExpandedMeal(isExpanded ? null : meal.name)}
              >
                <div className="meal-header">
                  <h2>{meal.name}</h2>
                  {meal.detail && <span className="meal-time">{meal.detail.time}</span>}
                </div>
                <p className="meal-why">{meal.why}</p>

                {!isExpanded && <p className="tap-hint">Tap for full recipe</p>}

                {isExpanded && (
                  <div className="meal-expanded">
                    {meal.detail && (
                      <div className="meal-detail">
                        <div className="detail-row">
                          <span className="detail-label">Time</span>
                          <span>{meal.detail.time}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Equipment</span>
                          <span>{meal.detail.equipment}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Heat</span>
                          <span>{meal.detail.temp}</span>
                        </div>
                      </div>
                    )}

                    <div className="meal-steps">
                      <strong>Steps</strong>
                      <ol>
                        {meal.steps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>

                    {meal.detail && (
                      <div className="meal-tips">
                        <strong>Tips</strong>
                        <p>{meal.detail.tips}</p>
                      </div>
                    )}

                    {meal.substitutions.length > 0 && (
                      <div className="meal-subs-expanded">
                        <strong>Substitutions</strong>
                        <ul>
                          {meal.substitutions.map((sub, i) => (
                            <li key={i}>{sub}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <div className="refine-section">
          <details className="refine-block">
            <summary>Tweak ingredients or energy</summary>
            <div className="refine-content">
              <div className="ingredients-area">
                <p className="refine-label">Ingredients</p>
                <div className="chip-list">
                  {ingredients.map((item) => (
                    <span key={item} className="chip">
                      {item}
                      <button onClick={() => removeIngredient(item)} aria-label={`Remove ${item}`}>×</button>
                    </span>
                  ))}
                </div>
                <IngredientAdder onAdd={addIngredient} />
              </div>

              <div className="energy-area">
                <p className="refine-label">Energy level</p>
                <div className="energy-row">
                  {energyOptions.map((opt) => (
                    <button
                      key={opt.id}
                      className={`energy-chip ${energy === opt.id ? "active" : ""}`}
                      onClick={() => setEnergy(opt.id)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button className="action-button primary" onClick={() => regenerate()}>
                Regenerate ideas
              </button>
            </div>
          </details>
        </div>

        <div className="done-note">
          <p>That's the lot. If none of these hit, tweak the ingredients above or just start fresh.</p>
        </div>
      </section>
    </main>
  );
}

function IngredientAdder({ onAdd }: { onAdd: (value: string) => void }) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onAdd(value);
    setValue("");
  }

  return (
    <form className="add-ingredient" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Add ingredient"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit">Add</button>
    </form>
  );
}
