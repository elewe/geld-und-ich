"use client";

import { motion } from "motion/react";

interface PotDetailProps {
  pot: "spend" | "save" | "invest" | "donate";
  balance: number;
  childName: string;
  onBack: () => void;
  onAddExpense?: () => void;
}

const potConfig = {
  spend: {
    emoji: "💰",
    title: "Ausgeben",
    color: "#A0472A",
    bgGradient: "from-[#FFE5DD] to-[#FFD4C8]",
    description:
      "Das ist Geld, das du jetzt für Dinge ausgeben kannst, die du möchtest oder brauchst.",
    tip: "Es ist okay, Geld auszugeben, aber denk nach, bevor du etwas kaufst!",
  },
  save: {
    emoji: "🏦",
    title: "Sparen",
    color: "#2A5580",
    bgGradient: "from-[#D4E9F7] to-[#C4E0F0]",
    description:
      "Geld, das du für besondere Dinge sparst, die du in der Zukunft wirklich möchtest.",
    tip: "Je mehr du sparst, desto grössere Dinge kannst du dir leisten!",
  },
  invest: {
    emoji: "🌱",
    title: "Investieren",
    color: "#3A7A3A",
    bgGradient: "from-[#D8F3D8] to-[#C8EBC8]",
    description:
      "Geld, das mit der Zeit wächst, wie eine Pflanze die grösser wird!",
    tip: "Sei geduldig - Investieren braucht Zeit zum Wachsen.",
  },
  donate: {
    emoji: "💝",
    title: "Spenden",
    color: "#8B5A9B",
    bgGradient: "from-[#FFE5F0] to-[#F5E5FF]",
    description:
      "Geld, mit dem du anderen hilfst und Gutes tust. Du kannst selbst entscheiden, wofür du spenden möchtest.",
    tip: "Anderen zu helfen macht die Welt zu einem besseren Ort!",
  },
};

const investSteps = [
  {
    icon: "🌱",
    badge: "SCHRITT 1",
    title: "Samen pflanzen",
    text: "Wenn du Geld in den Investier-Topf legst, ist es wie wenn du einen kleinen Samen pflanzt.",
  },
  {
    icon: "⏰",
    badge: "SCHRITT 2",
    title: "Warten & Geduld haben",
    text: "Samen brauchen Zeit zum Wachsen. Dein Geld braucht auch Zeit! Es kann Wochen, Monate oder sogar Jahre dauern.",
  },
  {
    icon: "🌳",
    badge: "SCHRITT 3",
    title: "Zuschauen wie es wächst!",
    text: "Dein Samen wird zu einem grossen Baum! Dein Geld wird mit der Zeit zu mehr Geld.",
  },
];

const investGrowth = [
  {
    emoji: "🌱",
    label: "Heute",
    amount: "CHF 10",
    initial: 40,
    height: 60,
    delay: 1,
  },
  {
    emoji: "🪴",
    label: "1 Jahr",
    amount: "CHF 12",
    initial: 60,
    height: 90,
    delay: 1.3,
  },
  {
    emoji: "🌳",
    label: "5 Jahre",
    amount: "CHF 16",
    initial: 90,
    height: 130,
    delay: 1.6,
  },
];

