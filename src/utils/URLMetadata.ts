export interface LinkData {
    title: string;
    description: string;
    icon: string;
    author: string;
    link: string;
    thumbnail: string;
    publisher: string;
}

import ogs from "open-graph-scraper-lite";
import { forwardProxy } from '@/api';
import { getUrlFinalSegment, logError } from './utils';

export interface LinkData {
    title: string;
    description: string;
    icon: string;
    author: string;
    link: string;
    thumbnail: string;
    publisher: string;
}

export const getURLMetadata = async (
    url: string
): Promise<LinkData | null> => {
    let linkData: LinkData = {
        title: '',
        description: '',
        icon: '',
        author: '',
        link: url,
        thumbnail: '',
        publisher: '',
    };

    if (!(url.startsWith("http") || url.startsWith("https"))) {
        url = "https://" + url;
    }
    try {
        let data = await forwardProxy(
            url,
            "GET",
            null,
            [
                {
                    "User-Agent":
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
                },
            ],
            5000,
            "text/html"
        );
        if (!data || data.status !== 200) {
            return null;
        }

        data.headers["Content-Type"].forEach((ele) => {
            if (!ele.includes("text/html")) {
                return getUrlFinalSegment(url);
            }
        });
        let html = data?.body;
        const metadata = await ogs({html});

        const metadataResult = {
            title: metadata?.result?.ogTitle || metadata?.result?.dcTitle || null,
            description: metadata?.result?.ogDescription || metadata?.result?.dcDescription || null,
            url: url,
            icon: metadata?.result?.favicon || null,
            thumbnail:
                (metadata?.result?.ogImage && metadata.result.ogImage[0]?.url) ||
                (metadata?.result?.twitterImage && metadata.result.twitterImage[0]?.url) ||
                null,
            author: metadata?.result?.author || null,
            publisher:
                metadata?.result?.ogArticlePublisher || metadata?.result?.dcPublisher || metadata?.result?.ogSiteName || null,
        };

        linkData = {
            title: metadataResult.title,
            description: metadataResult.description,
            icon: metadataResult.icon,
            author: metadataResult.author,
            link: url,
            thumbnail: metadataResult.thumbnail,
            publisher: metadataResult.publisher,
        };

        const doc = new DOMParser().parseFromString(html, "text/html");

        if (!linkData.title)
            linkData.title =
                doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
                        doc.querySelector("title")?.getAttribute("value") ||
                        doc.querySelector("title")?.getAttribute("no-title") ||
                        doc.title ||
                        "N/A";

        if (!linkData.description)
            linkData.description =
                doc.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
                        doc.querySelector('meta[name="description"]')?.getAttribute("content") ||
                        "N/A";

        if (!linkData.icon) {
            const iconLink =
            doc.querySelector('link[rel="icon"]')?.getAttribute("href") ||
                doc.querySelector('link[rel="shortcut icon"]')?.getAttribute("href") ||
                doc.querySelector('link[rel="alternate icon"]')?.getAttribute("href") ||
                doc.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href") ||
                "https://static.ghost.org/v5.0.0/images/link-icon.svg";
                linkData.icon = !iconLink.startsWith("http") ? new URL(iconLink, new URL(url).origin).href : iconLink;
            }
        linkData.icon = !linkData.icon.startsWith("http")
            ? new URL(linkData.icon, new URL(url).origin).href
            : linkData.icon;

        if (!linkData.author) linkData.author = doc.querySelector('meta[name="author"]')?.getAttribute("content") || null;

        if (!linkData.thumbnail) {
            const thumbnailLink = doc.querySelector('meta[property="og:image"]')?.getAttribute("content") || null;
            linkData.thumbnail =
                thumbnailLink && !thumbnailLink.startsWith("http")
                ? new URL(thumbnailLink, new URL(url).origin).href
                : thumbnailLink;
        }

        if (!linkData.publisher)
            linkData.publisher =
                doc.querySelector('meta[name="publisher"]')?.getAttribute("content") ||
                doc.querySelector('meta[property="og:site_name"]')?.getAttribute("content") ||
                new URL(url).origin ||
                null;

        return linkData;

        } catch (ex) {
            logError("Error fetching metadata:", ex);
    return null;
    }
};

export default getURLMetadata;
