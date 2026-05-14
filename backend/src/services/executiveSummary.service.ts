import { GoogleGenAI, Type } from "@google/genai";

export async function generateExecutiveSummary(artifacts: any[], queryInfo: any) {
    if (!artifacts || artifacts.length === 0) {
        throw new Error("No artifacts provided.");
    }

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("API Key não configurada no ambiente.");
    }
    const ai = new GoogleGenAI({ apiKey });
    
    // Reduce payload
    const payloadEnvio = artifacts.map(a => ({
        titulo: a.titulo,
        produto: a.produto,
        subproduto: a.subproduto,
        tipo_mapa: a.tipo_mapa,
        ultima_atualizacao: a.ultima_atualizacao,
        responsavel: a.responsavel,
        versao: a.versao,
        produto_servico: a.produto_servico,
        link: a.link
    }));

    const systemInstruction = `Você é um Estrategista de Dados Executivo focado na saúde e taxonomia de dados analíticos.
Você receberá um JSON contendo uma lista filtrada de artefatos de dados (mapas de tagueamento, documentos) para uma busca com o termo: "${queryInfo.term}".
Gere um resumo executivo semelhante a um status report. Seu objetivo é analisar apenas os resultados filtrados que foram passados.

O retorno deve ser ESTRITAMENTE o JSON solicitado, contendo as seguintes propriedades:
1) "titulo": um título executivo, ex "Status Report - Cartões - Aquisição"
2) "visaoGeral": visão geral em texto com total de mapas, quantidade/percentual por tipo e maturidade do grupo.
3) "detalhamento": array de objetos com "subproduto", "quantidade", "percentual" e "principaisJornadas" (jornadas inferidas do nome/titulo dos mapas do subproduto).
4) "pontosAtencao": array de strings com potenciais débitos (mapas legados, sem responsável, desatualizados, concentração, etc.).
5) "conclusao": uma frase curta, objetiva e final de conclusão executiva.

Não inclua formatação de blocos markdown. Apenas retorne JSON válido de acordo com o Schema.
`;

    const prompt = `Resultados da busca:
${JSON.stringify(payloadEnvio)}

Por favor, analise esses dados.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        titulo: {
                            type: Type.STRING,
                            description: "Ex: Status Report — [Assunto]"
                        },
                        visaoGeral: {
                            type: Type.STRING,
                            description: "Visão geral com dados do volume, maturação e tipos de mapas"
                        },
                        detalhamento: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    subproduto: { type: Type.STRING },
                                    quantidade: { type: Type.INTEGER },
                                    percentual: { type: Type.STRING },
                                    principaisJornadas: { type: Type.ARRAY, items: { type: Type.STRING } }
                                }
                            }
                        },
                        pontosAtencao: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        conclusao: {
                            type: Type.STRING,
                        }
                    },
                    required: ["titulo", "visaoGeral", "detalhamento", "pontosAtencao", "conclusao"]
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
        console.error("[Executive Summary] Falha no Gemini API:", err.message);
        throw new Error("Erro ao gerar resumo executivo no Gemini API. Verifique a API Key ou rede. (" + err.message + ")");
    }
}
