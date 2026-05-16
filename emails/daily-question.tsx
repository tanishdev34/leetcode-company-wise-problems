import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Button,
  Row,
  Column,
  Hr,
  Tailwind,
  pixelBasedPreset,
} from "react-email";

interface DailyQuestionProps {
  questionTitle: string;
  questionLink: string;
  difficulty: string;
  topicTags?: { name: string }[];
  date?: string;
  baseUrl?: string;
  streak?: number;
}

const difficultyConfig: Record<
  string,
  { label: string; color: string; bg: string; ring: string; emoji: string }
> = {
  Easy:   { label: "Easy",   color: "#34d399", bg: "#10b9811f", ring: "#10b98155", emoji: "🌱" },
  Medium: { label: "Medium", color: "#fbbf24", bg: "#f59e0b1f", ring: "#f59e0b55", emoji: "⚡" },
  Hard:   { label: "Hard",   color: "#f87171", bg: "#ef44441f", ring: "#ef444455", emoji: "🔥" },
};

// Pool of motivational quotes — picked deterministically from the date so it's stable per send
const QUOTES = [
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Every accomplishment starts with the decision to try.", author: "John F. Kennedy" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "Hard things become easy when you make them a habit.", author: "—" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Small daily improvements are the key to staggering long-term results.", author: "James Clear" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
];

function pickQuote(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return QUOTES[h % QUOTES.length];
}

