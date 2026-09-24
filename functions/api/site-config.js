import { siteConfig } from '../../services/admin/integration-api.mjs';
export const onRequestGet = ({ env }) => siteConfig(env);
