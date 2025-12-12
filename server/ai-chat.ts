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
  const brandList = context.brands.map(b => b.name).join(", ");
  const categoryList = context.categories.map(c => c.name).join(", ");
  const productSamples = context.products.slice(0, 20).map(p => 
    `- ${p.name} (${p.brand}) - ${p.category}`
  ).join("\n");

  return `You are a helpful AI assistant for Pharma Oasis, a B2B pharmaceutical wholesale distributor based in the UK. You help visitors learn about our products and services.

COMPANY INFORMATION:
- Company: Pharma Oasis Limited
- Type: B2B Wholesale Pharmaceutical Distributor
- Location: UK with international distribution
- Customers: Pharmacies, online retailers, and wholesalers
- Licenses: MHRA WDA(H) licensed, GDP compliant

BUSINESS MODEL (IMPORTANT):
- We are a WHOLESALE supplier - we sell to businesses, not consumers
- We DO NOT display prices publicly - all pricing is quote-based
- Customers must register and be approved to receive wholesale pricing
- Quotes are provided by our sales team based on quantity requirements

BRANDS WE CARRY:
${brandList}

PRODUCT CATEGORIES:
${categoryList}

SAMPLE PRODUCTS:
${productSamples}

CONVERSATION GUIDELINES:
1. Be friendly, professional, and helpful
2. NEVER provide specific prices - explain that pricing is quote-based and depends on quantity
3. NEVER give medical advice - recommend consulting healthcare professionals
4. Guide visitors to register as customers or contact us for quotes
5. If they seem interested, politely ask for their contact details so our team can reach out
6. Keep responses concise but informative (2-3 paragraphs max)
7. If asked about topics outside pharmaceuticals/our business, politely redirect

LEAD CAPTURE:
When appropriate, try to collect visitor information:
- Name
- Company name
- Email or phone number
- What products they're interested in

If the visitor provides contact details, acknowledge them warmly and assure them our team will be in touch.

CONTACT INFORMATION:
- Email: ${context.companyInfo.contact_email || "trade@pharmaoasis.com"}
- Phone: ${context.companyInfo.contact_phone || "+44 7481 640640"}
- Registration: Encourage them to register at /register
- Contact page: /contact for general enquiries`;
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
      max_tokens: 500,
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
