package privacy

import "strings"

// Acquisition channels. They are computed once at ingestion from the referrer
// host and campaign parameters, so the dashboard can group traffic without
// keeping the raw inputs.
const (
	ChannelDirect   = "Direct"
	ChannelSearch   = "Organic search"
	ChannelSocial   = "Social"
	ChannelEmail    = "Email"
	ChannelPaid     = "Paid"
	ChannelReferral = "Referral"
	ChannelCampaign = "Campaign"
	ChannelInternal = "" // internal navigation is not an acquisition
)

var searchHosts = []string{
	"google.", "bing.com", "duckduckgo.com", "yahoo.", "yandex.", "baidu.com", "ecosia.org",
	"search.brave.com", "startpage.com", "qwant.com", "naver.com", "seznam.cz", "kagi.com",
	"perplexity.ai", "chatgpt.com", "you.com",
}

var socialHosts = []string{
	"facebook.com", "fb.me", "instagram.com", "t.co", "twitter.com", "x.com", "linkedin.com",
	"lnkd.in", "reddit.com", "news.ycombinator.com", "youtube.com", "youtu.be", "tiktok.com",
	"pinterest.", "mastodon.", "bsky.app", "threads.net", "tumblr.com", "vk.com", "weibo.com",
	"discord.com", "telegram.org", "t.me", "whatsapp.com", "quora.com", "medium.com",
	"com.google.android.gm", "lobste.rs",
}

var emailHosts = []string{
	"mail.google.com", "outlook.live.com", "outlook.office.com", "mail.yahoo.", "mail.proton.me",
	"com.google.android.gm", "fastmail.com", "mail.zoho.",
}

// Channel derives the acquisition channel for an arrival.
func Channel(referrer string, c Campaign) string {
	med := c.Medium
	switch {
	case containsAny(med, "cpc", "ppc", "paid", "cpm", "display", "ads"):
		return ChannelPaid
	case containsAny(med, "email", "e-mail", "newsletter"):
		return ChannelEmail
	case containsAny(med, "social"):
		return ChannelSocial
	}
	if referrer != "" {
		switch {
		case hostMatches(referrer, emailHosts):
			return ChannelEmail
		case hostMatches(referrer, searchHosts):
			return ChannelSearch
		case hostMatches(referrer, socialHosts):
			return ChannelSocial
		}
		return ChannelReferral
	}
	if c.Source != "" || c.Campaign != "" {
		return ChannelCampaign
	}
	return ChannelDirect
}

func containsAny(s string, subs ...string) bool {
	for _, sub := range subs {
		if strings.Contains(s, sub) {
			return true
		}
	}
	return false
}

func hostMatches(host string, patterns []string) bool {
	for _, p := range patterns {
		switch {
		case strings.HasSuffix(p, "."):
			// "google." matches google.com, google.co.uk, news.google.de …
			if strings.HasPrefix(host, p) || strings.Contains(host, "."+p) {
				return true
			}
		case host == p || strings.HasSuffix(host, "."+p):
			return true
		}
	}
	return false
}
