// src/lib/googleAuth.ts
import { JWT } from "google-auth-library";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];

export async function createAuth() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

    return new JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key.replace(/\\n/g, "\n"),
      keyId: serviceAccount.private_key_id,
      scopes: SCOPES,
    });
  }

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const privateKeyId = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID;

  if (clientEmail && privateKey && privateKeyId) {
    return new JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, "\n"),
      keyId: privateKeyId,
      scopes: SCOPES,
    });
  }

  throw new Error("Missing Google Service Account credentials in environment variables");
}