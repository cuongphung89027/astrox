import { handleAiUpgrade } from '../../../services/admin/integration-api.mjs';
export const onRequestPost = ({ request, env }) => handleAiUpgrade(request, env);
