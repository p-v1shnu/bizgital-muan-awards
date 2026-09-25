import { isIPv4, isIPv6 } from 'node:net';

/**
 * The part of an address that belongs to one subscriber.
 *
 * An IPv4 address is one connection. An IPv6 one is not: a home line or a
 * phone is handed a whole /64 and may pick any address inside it, so keying a
 * limit on the full address lets one person present as many. Everything that
 * counts "per address" keys on this instead.
 */
export function clientNetwork(ip: string | undefined): string | undefined {
  if (!ip) return ip;

  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  if (mapped) return mapped[1];
  if (isIPv4(ip)) return ip;

  const bare = ip.split('%')[0];
  if (!isIPv6(bare)) return ip;

  const groups = (part: string) =>
    part === ''
      ? []
      : part.split(':').flatMap((group) => (group.includes('.') ? ['0', '0'] : [group]));
  const [head, tail] = bare.split('::');
  const left = groups(head);
  const right = tail === undefined ? [] : groups(tail);
  const full = [...left, ...Array<string>(8 - left.length - right.length).fill('0'), ...right];

  return `${full
    .slice(0, 4)
    .map((group) => parseInt(group, 16).toString(16))
    .join(':')}::/64`;
}
