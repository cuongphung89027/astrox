import {reconcileAi} from './ai-operations.mjs';
import {WorkerEntrypoint} from 'cloudflare:workers';
import {publicFetch,internalFetch} from './handler.mjs';
import {handlePayosWebhook} from './payments.mjs';
// This named entrypoint is only reachable through a Cloudflare service binding.
// Never expose internalFetch from the default public handler.
export class AdminBackend extends WorkerEntrypoint {
 async fetch(request){return internalFetch(request,this.env);}
}
export class PaymentWebhook extends WorkerEntrypoint {
 async fetch(request){if(request.method!=='POST')return new Response(null,{status:405});return handlePayosWebhook(this.env,request);}
}
export default {fetch:publicFetch,async scheduled(controller,env){await reconcileAi(env,controller.scheduledTime);}};
