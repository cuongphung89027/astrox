import { siteConfig } from '../../services/admin/integration-api.mjs';
export const onRequestGet = ({ env, request }) =>
  siteConfig(env, new URL(request.url).searchParams.get('market') === 'US' ? 'US' : 'VN');