const currencyFormatter = new Intl.NumberFormat("de-CH", {
  style: "currency",
  currency: "CHF",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function PotDetail({
  pot,
  balance,
  childName,
  onBack,
  onAddExpense,
}: PotDetailProps) {
  const config = potConfig[pot];
  const trimmedName = childName.trim();
  const childLabel =
    !trimmedName || trimmedName === "Dein"
      ? trimmedName || "Dein"
      : trimmedName.match(/[sSßxXzZ]$/)
        ? `${trimmedName}'`
        : `${trimmedName}s`;
  const formattedBalance = currencyFormatter.format(balance);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF9F0] via-[#F5F0FF] to-[#F0F9FF]">
      <div className="sticky top-0 z-10 border-b border-white/40 bg-white/80 backdrop-blur shadow-sm">
        <div className="relative mx-auto flex min-h-[72px] max-w-2xl items-center gap-3 px-6">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F0E8F8] text-[#5A4A6A] shadow-sm transition active:scale-[0.98]"
            aria-label="Zurück"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-2 text-xl font-semibold text-[#5A4A6A]">
            <span aria-hidden="true">{config.emoji}</span>
            <span>
              {config.title}
              -Topf
            </span>
          </div>
          <div className="ml-auto h-10 w-10" aria-hidden="true" />
        </div>
      </div>

      <div className="px-6 pb-8 pt-6">
        <div className="mx-auto w-full max-w-2xl space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              className={`rounded-2xl bg-gradient-to-br ${config.bgGradient} p-6 text-center shadow-md`}
            >
              <div className="text-4xl">{config.emoji}</div>
              <div
                className="mt-3 text-xs font-medium"
                style={{ color: config.color }}
              >
                {childLabel} {config.title}
              </div>
              <div
                className="mt-1 text-4xl font-bold"
                style={{ color: config.color }}
              >
                {formattedBalance}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl bg-white/90 p-5 shadow-md backdrop-blur"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#A8D5E2] to-[#B8E6B8] text-lg">
                  💡
                </div>
                <div>
                  <div className="text-lg font-bold text-[#5A4A6A]">
                    Was ist {config.title}?
                  </div>
                  <p className="mt-2 text-base text-[#7B6B8F]">
                    {config.description}
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-gradient-to-r from-[#FFF5F0] to-[#F5FFF5] p-4">
                <div className="text-sm font-medium text-[#5A4A6A]">
                  💫 {config.tip}
                </div>
              </div>
            </motion.div>
          </div>

          {pot === "invest" && (
            <div className="space-y-4">
              {investSteps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="rounded-2xl bg-white/90 p-5 text-[#5A4A6A] shadow-sm backdrop-blur"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#D8F3D8] to-[#C8EBC8] text-lg">
                      {step.icon}
                    </div>
                    <div>
                      <div className="inline-flex rounded-full bg-[#B8E6B8] px-2 py-1 text-[10px] font-bold text-[#3A7A3A]">
                        {step.badge}
                      </div>
                      <div className="mt-2 text-base font-bold text-[#5A4A6A]">
                        {step.title}
                      </div>
                      <p className="mt-2 text-sm text-[#7B6B8F]">
                        {step.text}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="rounded-2xl bg-white/90 p-6 shadow-sm backdrop-blur"
              >
                <div className="text-center text-base font-bold text-[#5A4A6A]">
                  Schau wie es wächst
                </div>
                <div className="mt-4 flex h-[150px] items-end justify-around gap-2">
                  {investGrowth.map((bar) => (
                    <div
                      key={bar.label}
                      className="flex flex-col items-center gap-2"
                    >
                      <motion.div
                        className="flex w-14 flex-col items-center justify-end rounded-t-xl bg-gradient-to-t from-[#B8E6B8] to-[#D8F3D8] pb-3"
                        initial={{ height: bar.initial }}
                        animate={{ height: bar.height }}
                        transition={{ duration: 2, delay: bar.delay }}
                      >
                        <div className="text-lg">{bar.emoji}</div>
                        <div className="text-xs font-bold text-[#3A7A3A]">
                          {bar.amount}
                        </div>
                        <div className="text-[10px] text-[#4A8F4A]">
                          {bar.label}
                        </div>
                      </motion.div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl bg-gradient-to-r from-[#FFF5F0] to-[#F5FFF5] p-3 text-center text-sm font-medium text-[#5A4A6A]">
                  <strong>Je länger du wartest</strong>, desto mehr wächst es!
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="rounded-2xl bg-gradient-to-br from-[#A8D5E2] to-[#B8E6B8] p-5 text-[#2F5E4F] shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">💡</div>
                  <div>
                    <div className="text-base font-bold">Denk daran</div>
                    <div className="mt-2 text-sm">
                      Investieren ist für Geld, das du nicht sofort brauchst. Es
                      ist der beste Weg, um dein Geld grösser werden zu lassen!
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {(pot === "spend" || pot === "save" || pot === "donate") &&
            balance > 0 &&
            onAddExpense && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                onClick={onAddExpense}
                className="mx-auto flex min-h-11 w-full max-w-2xl items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FFB4A2] to-[#A8D5E2] px-4 py-5 text-lg font-semibold text-white shadow-lg transition active:scale-[0.98]"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Ausgabe hinzufügen</span>
              </motion.button>
            )}
        </div>
      </div>
    </div>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M12.5 4.5 7 10l5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 4.5v11M4.5 10h11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
