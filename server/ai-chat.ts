import OpenAI from "openai";
import { storage } from "./storage";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface ChatContext {
  products: Array<{ name: string; brand: string; category: string; description: string }>;
  brands: Array<{ name: string; description: string }>;
  categories: Array<{ name: string }>;
  companyInfo: Record<string, string>;
}

async function buildKnowledgeContext(): Promise<ChatContext> {
  const [products, brands, categories, settings] = await Promise.all([
    storage.getAllProducts(),
    storage.getAllBrands(),
    storage.getAllCategories(),
    storage.getSiteSettings(),
  ]);

  const brandMap = new Map(brands.map(b => [b.id, b.name]));
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  return {
    products: products.slice(0, 50).map(p => ({
      name: p.productName,
      brand: brandMap.get(p.brandId) || "Unknown",
      category: categoryMap.get(p.categoryId) || "Unknown",
      description: p.shortDescription || "",
    })),
    brands: brands.filter(b => b.isActive).map(b => ({
      name: b.name,
      description: b.description || "",
    })),
    categories: categories.filter(c => c.isActive && !c.parentId).map(c => ({
      name: c.name,
    })),
    companyInfo: settings,
  };
}

function buildSystemPrompt(context: ChatContext): string {
  const brandList = context.brands.slice(0, 15).map(b => b.name).join(", ");
  const categoryList = context.categories.map(c => c.name).join(", ");

  return `You are a quick, helpful assistant for Pharma Oasis, a UK B2B pharmaceutical wholesaler.

CRITICAL RULES - FOLLOW EXACTLY:
1. Keep ALL responses to ONE short sentence (under 20 words)
2. NEVER mention prices - say "our team will quote you"
3. Be warm but brief - visitors are busy
4. No medical advice - recommend doctors

WHAT WE DO:
- B2B wholesale to pharmacies & retailers
- MHRA licensed, GDP compliant
- Brands: ${brandList}
- Categories: ${categoryList}

RESPONSE EXAMPLES:
Q: "What brands do you have?" → "We carry Nurofen, Panadol, Calpol, Seven Seas and 50+ other top healthcare brands!"
Q: "Do you have vitamins?" → "Yes, we stock vitamins from Vitabiotics, Centrum, Berocca and more."
Q: "How much is X?" → "Our sales team will provide a quote based on your quantity needs."
Q: "How do I order?" → "Register on our site and our team will set up your account."

Contact: ${context.companyInfo.contact_email || "trade@pharmaoasis.com"} | ${context.companyInfo.contact_phone || "+44 7481 640640"}

Remember: ONE sentence max. Be helpful but brief.`;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function generateChatResponse(
  messages: ChatMessage[],
  sessionId: string
): Promise<string> {
  try {
    const context = await buildKnowledgeContext();
    const systemPrompt = buildSystemPrompt(context);

    const fullMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...messages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: fullMessages,
      max_tokens: 100,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || "I apologize, I'm having trouble responding right now. Please contact us directly at trade@pharmaoasis.com.";
  } catch (error) {
    console.error("AI Chat error:", error);
    return "I apologize, I'm experiencing technical difficulties. Please contact us directly at trade@pharmaoasis.com or call +44 7481 640640.";
  }
}

export function extractLeadInfo(messages: ChatMessage[]): {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  interest?: string;
} {
  const allText = messages.filter(m => m.role === "user").map(m => m.content).join(" ");
  
  const emailMatch = allText.match(/[\w.-]+@[\w.-]+\.\w+/);
  const phoneMatch = allText.match(/(?:\+44|0)[\d\s]{10,}/);
  
  return {
    email: emailMatch?.[0],
    phone: phoneMatch?.[0]?.replace(/\s/g, ""),
    interest: messages[0]?.content?.slice(0, 200),
  };
}
