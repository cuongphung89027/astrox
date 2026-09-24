"use client";

import type { AdminPanelProps } from "../useAdminApi";
import s from "../AdminDashboard.module.css";

export function ApisPanel({ config, update, go }: AdminPanelProps) {
  return (
<section><h2>API và bộ tính dữ liệu</h2><p>Các thư viện bên dưới chạy trực tiếp trên website. Không cần API key hoặc URL máy chủ. Công tắc được backend kiểm tra trước khi luận giải.</p>
              {([['iztro','Ziwei / Tử Vi','iztro · astro.bySolar / horoscope · 12 cung, sao, đại vận và lưu chuyển'],['astronomy','Bản đồ sao / Hoàng Đạo','astronomy-engine · hành tinh, nhà và quá cảnh'],['lunar','Bát Tự','lunar-typescript · âm lịch, tứ trụ, thập thần'],['numerology','Thần Số Học','Thuật toán trong AstroX · chỉ số và chu kỳ'],['kinhdich','Kinh Dịch','Thuật toán Mai Hoa trong AstroX · quái, hào động, quẻ biến'],['tarot','Tarot','Bộ dữ liệu và thuật toán rút bài trong AstroX']] as const).map(([id,name,description])=><section className={s.record} key={id}><h3>{name}</h3><p>{description}</p><label><input type="checkbox" checked={config.engines[id].enabled} onChange={e=>update(d=>{d.engines[id].enabled=e.target.checked;})}/>Bật luận giải dùng bộ tính này</label></section>)}
              <h3>API bên ngoài</h3><button onClick={()=>go('providers')}>AI · endpoint, model và khóa</button><button onClick={()=>go('payos')}>PayOS · thanh toán và webhook</button><button onClick={()=>go('zalo')}>Zalo · OAuth và callback</button><button onClick={()=>go('walletbackend')}>Backend ví AstroX</button>
            </section>
  );
}
