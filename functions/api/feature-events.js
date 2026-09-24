import {featureEvent} from '../../services/admin/feature-events.mjs';
export const onRequest=({request,env})=>featureEvent(request,env);
