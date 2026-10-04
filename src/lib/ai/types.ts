export type AssistantHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantProduct = {
  id: string;
  name: string;
  price: number;
  available: number;
  categoryId?: string;
  categoryName?: string;
  image: string | null;
  href: string;
};

export type AssistantReply = {
  text: string;
  products: AssistantProduct[];
};

export type AssistantProviderInput = {
  apiKey: string;
  model: string;
  instructions: string;
  history: AssistantHistoryMessage[];
};

export const DEFAULT_AI_MODELS = {
  openai: "gpt-5.6-luna",
  gemini: "gemini-3.8-flash",
} as const;
