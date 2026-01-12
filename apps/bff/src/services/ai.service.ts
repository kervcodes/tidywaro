import { GoogleGenerativeAI, GoogleGenerativeAIError } from "@google/generative-ai";
import { SupabaseClient } from "@supabase/supabase-js";
import logger from "../utils/logger";
import { AIRateLimitError, AIAnalysisError, ExternalServiceError } from "../utils/errors";

// Validate API key at startup
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    logger.warn("GEMINI_API_KEY not set - AI features will be unavailable");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

interface WardrobeItem {
    id: string;
    category: string;
    image_url: string;
    color?: string;
}

interface ClothingAnalysis {
    category: string;
    subcategory: string;
    color: string;
    style: string;
    pattern: string;
    material: string;
    season: string[];
    occasions: string[];
    description: string;
    confidence: number;
}

const DEFAULT_ANALYSIS: ClothingAnalysis = {
    category: "uncategorized",
    subcategory: "unknown",
    color: "unknown",
    style: "casual",
    pattern: "solid",
    material: "unknown",
    season: ["spring", "summer", "fall", "winter"],
    occasions: ["everyday"],
    description: "Clothing item (AI analysis unavailable)",
    confidence: 0,
};

export class AIService {
    /**
     * Analyze a clothing image using Gemini Vision
     * Returns detected attributes like category, color, style, etc.
     */
    static async analyzeClothingImage(imageBuffer: Buffer, mimeType: string, retryCount = 0): Promise<ClothingAnalysis> {
        const MAX_RETRIES = 3;
        
        // Check if AI is available
        if (!genAI) {
            logger.warn("AI service not available (no API key)");
            return DEFAULT_ANALYSIS;
        }

        // Validate input
        if (!imageBuffer || imageBuffer.length === 0) {
            throw new AIAnalysisError("Invalid image buffer provided");
        }

        // Validate mime type
        const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
        if (!validMimeTypes.includes(mimeType)) {
            throw new AIAnalysisError(`Unsupported image type: ${mimeType}`, {
                supportedTypes: validMimeTypes
            });
        }

        try {
            logger.info("Starting AI clothing analysis", { 
                attempt: retryCount + 1,
                imageSize: `${(imageBuffer.length / 1024).toFixed(1)}KB`,
                mimeType 
            });

            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            const prompt = `You are an expert fashion analyst. Analyze this clothing item image and provide detailed attributes.

Return ONLY a valid JSON object with these exact fields:
{
  "category": "string - use an appropriate category name (common ones: tops, bottoms, dresses, outerwear, suits, shoes, accessories, bags, activewear, swimwear, loungewear, underwear, sleepwear, jumpsuits, formal wear) - you can create a new category if none fit well",
  "subcategory": "string - specific type like t-shirt, jeans, sneakers, blazer, suit jacket, dress pants, tie, vest, cardigan, hoodie, shorts, skirt, etc.",
  "color": "string - primary color (e.g., navy blue, charcoal gray, off-white, black, burgundy)",
  "style": "string - style category: casual, formal, business casual, sporty, bohemian, streetwear, classic, minimalist, vintage, smart casual, preppy, edgy",
  "pattern": "string - pattern type: solid, striped, plaid, floral, geometric, abstract, animal print, polka dot, pinstripe, herringbone, houndstooth, camo, tie-dye, or none",
  "material": "string - detected or likely material: cotton, denim, leather, wool, silk, polyester, linen, suede, canvas, knit, tweed, velvet, cashmere, nylon, fleece",
  "season": ["array of suitable seasons: spring, summer, fall, winter"],
  "occasions": ["array of suitable occasions: everyday, work, formal, business, party, sport, outdoor, date night, vacation, wedding, interview, gym, beach, home"],
  "description": "string - brief 1-2 sentence description of the item including notable features",
  "confidence": 0.0 to 1.0 - your confidence in this analysis
}

CATEGORY GUIDELINES:
- Be specific and accurate. Don't use "other" if a better category exists or can be created.
- Suits (full suit, suit jacket, blazer, sport coat, tuxedo) → "suits"
- Coats, jackets, parkas, windbreakers → "outerwear"  
- Jumpsuits, rompers, overalls → "jumpsuits"
- Pajamas, robes, nightgowns → "sleepwear"
- Hoodies, sweatshirts, leggings for lounging → "loungewear"
- Gym clothes, yoga pants, sports bras → "activewear"
- If the item doesn't fit common categories, create an appropriate lowercase category name.

Be precise and specific. Make your best educated guess based on visual cues.`;

            const imagePart = {
                inlineData: {
                    data: imageBuffer.toString("base64"),
                    mimeType: mimeType,
                },
            };

            // Add timeout to prevent hanging - 30 seconds for AI analysis
            const AI_TIMEOUT = 30000;
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('AI analysis timeout after 30 seconds')), AI_TIMEOUT);
            });

            const generatePromise = model.generateContent([prompt, imagePart]);
            const result = await Promise.race([generatePromise, timeoutPromise]);
            const response = await result.response;
            const text = response.text();

            // Clean up potential markdown code blocks
            const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
            
            let analysis: ClothingAnalysis;
            try {
                analysis = JSON.parse(jsonString) as ClothingAnalysis;
            } catch (parseError) {
                logger.error("Failed to parse AI response as JSON", { 
                    response: text.substring(0, 200),
                    error: (parseError as Error).message 
                });
                throw new AIAnalysisError("Failed to parse AI response", {
                    rawResponse: text.substring(0, 200)
                });
            }

            // Validate response structure
            if (!analysis.category || !analysis.subcategory) {
                logger.warn("AI response missing required fields", { analysis });
                throw new AIAnalysisError("AI response missing required fields");
            }

            logger.info("AI clothing analysis complete", { 
                category: analysis.category,
                subcategory: analysis.subcategory,
                confidence: analysis.confidence 
            });

            return analysis;
        } catch (error: any) {
            // Check if it's a rate limit error (429)
            const isRateLimitError = error.message?.includes('429') || 
                                     error.message?.includes('Too Many Requests') ||
                                     error.message?.includes('quota') ||
                                     error.message?.includes('RESOURCE_EXHAUSTED');
            
            if (isRateLimitError && retryCount < MAX_RETRIES) {
                // Extract retry delay from error message or use exponential backoff
                const retryMatch = error.message?.match(/retry in (\d+)/i);
                const baseDelay = retryMatch ? parseInt(retryMatch[1]) * 1000 : 10000;
                const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
                
                logger.warn(`Rate limited. Retrying in ${delay / 1000}s...`, { 
                    attempt: retryCount + 1,
                    maxRetries: MAX_RETRIES 
                });
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.analyzeClothingImage(imageBuffer, mimeType, retryCount + 1);
            }
            
            // Log detailed error info
            logger.error("AI clothing analysis failed", { 
                error: error.message,
                name: error.name,
                isRateLimitError,
                retriesExhausted: retryCount >= MAX_RETRIES,
                attempt: retryCount + 1,
            });
            
            // Throw appropriate error type
            if (isRateLimitError) {
                throw new AIRateLimitError(60); // Suggest 60 second retry
            }
            
            // If it's already our error type, rethrow
            if (error instanceof AIAnalysisError) {
                throw error;
            }
            
            // Handle timeout - return defaults rather than blocking
            if (error.message?.includes('timeout')) {
                logger.warn("AI analysis timed out, returning defaults");
                return DEFAULT_ANALYSIS;
            }
            
            // For network/service errors, return default values
            if (error.message?.includes('network') || error.message?.includes('fetch')) {
                logger.warn("Network error during AI analysis, returning defaults");
                return DEFAULT_ANALYSIS;
            }
            
            // Return defaults for other unexpected errors
            logger.warn("Returning default analysis due to error", { error: error.message });
            return DEFAULT_ANALYSIS;
        }
    }

    static async generateWeeklyPlan(
        supabase: SupabaseClient,
        userId: string,
        startDate: string
    ) {
        try {
            // 1. Fetch User's Wardrobe with full details
            const { data: items, error } = await supabase
                .from("wardrobe_items")
                .select("id, category, subcategory, image_url, color, style, occasions")
                .eq("user_id", userId);

            if (error) throw error;
            if (!items || items.length === 0) {
                throw new Error("No wardrobe items found. Please upload some clothes first.");
            }

            // 2. Categorize items for validation
            const categorizedItems = {
                tops: items.filter(i => 
                    ['tops', 't-shirt', 'shirt', 'blouse', 'sweater', 'hoodie', 'tank top', 'polo'].some(c => 
                        i.category?.toLowerCase().includes(c) || i.subcategory?.toLowerCase().includes(c)
                    )
                ),
                bottoms: items.filter(i => 
                    ['bottoms', 'pants', 'jeans', 'shorts', 'skirt', 'trousers', 'leggings'].some(c => 
                        i.category?.toLowerCase().includes(c) || i.subcategory?.toLowerCase().includes(c)
                    )
                ),
                dresses: items.filter(i => 
                    ['dress', 'jumpsuit', 'romper'].some(c => 
                        i.category?.toLowerCase().includes(c) || i.subcategory?.toLowerCase().includes(c)
                    )
                ),
                outerwear: items.filter(i => 
                    ['outerwear', 'jacket', 'coat', 'blazer', 'cardigan', 'vest'].some(c => 
                        i.category?.toLowerCase().includes(c) || i.subcategory?.toLowerCase().includes(c)
                    )
                ),
                shoes: items.filter(i => 
                    ['shoes', 'sneakers', 'boots', 'heels', 'sandals', 'loafers', 'footwear'].some(c => 
                        i.category?.toLowerCase().includes(c) || i.subcategory?.toLowerCase().includes(c)
                    )
                ),
                accessories: items.filter(i => 
                    ['accessories', 'bag', 'hat', 'scarf', 'belt', 'watch', 'jewelry', 'glasses', 'tie'].some(c => 
                        i.category?.toLowerCase().includes(c) || i.subcategory?.toLowerCase().includes(c)
                    )
                ),
            };

            // 3. Check if we have enough items for complete outfits
            const hasTops = categorizedItems.tops.length > 0;
            const hasBottoms = categorizedItems.bottoms.length > 0;
            const hasDresses = categorizedItems.dresses.length > 0;
            const hasShoes = categorizedItems.shoes.length > 0;

            // Need either (top + bottom) OR dress to make a complete outfit
            const canMakeOutfit = (hasTops && hasBottoms) || hasDresses;

            if (!canMakeOutfit) {
                const missing: string[] = [];
                if (!hasTops && !hasDresses) missing.push("tops");
                if (!hasBottoms && !hasDresses) missing.push("bottoms");
                
                throw new Error(
                    `Cannot create complete outfits. You're missing: ${missing.join(" and ")}. ` +
                    `Please upload at least one top and one bottom, or a dress/jumpsuit.`
                );
            }

            // Log wardrobe summary
            logger.info("Generating weekly plan", {
                userId,
                totalItems: items.length,
                tops: categorizedItems.tops.length,
                bottoms: categorizedItems.bottoms.length,
                dresses: categorizedItems.dresses.length,
                shoes: categorizedItems.shoes.length,
                outerwear: categorizedItems.outerwear.length,
            });

            // 2. Construct Prompt with clear outfit rules
            const prompt = `You are an expert personal stylist creating a 7-day outfit plan starting from ${startDate}.

WARDROBE INVENTORY (use ONLY these exact item IDs):
${JSON.stringify(items.map(i => ({
    id: i.id,
    category: i.category,
    subcategory: i.subcategory,
    color: i.color,
    style: i.style
})), null, 2)}

CATEGORIZED ITEMS AVAILABLE:
- Tops (${categorizedItems.tops.length}): ${categorizedItems.tops.map(i => i.id).join(', ') || 'NONE'}
- Bottoms (${categorizedItems.bottoms.length}): ${categorizedItems.bottoms.map(i => i.id).join(', ') || 'NONE'}
- Dresses/Jumpsuits (${categorizedItems.dresses.length}): ${categorizedItems.dresses.map(i => i.id).join(', ') || 'NONE'}
- Shoes (${categorizedItems.shoes.length}): ${categorizedItems.shoes.map(i => i.id).join(', ') || 'NONE'}
- Outerwear (${categorizedItems.outerwear.length}): ${categorizedItems.outerwear.map(i => i.id).join(', ') || 'NONE'}
- Accessories (${categorizedItems.accessories.length}): ${categorizedItems.accessories.map(i => i.id).join(', ') || 'NONE'}

CRITICAL OUTFIT RULES - FOLLOW EXACTLY:
1. EVERY outfit MUST have EITHER:
   - ONE top + ONE bottom (e.g., t-shirt + jeans)
   - OR ONE dress/jumpsuit (replaces both top and bottom)
2. NEVER put two tops together (no t-shirt + t-shirt, no shirt + blouse)
3. NEVER put two bottoms together (no jeans + shorts)
4. Add shoes if available (ONE pair per outfit)
5. Add ONE piece of outerwear if appropriate for weather
6. Add 0-2 accessories maximum
7. Colors should complement each other (avoid clashing)
8. Match style levels (don't mix formal with sporty)

OUTFIT STRUCTURE (follow this order):
1. Base: top+bottom OR dress
2. Optional: shoes (1 max)
3. Optional: outerwear (1 max)
4. Optional: accessories (0-2 max)

Return ONLY a valid JSON array with 7 objects:
[
  {
    "date": "YYYY-MM-DD",
    "day_of_week": "Monday",
    "occasion": "Work|Casual|Date Night|Weekend|Gym|Formal",
    "weather_summary": "Sunny, 22°C",
    "items": ["item_id_1", "item_id_2", "item_id_3"],
    "outfit_notes": "Brief styling note"
  }
]

IMPORTANT: Use ONLY item IDs from the wardrobe above. Do not invent new IDs.`;

            // 3. Call Gemini
            if (!genAI) {
                throw new ExternalServiceError("Gemini", "AI service not configured");
            }
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // 4. Parse JSON
            const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const plan = JSON.parse(jsonString);

            // 5. Validate the plan - ensure item IDs exist
            const validItemIds = new Set(items.map(i => i.id));
            for (const day of plan) {
                day.items = day.items.filter((id: string) => validItemIds.has(id));
                if (day.items.length === 0) {
                    logger.warn("Day has no valid items after filtering", { date: day.date });
                }
            }

            logger.info("Weekly plan generated successfully", {
                userId,
                daysPlanned: plan.length,
            });

            return plan;
        } catch (error: any) {
            logger.error("AI Generation failed", { error: error.message });
            throw new Error("Failed to generate plan: " + error.message);
        }
    }
}
