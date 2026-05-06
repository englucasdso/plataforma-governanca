import { GoogleGenAI, Type } from "@google/genai";

const PROJECT_ID = "sala-performance-eagro";
const REGIOES_PARA_TESTAR = ["us-central1", "southamerica-east1", "us-east4", "us-east1"];
const MODELOS_PARA_TESTAR = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-3.0-pro",
    "gemini-3.1-pro",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-pro"
];

// Silenciando avisos de certificado (semelhante ao urllib3.disable_warnings e CA_BUNDLE no Python)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function generateInsightsAnalysis(artifacts: any[]) {
    // Reduz o payload para economizar tokens e tempo de processamento
    const payloadEnvio = artifacts.map(a => ({
        titulo: a.titulo,
        produto: a.produto,
        subproduto: a.subproduto,
        responsavel: a.responsavel,
        ultima_atualizacao: a.ultima_atualizacao,
        tipo: a.tipo,
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

Retorne SOMENTE o JSON solicitado, sem markdown ou texto adicional.
`;

    const prompt = `Resumo da busca e quantidade: Foram retornados ${payloadEnvio.length} artefatos.
Aqui estão os resultados:
${JSON.stringify(payloadEnvio)}

Forneça a análise executiva em formato JSON, preenchendo cada chave solicitada com precisão.`;

    for (const location of REGIOES_PARA_TESTAR) {
        for (const model of MODELOS_PARA_TESTAR) {
            try {
                console.log(`[AI Service] Testando Vertex AI - Região: ${location} | Modelo: ${model}`);
                
                const ai = new GoogleGenAI({ 
                    project: PROJECT_ID,
                    location: location,
                    vertexai: true
                });

                const response = await ai.models.generateContent({
                    model: model,
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
                    console.log(`[AI Service] Sucesso! Utilizou Região: ${location} | Modelo: ${model}`);
                    return JSON.parse(response.text);
                }
            } catch (err: any) {
                console.warn(`[AI Service] Falha na combinação [${location} - ${model}]: ${err.message}. Avançando para a próxima...`);
            }
        }
    }
    
    console.error("[AI Service] Todas as combinações de Região/Modelo falharam. Acionando fallback local.");
    
    // Fallback Local
    return {
        resumoExecutivo: `Análise Local (Fallback de IA): Foram analisados ${artifacts.length} artefatos. A conexão com o Vertex AI não pôde ser estabelecida no momento.`,
        saudeGeral: "Pela amostra de dados, os artefatos estão listados com campos básicos preenchidos. É essencial monitorar a taxa de preenchimento dos subprodutos e responsáveis.",
        pontosAtencao: [
            "Conexão com a inteligência artificial (Vertex AI) falhou em todas as regiões testadas.",
            "Certifique-se que o Application Default Credentials (ADC) e permissões de Vertex AI User estão configurados corretamente.",
            "Alguns artefatos críticos podem necessitar revisão humana."
        ],
        recomendacaoAcao: "Valide as configurações do IAM da Service Account para habilitar a inteligência do Gemini em produção."
    };
}
