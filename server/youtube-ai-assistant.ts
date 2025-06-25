import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function analyzeYouTubeFailure(url: string, errorMessage: string): Promise<{
  analysis: string;
  suggestions: string[];
  alternativeMethod?: string;
}> {
  try {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
    
    const prompt = `Tu es un expert en téléchargement de médias YouTube. 

URL: ${url}
Erreur: ${errorMessage}
ID Vidéo: ${videoId}

Analyse cette situation et fournis:
1. Une explication claire du problème
2. 3 suggestions pratiques pour l'utilisateur
3. Une méthode alternative si possible

Réponds en JSON avec: {"analysis": "...", "suggestions": ["...", "...", "..."], "alternativeMethod": "..."}

Concentre-toi sur des solutions réalistes et légales.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }]
    });

    const result = JSON.parse(response.content[0].text);
    return result;
  } catch (error) {
    console.error("AI analysis failed:", error);
    return {
      analysis: "YouTube a activé des protections anti-bot très strictes qui bloquent temporairement les téléchargements automatisés.",
      suggestions: [
        "Essayez à nouveau dans 10-15 minutes",
        "Utilisez une vidéo YouTube différente",
        "Privilégiez Instagram, TikTok ou autres plateformes"
      ],
      alternativeMethod: "Copiez le lien et utilisez un autre service de téléchargement YouTube en ligne"
    };
  }
}

export async function suggestAlternativePlatforms(videoTitle?: string): Promise<string[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return [
      "Recherchez le même contenu sur Instagram Reels",
      "Vérifiez TikTok pour des versions similaires",
      "Explorez Facebook pour des extraits du contenu"
    ];
  }

  try {
    const prompt = `Suggère 4 plateformes alternatives où on pourrait trouver du contenu similaire à: "${videoTitle || 'cette vidéo YouTube'}"

Réponds avec un array JSON de suggestions pratiques: ["suggestion1", "suggestion2", ...]`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }]
    });

    return JSON.parse(response.content[0].text);
  } catch (error) {
    return [
      "Recherchez sur Instagram Reels",
      "Explorez TikTok",
      "Vérifiez Facebook Reels",
      "Consultez Twitter/X pour des extraits"
    ];
  }
}