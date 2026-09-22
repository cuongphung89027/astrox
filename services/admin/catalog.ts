import type { ServicePrice } from "./config.ts";
export type CatalogEntry = {id:string; module:string; name:string; group:string; policy:ServicePrice["policy"]; route:string};
/** Audited against the public topic/subtopic arrays on 2026-09-22. */
export const SERVICE_CATALOG: CatalogEntry[] = [
  {
    "id": "tuvi--tim-hieu-ban-than--tinh-cach",
    "module": "tuvi",
    "name": "Tính cách & khuynh hướng",
    "group": "Tìm hiểu bản thân",
    "policy": "profile",
    "route": "/tuvi?topic=tim-hieu-ban-than&sub=tinh-cach"
  },
  {
    "id": "tuvi--tim-hieu-ban-than--thu-thach",
    "module": "tuvi",
    "name": "Thử thách cá tính, hành trình",
    "group": "Tìm hiểu bản thân",
    "policy": "profile",
    "route": "/tuvi?topic=tim-hieu-ban-than&sub=thu-thach"
  },
  {
    "id": "tuvi--tim-hieu-ban-than--yeu-to-tac-dong",
    "module": "tuvi",
    "name": "Yếu tố tác động cuộc đời",
    "group": "Tìm hiểu bản thân",
    "policy": "profile",
    "route": "/tuvi?topic=tim-hieu-ban-than&sub=yeu-to-tac-dong"
  },
  {
    "id": "tuvi--tim-hieu-ban-than--no-nghiep",
    "module": "tuvi",
    "name": "Nợ nghiệp",
    "group": "Tìm hiểu bản thân",
    "policy": "profile",
    "route": "/tuvi?topic=tim-hieu-ban-than&sub=no-nghiep"
  },
  {
    "id": "tuvi--su-nghiep-tai-loc--tong-quan",
    "module": "tuvi",
    "name": "Tổng quan tài phú, sự nghiệp",
    "group": "Sự nghiệp & tiền tài",
    "policy": "profile",
    "route": "/tuvi?topic=su-nghiep-tai-loc&sub=tong-quan"
  },
  {
    "id": "tuvi--su-nghiep-tai-loc--con-nguoi-cong-viec",
    "module": "tuvi",
    "name": "Con người trong công việc",
    "group": "Sự nghiệp & tiền tài",
    "policy": "profile",
    "route": "/tuvi?topic=su-nghiep-tai-loc&sub=con-nguoi-cong-viec"
  },
  {
    "id": "tuvi--su-nghiep-tai-loc--nganh-nghe",
    "module": "tuvi",
    "name": "Ngành nghề phù hợp",
    "group": "Sự nghiệp & tiền tài",
    "policy": "profile",
    "route": "/tuvi?topic=su-nghiep-tai-loc&sub=nganh-nghe"
  },
  {
    "id": "tuvi--su-nghiep-tai-loc--loi-khuyen-tc",
    "module": "tuvi",
    "name": "Lời khuyên tài chính & sự nghiệp",
    "group": "Sự nghiệp & tiền tài",
    "policy": "profile",
    "route": "/tuvi?topic=su-nghiep-tai-loc&sub=loi-khuyen-tc"
  },
  {
    "id": "tuvi--van-trinh-su-nghiep--van-trinh-cong-danh",
    "module": "tuvi",
    "name": "Vận trình công danh",
    "group": "Vận trình sự nghiệp",
    "policy": "profile",
    "route": "/tuvi?topic=van-trinh-su-nghiep&sub=van-trinh-cong-danh"
  },
  {
    "id": "tuvi--hieu-ban-doi--hieu-ban-doi-sub",
    "module": "tuvi",
    "name": "Hiểu bạn đời",
    "group": "Hiểu bạn đời, mối quan hệ",
    "policy": "profile",
    "route": "/tuvi?topic=hieu-ban-doi&sub=hieu-ban-doi-sub"
  },
  {
    "id": "tuvi--hieu-ban-doi--tac-dong-nguoi-ngoai",
    "module": "tuvi",
    "name": "Tác động người ngoài",
    "group": "Hiểu bạn đời, mối quan hệ",
    "policy": "profile",
    "route": "/tuvi?topic=hieu-ban-doi&sub=tac-dong-nguoi-ngoai"
  },
  {
    "id": "tuvi--hieu-ban-doi--hai-nguoi",
    "module": "tuvi",
    "name": "Hai người — động lực mối quan hệ",
    "group": "Hiểu bạn đời, mối quan hệ",
    "policy": "profile",
    "route": "/tuvi?topic=hieu-ban-doi&sub=hai-nguoi"
  },
  {
    "id": "tuvi--tinh-duyen-hon-nhan--ban-trong-tinh-yeu",
    "module": "tuvi",
    "name": "Bạn trong tình yêu",
    "group": "Tình duyên & hôn nhân",
    "policy": "profile",
    "route": "/tuvi?topic=tinh-duyen-hon-nhan&sub=ban-trong-tinh-yeu"
  },
  {
    "id": "tuvi--tinh-duyen-hon-nhan--ai-thu-hut",
    "module": "tuvi",
    "name": "Ai bị thu hút bởi bạn?",
    "group": "Tình duyên & hôn nhân",
    "policy": "profile",
    "route": "/tuvi?topic=tinh-duyen-hon-nhan&sub=ai-thu-hut"
  },
  {
    "id": "tuvi--tinh-duyen-hon-nhan--kieu-nguoi-gap",
    "module": "tuvi",
    "name": "Những kiểu người thường gặp trong tình yêu",
    "group": "Tình duyên & hôn nhân",
    "policy": "profile",
    "route": "/tuvi?topic=tinh-duyen-hon-nhan&sub=kieu-nguoi-gap"
  },
  {
    "id": "tuvi--tinh-duyen-hon-nhan--ca-tinh-phu-hop",
    "module": "tuvi",
    "name": "Cá tính, chính tinh phù hợp",
    "group": "Tình duyên & hôn nhân",
    "policy": "profile",
    "route": "/tuvi?topic=tinh-duyen-hon-nhan&sub=ca-tinh-phu-hop"
  },
  {
    "id": "tuvi--tinh-duyen-hon-nhan--tong-quan-ban-doi",
    "module": "tuvi",
    "name": "Tổng quan bạn đời",
    "group": "Tình duyên & hôn nhân",
    "policy": "profile",
    "route": "/tuvi?topic=tinh-duyen-hon-nhan&sub=tong-quan-ban-doi"
  },
  {
    "id": "tuvi--tinh-duyen-hon-nhan--nhan-dinh-hon-nhan",
    "module": "tuvi",
    "name": "Nhận định hôn nhân",
    "group": "Tình duyên & hôn nhân",
    "policy": "profile",
    "route": "/tuvi?topic=tinh-duyen-hon-nhan&sub=nhan-dinh-hon-nhan"
  },
  {
    "id": "tuvi--tinh-duyen-hon-nhan--tinh-cach-con-cai",
    "module": "tuvi",
    "name": "Tính cách con cái",
    "group": "Tình duyên & hôn nhân",
    "policy": "profile",
    "route": "/tuvi?topic=tinh-duyen-hon-nhan&sub=tinh-cach-con-cai"
  },
  {
    "id": "tuvi--vi-sao-toi-la-toi--su-menh",
    "module": "tuvi",
    "name": "Vì sao tôi lại là tôi",
    "group": "Vì sao tôi lại là tôi",
    "policy": "profile",
    "route": "/tuvi?topic=vi-sao-toi-la-toi&sub=su-menh"
  },
  {
    "id": "tuvi--hoc-hanh-thi-cu--hoc-hanh-2026",
    "module": "tuvi",
    "name": "Học hành, thi cử 2026",
    "group": "Học hành, thi cử 2026",
    "policy": "profile",
    "route": "/tuvi?topic=hoc-hanh-thi-cu&sub=hoc-hanh-2026"
  },
  {
    "id": "tuvi--doi-cong-viec-2026--doi-viec-2026",
    "module": "tuvi",
    "name": "Có nên thay đổi công việc năm 2026?",
    "group": "Có nên thay đổi công việc năm 2026?",
    "policy": "profile",
    "route": "/tuvi?topic=doi-cong-viec-2026&sub=doi-viec-2026"
  },
  {
    "id": "tuvi--tieu-van-2026--tong-quan-2026",
    "module": "tuvi",
    "name": "Tổng quan 2026",
    "group": "Tiểu vận 2026",
    "policy": "profile",
    "route": "/tuvi?topic=tieu-van-2026&sub=tong-quan-2026"
  },
  {
    "id": "tuvi--tieu-van-2026--sunghiep-2026",
    "module": "tuvi",
    "name": "Sự nghiệp 2026",
    "group": "Tiểu vận 2026",
    "policy": "profile",
    "route": "/tuvi?topic=tieu-van-2026&sub=sunghiep-2026"
  },
  {
    "id": "tuvi--tieu-van-2026--tienbac-2026",
    "module": "tuvi",
    "name": "Tiền bạc 2026",
    "group": "Tiểu vận 2026",
    "policy": "profile",
    "route": "/tuvi?topic=tieu-van-2026&sub=tienbac-2026"
  },
  {
    "id": "tuvi--tieu-van-2026--tinhcam-2026",
    "module": "tuvi",
    "name": "Tình cảm 2026",
    "group": "Tiểu vận 2026",
    "policy": "profile",
    "route": "/tuvi?topic=tieu-van-2026&sub=tinhcam-2026"
  },
  {
    "id": "tuvi--tieu-van-2026--vanhan-2026",
    "module": "tuvi",
    "name": "Vận hạn 2026",
    "group": "Tiểu vận 2026",
    "policy": "profile",
    "route": "/tuvi?topic=tieu-van-2026&sub=vanhan-2026"
  },
  {
    "id": "tuvi--cau-hoi-xuat-ngoai--danh-gia-co-hoi",
    "module": "tuvi",
    "name": "Đánh giá cơ hội xa xứ",
    "group": "Câu hỏi xuất ngoại",
    "policy": "profile",
    "route": "/tuvi?topic=cau-hoi-xuat-ngoai&sub=danh-gia-co-hoi"
  },
  {
    "id": "tuvi--cau-hoi-xuat-ngoai--co-nen-di-xa",
    "module": "tuvi",
    "name": "Bạn có nên đi xa phát triển",
    "group": "Câu hỏi xuất ngoại",
    "policy": "profile",
    "route": "/tuvi?topic=cau-hoi-xuat-ngoai&sub=co-nen-di-xa"
  },
  {
    "id": "tuvi--cau-hoi-xuat-ngoai--nam-co-loi",
    "module": "tuvi",
    "name": "Năm có lợi cho di chuyển",
    "group": "Câu hỏi xuất ngoại",
    "policy": "profile",
    "route": "/tuvi?topic=cau-hoi-xuat-ngoai&sub=nam-co-loi"
  },
  {
    "id": "tuvi--cau-hoi-tien-tai--tiem-nang-giau",
    "module": "tuvi",
    "name": "Tiềm năng giàu có",
    "group": "Câu hỏi tiền tài",
    "policy": "profile",
    "route": "/tuvi?topic=cau-hoi-tien-tai&sub=tiem-nang-giau"
  },
  {
    "id": "tuvi--cau-hoi-tien-tai--hop-lam-chu",
    "module": "tuvi",
    "name": "Bạn có hợp làm chủ?",
    "group": "Câu hỏi tiền tài",
    "policy": "profile",
    "route": "/tuvi?topic=cau-hoi-tien-tai&sub=hop-lam-chu"
  },
  {
    "id": "tuvi--cau-hoi-tien-tai--co-thua-huong",
    "module": "tuvi",
    "name": "Bạn có được thừa hưởng",
    "group": "Câu hỏi tiền tài",
    "policy": "profile",
    "route": "/tuvi?topic=cau-hoi-tien-tai&sub=co-thua-huong"
  },
  {
    "id": "tuvi--cau-hoi-tien-tai--hop-bds",
    "module": "tuvi",
    "name": "Bạn có hợp làm về bất động sản?",
    "group": "Câu hỏi tiền tài",
    "policy": "profile",
    "route": "/tuvi?topic=cau-hoi-tien-tai&sub=hop-bds"
  },
  {
    "id": "tuvi--cau-hoi-tien-tai--xu-huong-nha",
    "module": "tuvi",
    "name": "Xu hướng nhà cửa",
    "group": "Câu hỏi tiền tài",
    "policy": "profile",
    "route": "/tuvi?topic=cau-hoi-tien-tai&sub=xu-huong-nha"
  },
  {
    "id": "tuvi--cau-hoi-su-nghiep--moi-truong-phu-hop",
    "module": "tuvi",
    "name": "Môi trường phù hợp",
    "group": "Câu hỏi sự nghiệp",
    "policy": "profile",
    "route": "/tuvi?topic=cau-hoi-su-nghiep&sub=moi-truong-phu-hop"
  },
  {
    "id": "tuvi--cau-hoi-su-nghiep--hop-to-chuc",
    "module": "tuvi",
    "name": "Bạn có hợp tổ chức truyền thống",
    "group": "Câu hỏi sự nghiệp",
    "policy": "profile",
    "route": "/tuvi?topic=cau-hoi-su-nghiep&sub=hop-to-chuc"
  },
  {
    "id": "tuvi--cau-hoi-su-nghiep--don-bay",
    "module": "tuvi",
    "name": "Yếu tố đòn bẩy sự nghiệp",
    "group": "Câu hỏi sự nghiệp",
    "policy": "profile",
    "route": "/tuvi?topic=cau-hoi-su-nghiep&sub=don-bay"
  },
  {
    "id": "tuvi--cau-hoi-su-nghiep--nen-hoc-cao",
    "module": "tuvi",
    "name": "Bạn có nên học cao",
    "group": "Câu hỏi sự nghiệp",
    "policy": "profile",
    "route": "/tuvi?topic=cau-hoi-su-nghiep&sub=nen-hoc-cao"
  },
  {
    "id": "tuvi--xu-huong-dai-van--dien-bien-40nam",
    "module": "tuvi",
    "name": "Diễn biến 40 năm",
    "group": "Xu hướng đại vận",
    "policy": "profile",
    "route": "/tuvi?topic=xu-huong-dai-van&sub=dien-bien-40nam"
  },
  {
    "id": "tuvi--xu-huong-dai-van--thien-thoi-dia-loi",
    "module": "tuvi",
    "name": "Thiên thời địa lợi",
    "group": "Xu hướng đại vận",
    "policy": "profile",
    "route": "/tuvi?topic=xu-huong-dai-van&sub=thien-thoi-dia-loi"
  },
  {
    "id": "tuvi--xu-huong-dai-van--bieu-do-10nam",
    "module": "tuvi",
    "name": "Biểu đồ 10 năm tới",
    "group": "Xu hướng đại vận",
    "policy": "profile",
    "route": "/tuvi?topic=xu-huong-dai-van&sub=bieu-do-10nam"
  },
  {
    "id": "tuvi--period--today",
    "module": "tuvi",
    "name": "Vận trình · Hôm nay",
    "group": "Vận trình",
    "policy": "period",
    "route": "/tuvi"
  },
  {
    "id": "zodiac--period--today",
    "module": "zodiac",
    "name": "Dự báo · Hôm nay",
    "group": "Dự báo",
    "policy": "period",
    "route": "/cunghoangdao"
  },
  {
    "id": "tuvi--period--week",
    "module": "tuvi",
    "name": "Vận trình · Tuần này",
    "group": "Vận trình",
    "policy": "period",
    "route": "/tuvi"
  },
  {
    "id": "zodiac--period--week",
    "module": "zodiac",
    "name": "Dự báo · Tuần này",
    "group": "Dự báo",
    "policy": "period",
    "route": "/cunghoangdao"
  },
  {
    "id": "tuvi--period--month",
    "module": "tuvi",
    "name": "Vận trình · Tháng này",
    "group": "Vận trình",
    "policy": "period",
    "route": "/tuvi"
  },
  {
    "id": "zodiac--period--month",
    "module": "zodiac",
    "name": "Dự báo · Tháng này",
    "group": "Dự báo",
    "policy": "period",
    "route": "/cunghoangdao"
  },
  {
    "id": "zodiac--tong-quan-la-so--bo-ba-loi",
    "module": "zodiac",
    "name": "Bộ ba cốt lõi",
    "group": "Luận giải bản đồ sao",
    "policy": "profile",
    "route": "/cunghoangdao"
  },
  {
    "id": "zodiac--tinh-yeu-cung--phong-cach-yeu",
    "module": "zodiac",
    "name": "Tình yêu & quan hệ",
    "group": "Luận giải bản đồ sao",
    "policy": "profile",
    "route": "/cunghoangdao"
  },
  {
    "id": "zodiac--su-nghiep-cung--huong-su-nghiep",
    "module": "zodiac",
    "name": "Sự nghiệp & tài chính",
    "group": "Luận giải bản đồ sao",
    "policy": "profile",
    "route": "/cunghoangdao"
  },
  {
    "id": "batu--tinh-cach",
    "module": "batu",
    "name": "Tính cách",
    "group": "Luận giải",
    "policy": "profile",
    "route": "/battu"
  },
  {
    "id": "batu--su-nghiep-tien-tai",
    "module": "batu",
    "name": "Sự nghiệp & tiền tài",
    "group": "Luận giải",
    "policy": "profile",
    "route": "/battu"
  },
  {
    "id": "batu--tinh-duyen",
    "module": "batu",
    "name": "Tình duyên",
    "group": "Luận giải",
    "policy": "profile",
    "route": "/battu"
  },
  {
    "id": "batu--suc-khoe",
    "module": "batu",
    "name": "Sức khoẻ",
    "group": "Luận giải",
    "policy": "profile",
    "route": "/battu"
  },
  {
    "id": "numerology--life-path",
    "module": "numerology",
    "name": "Số Chủ Đạo",
    "group": "Luận giải",
    "policy": "profile",
    "route": "/thansohoc"
  },
  {
    "id": "numerology--destiny",
    "module": "numerology",
    "name": "Sứ Mệnh",
    "group": "Luận giải",
    "policy": "profile",
    "route": "/thansohoc"
  },
  {
    "id": "numerology--inner-self",
    "module": "numerology",
    "name": "Nội tâm",
    "group": "Luận giải",
    "policy": "profile",
    "route": "/thansohoc"
  },
  {
    "id": "numerology--birth-grid",
    "module": "numerology",
    "name": "Biểu đồ ngày sinh",
    "group": "Luận giải",
    "policy": "profile",
    "route": "/thansohoc"
  },
  {
    "id": "numerology--cycles",
    "module": "numerology",
    "name": "Chu kỳ",
    "group": "Luận giải",
    "policy": "profile",
    "route": "/thansohoc"
  },
  {
    "id": "numerology--personal-year",
    "module": "numerology",
    "name": "Năm cá nhân",
    "group": "Luận giải",
    "policy": "period",
    "route": "/thansohoc"
  },
  {
    "id": "tarot--one",
    "module": "tarot",
    "name": "Rút 1 lá",
    "group": "Trải bài",
    "policy": "session",
    "route": "/tarot"
  },
  {
    "id": "tarot--three--ppf",
    "module": "tarot",
    "name": "Trải 3 lá · Quá khứ – Hiện tại – Tương lai",
    "group": "Trải bài",
    "policy": "session",
    "route": "/tarot"
  },
  {
    "id": "tarot--three--sao",
    "module": "tarot",
    "name": "Trải 3 lá · Tình huống – Hành động – Kết quả",
    "group": "Trải bài",
    "policy": "session",
    "route": "/tarot"
  },
  {
    "id": "tarot--three--soa",
    "module": "tarot",
    "name": "Trải 3 lá · Bản thân – Trở ngại – Lời khuyên",
    "group": "Trải bài",
    "policy": "session",
    "route": "/tarot"
  },
  {
    "id": "tarot--cross5",
    "module": "tarot",
    "name": "Thánh Giá Đơn Giản",
    "group": "Trải bài",
    "policy": "session",
    "route": "/tarot"
  },
  {
    "id": "tarot--relationship5",
    "module": "tarot",
    "name": "Tình Yêu & Mối Quan Hệ",
    "group": "Trải bài",
    "policy": "session",
    "route": "/tarot"
  },
  {
    "id": "tarot--celtic10",
    "module": "tarot",
    "name": "Celtic Cross",
    "group": "Trải bài",
    "policy": "session",
    "route": "/tarot"
  },
  {
    "id": "kinhdich--interpretation",
    "module": "kinhdich",
    "name": "Luận giải quẻ",
    "group": "Gieo quẻ",
    "policy": "session",
    "route": "/kinhdich"
  },
  {
    "id": "compat--pair",
    "module": "compat",
    "name": "Luận giải tương hợp đôi",
    "group": "Tương hợp",
    "policy": "profile",
    "route": "/tuonghop"
  }
];
export function addMissingServices(existing: ServicePrice[]): ServicePrice[] {
 const ids=new Set(existing.map(s=>s.id));
 return [...existing, ...SERVICE_CATALOG.filter(s=>!ids.has(s.id)).map(({id,module,name,policy})=>({id,module,name,policy,points:0,status:"draft" as const,prompt:"",chain:[]}))];
}
