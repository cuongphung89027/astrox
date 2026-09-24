import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export function devSettings(env=process.env){
 const value=env.ADMIN_PORT||'8789';
 if(!/^\d+$/.test(value)||Number(value)<1||Number(value)>65535)throw new Error('ADMIN_PORT must be an integer from 1 to 65535');
 const port=Number(value),dataDir=env.ADMIN_DATA_DIR?resolve(env.ADMIN_DATA_DIR):fileURLToPath(new URL('../../.dev-admin',import.meta.url));
 return {port,dataDir,acceptsHost:host=>[`localhost:${port}`,`127.0.0.1:${port}`].includes(host)};
}
