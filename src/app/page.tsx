import { HomePageContent } from "@/components/public/home-page-content";
import { getPublicSiteData } from "@/lib/public-site";

export const dynamic = "force-dynamic";

export default async function Home() {
  const siteData = await getPublicSiteData();

  return <HomePageContent siteData={siteData} />;
}
