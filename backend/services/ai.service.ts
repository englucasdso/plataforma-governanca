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
        t: a.titulo, // titulo
        p: a.produto, // produto
        s: a.subproduto, // subproduto
        r: a.responsavel, // responsavel
        d: a.ultima_atualizacao // data
    }));

    const systemInstruction = `Você é um Cientista de Dados Executivo analisando um banco de artefatos de dados e sistemas (Hub de Artefatos).
Você deve analisar a lista de artefatos enviados. Retorne uma leitura estruturada, inteligente e executiva.
Considere o seguinte:
- Avalie a saúde geral dos artefatos.
- Identifique artefatos críticos.
- Avalie documentação desatualizada e ausência de responsáveis.
- Identifique possíveis duplicidades.
- Verifique a distribuição por produto e principais riscos de governança.
`;

    const prompt = `Resumo da busca e quantidade: Foram retornados ${payloadEnvio.length} artefatos.
Aqui estão os resultados:
${JSON.stringify(payloadEnvio)}

Forneça a análise executiva em formato JSON, preenchendo cada chave solicitada com precisão.`;

    let lastError = null;

    // Tenta cada combinação de região e modelo
    for (const location of REGIOES_PARA_TESTAR) {
        for (const model of MODELOS_PARA_TESTAR) {
            try {
                console.log(`[AI Service] Testando Vertex AI - Região: ${location} | Modelo: ${model}`);
                
                // Inicializa o Google GenAI via Vertex AI
                const ai = new GoogleGenAI({ 
                    vertexai: { 
                        project: PROJECT_ID, 
                        location: location 
                    } 
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
                lastError = err;
                console.warn(`[AI Service] Falha na combinação [${location} - ${model}]: ${err.message}. Avançando para a próxima...`);
            }
        }
    }

    console.error("[AI Service] Todas as combinações de Região/Modelo do Vertex AI falharam. Acionando Fallback Local.", lastError);
    
    // Fallback Local se o Vertex AI não acessar (Ex: falta de credenciais ADC no ambiente atual)
    return {
        resumoExecutivo: `Análise Local (Fallback de IA): Foram analisados ${artifacts.length} artefatos. A conexão com o Vertex AI do projeto ${PROJECT_ID} não pôde ser estabelecida no momento devido a permissões de ambiente.`,
        saudeGeral: "Pela amostra de dados, os artefatos estão listados com campos básicos preenchidos. É essencial monitorar a taxa de preenchimento dos subprodutos e responsáveis.",
        pontosAtencao: [
            "Conexão com Vertex AI requer ADC (Application Default Credentials) configurado no servidor atual.",
            "Certifique-se que a Service Account da Cloud Run tenha permissões 'Vertex AI User'",
            "Alguns artefatos críticos podem necessitar revisão humana."
        ],
        recomendacaoAcao: "Valide as configurações de rede e permissões do Google Cloud IAM para habilitar a inteligência do Vertex AI em produção."
    };
}
