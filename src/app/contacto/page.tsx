import { ContactPageContent } from "@/components/public/contact-page-content";
import { getPublicSiteData } from "@/lib/public-site";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const siteData = await getPublicSiteData();

  return <ContactPageContent siteData={siteData} />;
}
