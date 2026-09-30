export function groupThumbnailMessages(messages = []) {
  const rows = [];
  const groups = new Map();

  for (const message of messages) {
    if (!message.variationGroup) {
      rows.push(message);
      continue;
    }

    let group = groups.get(message.variationGroup);
    if (!group) {
      group = {
        id: `variation-${message.variationGroup}`,
        role: "assistant",
        variationGroup: message.variationGroup,
        variations: [],
        timestamp: message.timestamp,
      };
      groups.set(message.variationGroup, group);
      rows.push(group);
    }
    group.variations.push(message);
    group.variations.sort(
      (a, b) => Number(a.variationIndex || 0) - Number(b.variationIndex || 0),
    );
  }

  return rows;
}

export function clampOverlayPosition(position = {}) {
  return {
    x: Math.min(95, Math.max(5, Number(position.x) || 50)),
    y: Math.min(95, Math.max(5, Number(position.y) || 50)),
  };
}

export function buildVariationPrompts(direction, count = 3) {
  return Array.from({ length: count }, (_, index) =>
    [
      String(direction || "Create a high-performing YouTube thumbnail."),
      `Create variation ${index + 1} of ${count}.`,
      "Keep the core concept, but use a distinctly different composition, camera framing, and visual hierarchy.",
      "16:9, highly readable at small sizes, high contrast, emotionally compelling.",
    ].join(" "),
  );
}

export function variationStatus(count, expected = 3) {
  const complete = count >= expected;
  return {
    complete,
    label: complete
      ? `${expected} generated variations`
      : `${count} of ${expected} variations saved`,
  };
}

export function isIntegrationUnavailable(error) {
  const message = error instanceof Error ? error.message : String(error || "");
  return /not configured|AI_NOT_CONFIGURED/i.test(message);
}

export async function generateAndPersistVariations({
  prompts,
  generate,
  persist,
}) {
  const failures = [];
  let saved = 0;
  let missingIntegration = false;

  for (const [index, prompt] of prompts.entries()) {
    try {
      const generated = await generate(prompt, index);
      await persist(generated, index);
      saved += 1;
    } catch (error) {
      if (isIntegrationUnavailable(error)) missingIntegration = true;
      failures.push({ index, error });
    }
  }

  return { failures, missingIntegration, saved };
}
