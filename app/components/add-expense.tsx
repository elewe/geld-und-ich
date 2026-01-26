"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Calendar, Check } from "lucide-react";

interface AddExpenseProps {
  pot: "spend" | "save" | "donate";
  potBalance: number;
  childName: string;
  onBack: () => void;
  onComplete: (amount: number, description: string, date: string) => void;
}

const potConfig = {
  spend: {
    emoji: "💰",
    title: "Ausgeben",
    color: "#A0472A",
    bgGradient: "from-[#FFE5DD] to-[#FFD4C8]",
  },
  save: {
    emoji: "🏦",
    title: "Sparen",
    color: "#2A5580",
    bgGradient: "from-[#D4E9F7] to-[#C4E0F0]",
  },
  donate: {
    emoji: "💝",
    title: "Spenden",
    color: "#8B5A9B",
    bgGradient: "from-[#FFE5F0] to-[#F5E5FF]",
  },
};

export function AddExpense({
  pot,
  potBalance,
  childName,
  onBack,
  onComplete,
}: AddExpenseProps) {
  const config = potConfig[pot];
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setDate(today);
  }, []);

  const amountValue = useMemo(() => Number(amount.replace(",", ".")) || 0, [amount]);
  const remainingBalance = potBalance - amountValue;
  const canSubmit =
    amountValue > 0 && description.trim().length > 0 && amountValue <= potBalance;

  const formatDate = (dateString: string) => {
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleDateString("de-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    setShowConfirmation(true);
    setTimeout(() => {
      onComplete(amountValue, description.trim(), date);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF9F0] via-[#F5F0FF] to-[#F0F9FF] text-[#5A4A6A]">
      <div className="sticky top-0 z-50 bg-white/80 shadow-sm backdrop-blur">
        <div className="relative mx-auto flex min-h-[72px] max-w-2xl items-center px-6">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F0E8F8] text-[#7B6B8F] transition active:scale-95"
            aria-label="Zurück"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
            <span className="text-2xl">{config.emoji}</span>
            <span className="text-xl font-semibold text-[#5A4A6A]">
              Ausgabe hinzufügen
            </span>
          </div>
          <div className="w-10" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl p-6">
        <AnimatePresence mode="wait">
          {!showConfirmation ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div
                className={`rounded-3xl bg-gradient-to-br ${config.bgGradient} p-6 text-center shadow-lg`}
              >
                <div className="text-4xl">{config.emoji}</div>
                <div className="mt-2 text-sm" style={{ color: config.color }}>
                  Aktueller {config.title}-Topf
                </div>
                <div
                  className="mt-1 text-5xl font-bold"
                  style={{ color: config.color }}
                >
                  CHF {potBalance.toFixed(2)}
                </div>
              </div>

              <div className="rounded-3xl bg-white/90 p-8 shadow-lg backdrop-blur">
                <div className="mb-8 text-center">
                  <div className="text-6xl">🛍️</div>
                  <div className="mt-4 text-3xl font-semibold text-[#5A4A6A]">
                    Was hast du gekauft?
                  </div>
                  <p className="mt-2 text-sm text-[#9B8BAB]">
                    Trage deine Ausgabe ein
                  </p>
                </div>

                <div className="mb-6">
                  <label className="mb-2 block text-sm font-semibold text-[#5A4A6A]">
                    Datum
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7B6B8F]" />
                    <input
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      className="w-full rounded-2xl bg-gradient-to-r from-[#F8F4FC] to-[#F4F8FC] py-4 pl-12 pr-5 text-base text-[#5A4A6A] focus:outline-none focus:ring-4 focus:ring-[#B8D5E8]"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="mb-2 block text-sm font-semibold text-[#5A4A6A]">
                    Wofür?
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="z.B. LEGO Set, Glacé, Buch..."
                    className="w-full rounded-2xl bg-gradient-to-r from-[#F8F4FC] to-[#F4F8FC] px-5 py-4 text-lg text-[#5A4A6A] placeholder:text-[#D0C0E0] focus:outline-none focus:ring-4 focus:ring-[#B8D5E8]"
                  />
                </div>

                <div className="mb-6">
                  <label className="mb-2 block text-sm font-semibold text-[#5A4A6A]">
                    Wie viel?
                  </label>
                  <div className="relative mb-2">
                    <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-5xl font-bold text-[#7B6B8F]">
                      CHF
                    </span>
                    <input
                      type="number"
                      step="0.10"
                      max={potBalance}
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-2xl bg-gradient-to-r from-[#F8F4FC] to-[#F4F8FC] py-5 pl-20 pr-4 text-center text-5xl font-bold text-[#5A4A6A] placeholder:text-[#D0C0E0] focus:outline-none focus:ring-4 focus:ring-[#B8D5E8]"
                    />
                  </div>

                  {amountValue > potBalance ? (
                    <div className="rounded-2xl bg-gradient-to-r from-[#FFE5DD] to-[#FFD4C8] p-3 text-center text-xs font-medium text-[#C65D3B]">
                      ⚠️ Du hast nicht genug im {config.title}-Topf
                    </div>
                  ) : amountValue > 0 ? (
                    <div className="rounded-2xl bg-gradient-to-r from-[#F5FFF5] to-[#F0F8FF] p-3 text-center text-xs text-[#5A4A6A]">
                      Übrig:{" "}
                      <span className="font-bold">
                        CHF {remainingBalance.toFixed(2)}
                      </span>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="w-full rounded-2xl bg-gradient-to-r from-[#A8D5E2] to-[#B8E6B8] px-4 py-5 text-lg font-semibold text-[#2A5A5A] shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Ausgabe eintragen
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex min-h-[400px] flex-col items-center justify-center gap-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.2,
                }}
                className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#B8E6B8] to-[#A8D5E2] text-white shadow-lg"
              >
                <Check className="h-12 w-12" strokeWidth={3} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-center text-5xl font-bold text-[#5A4A6A]"
              >
                Ausgabe eingetragen!
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="w-full max-w-sm rounded-3xl bg-white/90 p-6 text-center shadow-lg backdrop-blur"
              >
                <div className="text-lg text-[#9B8BAB]">{description.trim()}</div>
                <div className="mt-3 text-5xl font-bold text-[#C65D3B]">
                  -CHF {amountValue.toFixed(2)}
                </div>
                <div className="mt-2 text-sm text-[#9B8BAB]">
                  {formatDate(date)}
                </div>
                <div className="my-4 border-t border-[#F0E8F8]" />
                <div className="text-sm text-[#7B6B8F]">
                  Neuer {config.title}-Saldo
                </div>
                <div
                  className="mt-1 text-[32px] font-bold"
                  style={{ color: config.color }}
                >
                  CHF {(potBalance - amountValue).toFixed(2)}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
