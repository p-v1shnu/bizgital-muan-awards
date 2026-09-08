/**
 * The two sources the homepage highlight video (SiteSettings.homeHighlightVideoUrl)
 * is recognised from. Anything else is treated as unrecognised rather than
 * guessed at — an iframe pointed at the wrong kind of URL fails silently, which
 * is worse than the section not appearing at all.
 */
export type VideoProvider = 'youtube' | 'facebook';

/**
 * The host, without the subdomain that only says which client wrote the link.
 *
 * Shared by both readers below because they each had their own copy and the
 * copies disagreed: this one dropped `m.`, the id reader did not, so a link
 * from a phone was recognised as a YouTube link that no id could be got out
 * of — and a recognised provider with no id renders nothing. One function, so
 * "is this YouTube" and "which video" cannot answer differently again.
 */
function normalisedHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^(www|m|music)\./, '');
  } catch {
    return null;
  }
}

export function detectVideoProvider(url: string): VideoProvider | null {
  const host = normalisedHost(url);
  if (host === 'youtube.com' || host === 'youtu.be') return 'youtube';
  if (host === 'facebook.com' || host === 'fb.watch') return 'facebook';
  return null;
}

/**
 * What a YouTube id may be made of. Eleven characters of URL-safe base64 is
 * every id YouTube has ever issued.
 *
 * Checked rather than assumed, because the id is interpolated into the embed
 * address: `?v=../../foo` was carried through as an id and `.../embed/../../
 * foo` resolves, before the iframe is even created, to a different YouTube
 * page altogether. Refusing to recognise the link is the honest answer to one.
 */
const YOUTUBE_ID = /^[\w-]{11}$/;

/**
 * Pulls the 11-character video id out of every URL shape YouTube hands out —
 * watch, share (youtu.be), embed, Shorts and live links all point at the same
 * video, just spelled differently.
 *
 * `/live/…` is here for the same reason `m.` is handled in `normalisedHost`:
 * both were links the team could paste, save, and then find that the homepage
 * section had silently not appeared — `HighlightVideo` renders nothing when
 * the provider is recognised but no id can be got out of the address.
 */
function youtubeId(url: string): string | null {
  const host = normalisedHost(url);
  if (host !== 'youtube.com' && host !== 'youtu.be') return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const id =
    host === 'youtu.be'
      ? parsed.pathname.split('/')[1]
      : (parsed.searchParams.get('v') ??
        parsed.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/)?.[1]);

  return id && YOUTUBE_ID.test(id) ? id : null;
}

/**
 * YouTube's own thumbnail, no API key or auth required — the one provider
 * this works for. Facebook has no equivalent no-auth endpoint, which is why
 * homeHighlightThumbnailKey exists at all.
 *
 * `maxresdefault` (1280×720) is what a full-width homepage box needs to look
 * sharp rather than upscaled and soft — `hqdefault` (480×360) is what every
 * video has, `maxresdefault` only what was uploaded in HD. YouTube answers a
 * missing one with a 200 and a tiny grey placeholder rather than a 404, so a
 * caller cannot tell them apart from the URL alone; HighlightVideo checks the
 * loaded image's own size and falls back to `hqdefault` itself.
 */
export function youtubeThumbnailUrl(
  url: string,
  quality: 'maxresdefault' | 'hqdefault' = 'maxresdefault',
): string | null {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/${quality}.jpg` : null;
}

/**
 * `muted: false` is only for a video started by a real click — a genuine
 * user gesture, which is what lets a browser allow sound. `muted: true` is
 * for the autoplay-once-visible mode, where there is no click behind it and
 * every browser refuses anything louder.
 */
export function videoEmbedUrl(
  url: string,
  provider: VideoProvider,
  { muted }: { muted: boolean },
): string | null {
  if (provider === 'youtube') {
    const id = youtubeId(url);
    if (!id) return null;
    const params = new URLSearchParams({ autoplay: '1' });
    if (muted) params.set('mute', '1');
    return `https://www.youtube.com/embed/${id}?${params.toString()}`;
  }
  // Facebook's plugin iframe needs no SDK script, only a public post/video —
  // a private or friends-only video renders blank rather than erroring, which
  // is why the admin note says to check the video is public.
  //
  // `width` is not optional despite what the plugin's own docs imply: every
  // embed code Facebook's own "Embed" button generates includes it, and
  // without it the player never initialises — the iframe loads but stays
  // blank, which is what this looked like before this was added. The plugin
  // has no percentage/responsive width, so this asks for its maximum
  // (1280) and lets our own CSS (`size-full` on the iframe element) scale
  // the actual box to fit the container regardless. `show_text=false`
  // matches Facebook's generated code too — the post's caption text, which
  // would otherwise sit inside the plugin's own box beneath the video.
  //
  // `height` turned out not to be optional either: width alone rendered on
  // a neutral third-party host but stayed blank on the real site across
  // three browsers and a phone, and the one difference from Facebook's own
  // generated code (which always pairs width with a height) was this
  // missing param. 720 matches the 16:9 a 1280-wide box implies.
  const params = new URLSearchParams({
    href: url,
    autoplay: 'true',
    mute: muted ? '1' : '0',
    width: '1280',
    height: '720',
    show_text: 'false',
  });
  return `https://www.facebook.com/plugins/video.php?${params.toString()}`;
}