export default function DailyQuestionEmail({
  questionTitle,
  questionLink,
  difficulty,
  topicTags = [],
  date,
  baseUrl,
  streak,
}: DailyQuestionProps) {
  const config = difficultyConfig[difficulty] ?? {
    label: difficulty,
    color: "#a1a1aa",
    bg: "#a1a1aa1f",
    ring: "#a1a1aa55",
    emoji: "✦",
  };

  const today = new Date();
  const dateStr =
    date ||
    today.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const quote = pickQuote(date || today.toISOString().slice(0, 10));

  return (
    <Html lang="en">
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            extend: {
              fontFamily: {
                sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
                mono: ["ui-monospace", "SF Mono", "JetBrains Mono", "monospace"],
              },
            },
          },
        }}
      >
        <Head />
        <Body className="bg-[#08080a] font-sans m-0 p-0">
          <Preview>{config.emoji} {questionTitle} — your daily rep is ready</Preview>

          <Container className="max-w-[560px] mx-auto my-[40px] px-[16px]">
            {/* ── Brand Header ── */}
            <Section className="pb-[16px]">
              <Row>
                <Column className="align-middle">
                  <Text className="m-0 text-[18px] font-bold tracking-tight text-[#f4f4f6]">
                    LC <span style={{ color: "#a5b4fc" }}>Grind</span>
                  </Text>
                </Column>
                <Column align="right" className="align-middle">
                  <Text className="m-0 text-[10px] text-[#5a5a64] tracking-[0.15em] uppercase">
                    {dateStr}
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* ── Gradient Hero ── */}
            <Section
              className="rounded-[20px] overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, #4f46e5 0%, #7c3aed 45%, #c026d3 100%)",
                padding: "1px",
              }}
            >
              <Section
                className="rounded-[19px] px-[28px] py-[32px]"
                style={{
                  background:
                    "radial-gradient(120% 100% at 0% 0%, rgba(165,180,252,0.18) 0%, rgba(192,132,252,0.08) 35%, #0e0e14 75%)",
                }}
              >
                <Text className="m-0 text-[10px] font-semibold text-[#c7d2fe] tracking-[0.25em] uppercase">
                  Daily Problem · {config.emoji} {config.label}
                </Text>
                <Text className="m-0 mt-[10px] text-[26px] font-bold text-white leading-[1.2] tracking-tight">
                  {questionTitle}
                </Text>

                <Text className="m-0 mt-[8px] text-[13px] text-[#cbd5e1] leading-[1.55]">
                  One problem a day. That's how the streak compounds.
                </Text>

                {/* CTA */}
                <Section className="mt-[22px]">
                  <Button
                    href={questionLink}
                    className="inline-block px-[22px] py-[12px] text-[13px] font-semibold tracking-wide text-[#0a0a0c] bg-white rounded-[10px] no-underline box-border"
                  >
                    Solve it now  →
                  </Button>
                </Section>
              </Section>
            </Section>

            {/* ── Meta strip ── */}
            <Section className="mt-[14px] rounded-[16px] border border-solid border-[#1f1f27] bg-[#101015] px-[20px] py-[16px]">
              <Row>
                <Column>
                  <Text className="m-0 text-[10px] text-[#5a5a64] tracking-[0.15em] uppercase">
                    Difficulty
                  </Text>
                  <Text
                    className="m-0 mt-[6px] inline-block px-[10px] py-[3px] text-[11px] font-semibold tracking-wide rounded-[6px] border border-solid"
                    style={{
                      color: config.color,
                      borderColor: config.ring,
                      backgroundColor: config.bg,
                    }}
                  >
                    {config.emoji} {config.label}
                  </Text>
                </Column>
                {typeof streak === "number" && streak > 0 && (
                  <Column align="right">
                    <Text className="m-0 text-[10px] text-[#5a5a64] tracking-[0.15em] uppercase">
                      Your Streak
                    </Text>
                    <Text className="m-0 mt-[6px] text-[14px] font-bold text-[#fbbf24]">
                      🔥 {streak} day{streak === 1 ? "" : "s"}
                    </Text>
                  </Column>
                )}
              </Row>

              {topicTags.length > 0 && (
                <>
                  <Hr className="border-0 border-t border-solid border-[#1f1f27] my-[14px]" />
                  <Text className="m-0 text-[10px] text-[#5a5a64] tracking-[0.15em] uppercase">
                    Topics
                  </Text>
                  <Section className="mt-[8px]">
                    {topicTags.map((tag, i) => (
                      <Text
                        key={i}
                        className="inline-block px-[8px] py-[3px] mr-[5px] mb-[5px] text-[11px] text-[#cbd5e1] rounded-[5px] border border-solid border-[#27272f] bg-[#16161c]"
                      >
                        {tag.name}
                      </Text>
                    ))}
                  </Section>
                </>
              )}
            </Section>

            {/* ── Motivation Quote ── */}
            <Section
              className="mt-[14px] rounded-[16px] px-[22px] py-[20px] border border-solid"
              style={{
                borderColor: "#312e81",
                background:
                  "linear-gradient(135deg, rgba(79,70,229,0.12) 0%, rgba(192,38,211,0.08) 100%)",
              }}
            >
              <Text className="m-0 text-[20px] leading-none text-[#a5b4fc]">"</Text>
              <Text className="m-0 mt-[2px] text-[14px] italic text-[#e4e4ea] leading-[1.55]">
                {quote.text}
              </Text>
              <Text className="m-0 mt-[10px] text-[10px] text-[#a5b4fc] tracking-[0.15em] uppercase font-semibold">
                — {quote.author}
              </Text>
            </Section>

            {/* ── Footer ── */}
            <Section className="mt-[20px] text-center">
              <Text className="m-0 text-[11px] text-[#5a5a64]">
                Showing up beats talent. See you tomorrow.
              </Text>
              <Text className="m-0 mt-[8px] text-[10px] text-[#3f3f47] tracking-[0.1em]">
                LC Grind · daily practice ·{" "}
                <a
                  href={`${baseUrl || "{{BASE_URL}}"}/dashboard`}
                  className="text-[#818cf8] no-underline"
                >
                  Unsubscribe
                </a>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

DailyQuestionEmail.PreviewProps = {
  questionTitle: "Two Sum",
  questionLink: "https://leetcode.com/problems/two-sum/",
  difficulty: "Easy",
  topicTags: [{ name: "Array" }, { name: "Hash Table" }],
  date: "Monday, May 16, 2026",
  streak: 7,
} satisfies DailyQuestionProps;
