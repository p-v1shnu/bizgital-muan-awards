import type React from 'react';

/**
 * Renders one block of team-written policy text.
 *
 * The privacy section used to be JSX, which meant its emphasis and bullets were
 * a developer's to place. Now the team writes the text and three conventions
 * carry the shape it needs — the same three the back office explains beside the
 * field:
 *
 *   a blank line starts a new paragraph
 *   a line beginning "- " is a bullet
 *   *stars* mark emphasis
 *
 * Deliberately not Markdown, and deliberately not HTML: no link syntax, no
 * headings, nothing that can inject markup. What comes out is React elements
 * built from text, so a stray `<script>` in the field is printed, not run.
 */
export function PolicyText({ body }: { body: string }) {
  const lines = body.split('\n').map((line) => line.trim());
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];

  function flushBullets() {
    if (bullets.length === 0) return;
    const items = bullets;
    bullets = [];
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="mt-2 list-disc space-y-1 pl-5">
        {items.map((item, index) => (
          <li key={index}>
            <Emphasis text={item} />
          </li>
        ))}
      </ul>,
    );
  }

  for (const line of lines) {
    if (line.startsWith('- ')) {
      bullets.push(line.slice(2));
      continue;
    }
    flushBullets();
    if (line === '') continue;
    blocks.push(
      <p key={`p-${blocks.length}`} className="mt-2">
        <Emphasis text={line} />
      </p>,
    );
  }
  flushBullets();

  return <>{blocks}</>;
}

/**
 * `*this*` becomes bold. Split on the pairs rather than replacing into a string,
 * so the emphasis is an element and the rest stays text — an unclosed star is
 * then printed as itself instead of swallowing the remainder of the sentence.
 */
function Emphasis({ text }: { text: string }) {
  const parts = text.split(/\*([^*]+)\*/g);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <b key={index} className="text-ink">
            {part}
          </b>
        ) : (
          part
        ),
      )}
    </>
  );
}
