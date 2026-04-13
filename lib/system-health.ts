import { google } from 'googleapis';

export type HealthStatus = {
    ok: boolean;
    errorType?: 'MISSING_TOKEN' | 'INVALID_GRANT' | 'API_ERROR' | 'REFRESH_FAILED';
    message?: string;
};

export async function checkSystemHealth(): Promise<HealthStatus> {
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
            return { 
                ok: false, 
                errorType: 'REFRESH_FAILED',
                message: 'Failed to generate access token from refresh token.' 
            };
        }

        return { ok: true };
    } catch (error: any) {
        console.error('System Health Check Error:', error.message);
        
        if (error.message?.includes('invalid_grant')) {
            return { 
                ok: false, 
                errorType: 'INVALID_GRANT',
                message: 'The Google Refresh Token has expired or been revoked.' 
            };
        }

        if (error.message?.includes('unauthorized_client')) {
            return { 
                ok: false, 
                errorType: 'API_ERROR',
                message: 'Unauthorized Client: Client ID or Secret in .env.local is incorrect or mismatched.'
            };
        }

        return { 
            ok: false, 
            errorType: 'API_ERROR',
            message: error.message || 'Unknown Google API error during health check.'
        };
    }
}
