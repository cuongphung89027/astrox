import {clientError} from '../../services/admin/client-errors.mjs';
export const onRequest=({request,env})=>clientError(request,env);
