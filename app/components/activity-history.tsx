"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Search } from "lucide-react";

interface Activity {
  id: string;
  date: string;
  pot: "spend" | "save" | "invest" | "donate";
  action: string;
  amount: number;
}

interface ActivityHistoryProps {
  childName: string;
  childEmoji: string;
  activities: Activity[];
  onBack: () => void;
}

const potConfig = {
  spend: { emoji: "💰", label: "Ausgeben", color: "#FF9580" },
  save: { emoji: "🏦", label: "Sparen", color: "#7EC8E3" },
  invest: { emoji: "🌱", label: "Investieren", color: "#8FD98F" },
  donate: { emoji: "💝", label: "Spenden", color: "#E0B0D5" },
};


export function ActivityHistory({
  childName,
  childEmoji,
  activities,
  onBack,
}: ActivityHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredActivities = useMemo(() => {
    const searchLower = searchQuery.trim().toLowerCase();
    if (!searchLower) return activities;
    return activities.filter((activity) => {
      const pot = potConfig[activity.pot];
      return (
        activity.action.toLowerCase().includes(searchLower) ||
        activity.date.toLowerCase().includes(searchLower) ||
        pot.label.toLowerCase().includes(searchLower) ||
        activity.amount.toString().includes(searchLower)
      );
    });
  }, [activities, searchQuery]);

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
            <span className="text-2xl">{childEmoji}</span>
            <span className="text-xl font-semibold text-[#5A4A6A]">
              Aktivitäten
            </span>
          </div>
          <div className="w-10" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl p-6">
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7B6B8F]" />
          <input
            type="text"
            placeholder="Suche nach Beschreibung, Datum oder Topf..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-2xl bg-white/90 py-3 pl-12 pr-4 text-sm text-[#5A4A6A] placeholder:text-[#9B8BAB] shadow-md backdrop-blur focus:outline-none focus:ring-4 focus:ring-[#B8D5E8]"
          />
        </div>

        {activities.length === 0 ? (
          <div className="rounded-3xl bg-white/90 p-12 text-center shadow-lg backdrop-blur">
            <div className="text-6xl">🎈</div>
            <div className="mt-4 text-xl font-semibold text-[#5A4A6A]">
              Noch keine Aktivitäten
            </div>
            <p className="mt-2 text-sm text-[#9B8BAB]">
              Sobald {childName} Geld bekommt oder ausgibt, erscheinen hier die
              Aktivitäten.
            </p>
          </div>
        ) : searchQuery && filteredActivities.length === 0 ? (
          <div className="rounded-3xl bg-white/90 p-12 text-center shadow-lg backdrop-blur">
            <div className="text-6xl">🔍</div>
            <div className="mt-4 text-xl font-semibold text-[#5A4A6A]">
              Keine Ergebnisse
            </div>
            <p className="mt-2 text-sm text-[#9B8BAB]">
              Keine Aktivitäten gefunden für "{searchQuery}"
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredActivities.map((activity, index) => {
              const pot = potConfig[activity.pot];
              const amount = Math.abs(activity.amount).toFixed(2);
              const amountPrefix = activity.amount > 0 ? "+" : "-";
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-2xl bg-white/90 p-4 shadow-md backdrop-blur"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-1 items-center gap-3">
                      <span className="text-2xl">{pot.emoji}</span>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-[#5A4A6A]">
                          {activity.action}
                        </div>
                        <div className="text-xs text-[#9B8BAB]">
                          {pot.label} · {activity.date}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`text-lg font-bold ${
                        activity.amount > 0
                          ? "text-[#4A8F4A]"
                          : "text-[#C65D3B]"
                      }`}
                    >
                      {amountPrefix}CHF {amount}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
