import fs from 'fs';
import path from 'path';
// Store session in the project root so the AI Agent can access it
// (Make sure to add .keyflow_session.json to .gitignore)
const CONFIG_PATH = path.join(process.cwd(), '.keyflow_session.json');
export const loadConfig = () => {
    // Priority 1: Environment Variable (Perfect for automated CI/AI scripts)
    if (process.env.KEYFLOW_REFRESH_TOKEN) {
        return {
            refreshToken: process.env.KEYFLOW_REFRESH_TOKEN,
            email: process.env.KEYFLOW_USER_EMAIL || 'env-user',
            uid: process.env.KEYFLOW_USER_UID || 'env-uid',
            lastLogin: new Date().toISOString(),
        };
    }
    // Priority 2: Local Session File
    if (!fs.existsSync(CONFIG_PATH)) {
        return null;
    }
    try {
        const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
        return JSON.parse(data);
    }
    catch (error) {
        console.error('Failed to parse config:', error);
        return null;
    }
};
export const saveConfig = (config) => {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
};
export const clearConfig = () => {
    if (fs.existsSync(CONFIG_PATH)) {
        fs.unlinkSync(CONFIG_PATH);
    }
};
