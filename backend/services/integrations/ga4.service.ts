import { GoogleAuth } from "google-auth-library";

const SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"];

let cachedAuth: GoogleAuth | null = null;

async function getAuth() {
  if (cachedAuth) return cachedAuth;
  
  const auth = new GoogleAuth({
    scopes: SCOPES,
  });
  
  cachedAuth = auth;
  return auth;
}

export async function checkStatus() {
  try {
    console.log("[GA4-AUTH] verificando ADC");
    const auth = await getAuth();
    // Verify if we can get credentials (implicitly checks ADC availability)
    const client = await auth.getClient();
    console.log("[GA4-AUTH] ADC OK");
    
    return {
      connected: true,
      authType: "adc",
      message: "Conectado via Google Cloud SDK"
    };
  } catch (error: any) {
    console.error("[GA4][ERRO] ao verificar ADC:", error.message);
    return {
      connected: false,
      authType: null,
      message: "Não configurado. Execute gcloud auth application-default login no terminal e reinicie o servidor."
    };
  }
}

