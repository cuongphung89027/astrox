import { handleAdmin } from '../../../services/admin/server.mjs';
export const onRequest = ({ request, env }) => handleAdmin(request, env);
