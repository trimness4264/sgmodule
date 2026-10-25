// Surge script for Bahamut Anime video-ad placement filtering.
// Native image placements and playback-related APIs pass through.
// Placement matching does not guarantee the media type of every future creative.
(function () {
    "use strict";

    function formValue(form, name) {
        for (const field of form.split("&")) {
            const separator = field.indexOf("=");
            if (separator < 0) continue;
            const key = decodeURIComponent(field.slice(0, separator).replace(/\+/g, " "));
            if (key === name) {
                return decodeURIComponent(field.slice(separator + 1).replace(/\+/g, " "));
            }
        }
        return "";
    }

    function isAnimeApp(app) {
        return app === "tw.com.gamer.anime" || /(?:^|\.)iphone\.tw\.com\.gamer\.anime$/.test(app);
    }

    try {
        // Response hooks pass through.
        if (typeof $response !== "undefined") {
            $done({});
            return;
        }

        const isAdmob = /^https:\/\/googleads\.g\.doubleclick\.net\/mads\/gma(?:\?|$)/.test($request.url);
        const isGam = /^https:\/\/pubads\.g\.doubleclick\.net\/gampad\/ads(?:\?|$)/.test($request.url);
        if (!isAdmob && !isGam) {
            $done({});
            return;
        }

        if ($request.method === "POST" && typeof $request.body === "string") {
            const app = formValue($request.body, "an");
            const format = formValue($request.body, "format");
            const placement = formValue($request.body, isAdmob ? "slotname" : "iu");
            const expected = isAdmob ? "1752047011" : "/1017768/ANI_REWARDED_IOS";
            if (isAnimeApp(app) && format === "interstitial_mb" && placement === expected) {
                const provider = isAdmob ? "admob" : "gam";
                console.log("[Bahamut Adblock] intercepted known " + provider + " video placement");
                $done({response: {status: 204, headers: {
                    "Cache-Control": "no-store",
                    "X-Bahamut-Adblock": "video-only-" + provider
                }}});
                return;
            }
        } else if ($request.method === "GET" && isGam) {
            const query = $request.url.slice($request.url.indexOf("?") + 1);
            if (formValue(query, "iu") === "/76486173/Embed/bt_ios_30s" &&
                isAnimeApp(formValue(query, "an")) &&
                /^xml_vast[234]$/.test(formValue(query, "output")) &&
                /^https:\/\/ani\.gamer\.com\.tw(?:\/|$)/.test(formValue(query, "description_url"))) {
                const originName = Object.keys($request.headers || {}).find(key => key.toLowerCase() === "origin");
                const origin = originName ? $request.headers[originName] : "";
                const headers = {
                    "Content-Type": "text/xml; charset=utf-8",
                    "Cache-Control": "no-store",
                    "Access-Control-Allow-Origin": origin || "*",
                    "X-Bahamut-Adblock": "video-only-vast"
                };
                if (origin) {
                    headers["Access-Control-Allow-Credentials"] = "true";
                    headers["Vary"] = "Origin";
                }
                console.log("[Bahamut Adblock] returning empty VAST for known video placement");
                $done({response: {status: 200, headers: headers, body: '<VAST version="3.0"></VAST>'}});
                return;
            }
        }
        $done({});
    } catch (_) {
        console.log("[Bahamut Adblock] unexpected request; passed through");
        $done({});
    }
})();
