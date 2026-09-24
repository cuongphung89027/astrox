import type {MetadataRoute} from 'next';
export const dynamic='force-static';
export default function sitemap():MetadataRoute.Sitemap{return ['','/tuvi','/tarot','/cunghoangdao','/kinhdich','/battu','/thansohoc','/tuonghop','/banggia','/dieukhoan'].map(path=>({url:`https://theastrox.space${path}`,changeFrequency:'weekly',priority:path?0.7:1}));}
