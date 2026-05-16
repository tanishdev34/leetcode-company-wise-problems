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

interface ContestReminderProps {
  title: string;
  titleSlug: string;
  startTime: number;
  baseUrl?: string;
}

const CONTEST_QUOTES = [
  { text: "Pressure is a privilege. It only comes to those who earn it.", author: "Billie Jean King" },
  { text: "You miss 100% of the contests you don't enter.", author: "—" },
  { text: "Champions keep playing until they get it right.", author: "Billie Jean King" },
  { text: "Rating is just a number. The reps are the real prize.", author: "—" },
  { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
];

function pickQuote(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return CONTEST_QUOTES[h % CONTEST_QUOTES.length];
}

export default function ContestReminderEmail({
  title,
  titleSlug,
  startTime,
  baseUrl,
}: ContestReminderProps) {
  const startDate = new Date(startTime * 1000);
  const formattedTime = startDate.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  const dayLabel = startDate.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const dayNum = startDate.getDate();
  const monthLabel = startDate.toLocaleDateString("en-US", { month: "short" }).toUpperCase();

  const contestUrl = `https://leetcode.com/contest/${titleSlug}`;
  const quote = pickQuote(titleSlug);

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
          <Preview>🏆 {title} — get in. Show up. Climb.</Preview>

          <Container className="max-w-[560px] mx-auto my-[40px] px-[16px]">
            {/* ── Brand Header ── */}
            <Section className="pb-[16px]">
              <Row>
                <Column className="align-middle">
                  <Text className="m-0 text-[18px] font-bold tracking-tight text-[#f4f4f6]">
                    LC <span style={{ color: "#fbbf24" }}>Arena</span>
                  </Text>
                </Column>
                <Column align="right" className="align-middle">
                  <Text className="m-0 text-[10px] text-[#5a5a64] tracking-[0.15em] uppercase">
                    Contest Alert
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* ── Gradient Hero ── */}
            <Section
              className="rounded-[20px] overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, #f59e0b 0%, #f43f5e 55%, #a21caf 100%)",
                padding: "1px",
              }}
            >
              <Section
                className="rounded-[19px] px-[28px] py-[32px]"
                style={{
                  background:
                    "radial-gradient(120% 100% at 100% 0%, rgba(251,191,36,0.18) 0%, rgba(244,63,94,0.10) 35%, #0e0e14 75%)",
                }}
              >
                <Text className="m-0 text-[10px] font-semibold text-[#fde68a] tracking-[0.25em] uppercase">
                  🏆 Contest Starting Soon
                </Text>
                <Text className="m-0 mt-[10px] text-[26px] font-bold text-white leading-[1.2] tracking-tight">
                  {title}
                </Text>
                <Text className="m-0 mt-[8px] text-[13px] text-[#fde68a]/90 leading-[1.55]">
                  90 minutes. 4 problems. One shot to climb the leaderboard.
                </Text>

                <Section className="mt-[22px]">
                  <Button
                    href={contestUrl}
                    className="inline-block px-[22px] py-[12px] text-[13px] font-bold tracking-wide text-[#0a0a0c] bg-white rounded-[10px] no-underline box-border"
                  >
                    Join the contest →
                  </Button>
                </Section>
              </Section>
            </Section>

            {/* ── Meta strip ── */}
            <Section className="mt-[14px] rounded-[16px] border border-solid border-[#1f1f27] bg-[#101015] px-[20px] py-[16px]">
              <Row>
                <Column style={{ width: "72px" }}>
                  <Section
                    className="rounded-[10px] border border-solid border-[#f59e0b55] text-center"
                    style={{
                      backgroundColor: "#f59e0b14",
                      padding: "8px 0",
                      width: "64px",
                    }}
                  >
                    <Text className="m-0 text-[9px] font-bold text-[#fbbf24] tracking-[0.15em]">
                      {dayLabel} · {monthLabel}
                    </Text>
                    <Text className="m-0 text-[22px] font-bold text-[#f4f4f6] leading-none mt-[2px]">
                      {dayNum}
                    </Text>
                  </Section>
                </Column>
                <Column className="pl-[14px] align-top">
                  <Text className="m-0 text-[10px] text-[#5a5a64] tracking-[0.15em] uppercase">
                    Starts at
                  </Text>
                  <Text className="m-0 mt-[4px] text-[14px] font-semibold text-[#e4e4ea]">
                    {formattedTime}
                  </Text>
                  <Hr className="border-0 border-t border-solid border-[#1f1f27] my-[10px]" />
                  <Row>
                    <Column>
                      <Text className="m-0 text-[10px] text-[#5a5a64] tracking-[0.15em] uppercase">Duration</Text>
                      <Text className="m-0 mt-[2px] text-[12px] text-[#e4e4ea] font-medium">90 min</Text>
                    </Column>
                    <Column>
                      <Text className="m-0 text-[10px] text-[#5a5a64] tracking-[0.15em] uppercase">Problems</Text>
                      <Text className="m-0 mt-[2px] text-[12px] text-[#e4e4ea] font-medium">4</Text>
                    </Column>
                  </Row>
                </Column>
              </Row>
            </Section>

            {/* ── Motivation Quote ── */}
            <Section
              className="mt-[14px] rounded-[16px] px-[22px] py-[20px] border border-solid"
              style={{
                borderColor: "#7c2d12",
                background:
                  "linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(162,28,175,0.08) 100%)",
              }}
            >
              <Text className="m-0 text-[20px] leading-none text-[#fbbf24]">"</Text>
              <Text className="m-0 mt-[2px] text-[14px] italic text-[#e4e4ea] leading-[1.55]">
                {quote.text}
              </Text>
              <Text className="m-0 mt-[10px] text-[10px] text-[#fbbf24] tracking-[0.15em] uppercase font-semibold">
                — {quote.author}
              </Text>
            </Section>

            {/* ── Footer ── */}
            <Section className="mt-[20px] text-center">
              <Text className="m-0 text-[11px] text-[#5a5a64]">
                The rating is a side effect. The reps are the point.
              </Text>
              <Text className="m-0 mt-[8px] text-[10px] text-[#3f3f47] tracking-[0.1em]">
                LC Arena · contest alerts ·{" "}
                <a
                  href={`${baseUrl || "{{BASE_URL}}"}/dashboard`}
                  className="text-[#fbbf24] no-underline"
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

ContestReminderEmail.PreviewProps = {
  title: "Weekly Contest 420",
  titleSlug: "weekly-contest-420",
  startTime: Math.floor(Date.now() / 1000) + 7200,
} satisfies ContestReminderProps;
