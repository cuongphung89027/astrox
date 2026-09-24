"use client";
export type ReadingQuote={name:string;points:number};
let open:((quote:ReadingQuote,signal?:AbortSignal)=>Promise<boolean>)|null=null;
export function registerReadingConsent(handler:NonNullable<typeof open>){open=handler;return()=>{if(open===handler)open=null;};}
export async function confirmReading(quote:ReadingQuote,signal?:AbortSignal){if(!open)throw new Error('Chưa sẵn sàng xác nhận giá. Vui lòng tải lại trang.');if(!await open(quote,signal))throw new Error('Bạn đã hủy lượt luận giải. Chưa trừ Point.');}
