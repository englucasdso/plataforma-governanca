import { GoogleGenAI, Type } from "@google/genai";

// Silenciando avisos de certificado se necessário
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function generateInsightsAnalysis(artifacts: any[]) {
    // Reduz o payload para economizar tokens e tempo de processamento
    const payloadEnvio = artifacts.map(a => ({
        titulo: a.titulo,
        produto: a.produto,
        subproduto: a.subproduto,
        responsavel: a.responsavel,
        ultima_atualizacao: a.ultima_atualizacao,
        tipo: a.tipo_mapa || a.tipo,
        link: a.link
    }));

    const systemInstruction = `Você é um Cientista de Dados Executivo analisando um banco de artefatos de dados e sistemas (Hub de Artefatos).
Você deve analisar a lista de artefatos enviados. Retorne uma leitura estruturada, inteligente e executiva.
Considere o seguinte:
- Avalie a saúde geral dos artefatos.
- Identifique artefatos críticos.
- Avalie documentação desatualizada e ausência de responsáveis.
- Identifique possíveis duplicidades.
- Verifique a distribuição por produto e principais riscos de governança.

Retorne SOMENTE o JSON solicitado, sem markdown ou texto adicional.`;

    const prompt = `Resumo da busca e quantidade: Foram retornados ${payloadEnvio.length} artefatos.
Aqui estão os resultados:
${JSON.stringify(payloadEnvio)}

Forneça a análise executiva em formato JSON, preenchendo cada chave solicitada com precisão.`;

    try {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("API Key não configurada no ambiente.");
        
        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        resumoExecutivo: {
                            type: Type.STRING,
                            description: "Resumo executivo da busca e quantidade de artefatos analisados."
                        },
                        saudeGeral: {
                            type: Type.STRING,
                            description: "Avaliação da saúde geral dos artefatos, incluindo documentação desatualizada e riscos de governança."
                        },
                        pontosAtencao: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "Bullet points contendo pontos de atenção, artefatos críticos, duplicidades e ausências (máximo 5)."
                        },
                        recomendacaoAcao: {
                            type: Type.STRING,
                            description: "O que a equipe/gestão deve fazer agora com base nessa análise."
                        }
                    },
                    required: ["resumoExecutivo", "saudeGeral", "pontosAtencao", "recomendacaoAcao"]
                }
            }
        });

        if (response.text) {
            let responseText = response.text;
            if (responseText.startsWith("\`\`\`json")) {
                responseText = responseText.replace(/\`\`\`json\n?|\`\`\`/g, "");
            }
            return JSON.parse(responseText);
        }
    } catch (err: any) {
        console.error("[AI Service] Falha no Gemini API:", err.message);
        throw new Error("Erro ao gerar insights analíticos: " + err.message);
    }
}
