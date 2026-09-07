/**
 * The two sources the homepage highlight video (SiteSettings.homeHighlightVideoUrl)
 * is recognised from. Anything else is treated as unrecognised rather than
 * guessed at — an iframe pointed at the wrong kind of URL fails silently, which
 * is worse than the section not appearing at all.
 */
export type VideoProvider = 'youtube' | 'facebook';

export function detectVideoProvider(url: string): VideoProvider | null {
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\.|^m\./, '');
  } catch {
    return null;
  }
  if (host === 'youtube.com' || host === 'youtu.be') return 'youtube';
  if (host === 'facebook.com' || host === 'fb.watch') return 'facebook';
  return null;
}

/**
 * Pulls the 11-character video id out of every URL shape YouTube hands out —
 * watch, share (youtu.be), embed and Shorts links all point at the same
 * video, just spelled differently.
 */
function youtubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return parsed.pathname.slice(1) || null;
    if (host === 'youtube.com') {
      const fromQuery = parsed.searchParams.get('v');
      if (fromQuery) return fromQuery;
      const match = parsed.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/);
      if (match) return match[1];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * YouTube's own thumbnail, no API key or auth required — the one provider
 * this works for. Facebook has no equivalent no-auth endpoint, which is why
 * homeHighlightThumbnailKey exists at all.
 */
export function youtubeThumbnailUrl(url: string): string | null {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

/**
 * The lightbox opens as a direct result of clicking the thumbnail — a real
 * user gesture — so both providers are asked to autoplay with sound rather
 * than muted, unlike a page-load autoplay a browser would simply refuse.
 */
export function videoEmbedUrl(url: string, provider: VideoProvider): string | null {
  if (provider === 'youtube') {
    const id = youtubeId(url);
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : null;
  }
  // Facebook's plugin iframe needs no SDK script, only a public post/video —
  // a private or friends-only video renders blank rather than erroring, which
  // is why the admin note says to check the video is public.
  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&autoplay=true&mute=0`;
}
