import 'server-only';
import { google } from 'googleapis';

export type HealthStatus = {
    ok: boolean;
    errorType?: 'MISSING_TOKEN' | 'INVALID_GRANT' | 'API_ERROR' | 'REFRESH_FAILED';
    message?: string;
};

let cachedHealth: HealthStatus | null = null;
let lastCheckTime = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export async function checkSystemHealth(): Promise<HealthStatus> {
    const now = Date.now();
    if (cachedHealth && (now - lastCheckTime < CACHE_DURATION)) {
        return cachedHealth;
    }

    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!refreshToken || refreshToken === 'placeholder') {
        return { 
            ok: false, 
            errorType: 'MISSING_TOKEN',
            message: 'GOOGLE_REFRESH_TOKEN is missing or placeholder in environment variables.' 
        };
    }

    if (!clientId || !clientSecret) {
        return { 
            ok: false, 
            errorType: 'API_ERROR',
            message: 'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing.' 
        };
    }

    try {
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        
        const { token } = await oauth2Client.getAccessToken();
        
        if (!token) {
            const result: HealthStatus = { 
                ok: false, 
                errorType: 'REFRESH_FAILED',
                message: 'Failed to generate access token from refresh token.' 
            };
            cachedHealth = result;
            lastCheckTime = Date.now();
            return result;
        }

        const result: HealthStatus = { ok: true };
        cachedHealth = result;
        lastCheckTime = Date.now();
        return result;
    } catch (error: any) {
        console.error('System Health Check Error:', error.message);
        
        let result: HealthStatus;
        if (error.message?.includes('invalid_grant')) {
            result = { 
                ok: false, 
                errorType: 'INVALID_GRANT',
                message: 'The Google Refresh Token has expired or been revoked.' 
            };
        } else if (error.message?.includes('unauthorized_client')) {
            result = { 
                ok: false, 
                errorType: 'API_ERROR',
                message: 'Unauthorized Client: Client ID or Secret in .env.local is incorrect or mismatched.'
            };
        } else {
            result = { 
                ok: false, 
                errorType: 'API_ERROR',
                message: error.message || 'Unknown Google API error during health check.'
            };
        }

        cachedHealth = result;
        lastCheckTime = Date.now();
        return result;
    }
}
