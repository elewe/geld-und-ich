"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Camera, Plus } from "lucide-react";

interface WishFlowProps {
  childName: string;
  childEmoji: string;
  saveBalance: number;
  onBack: () => void;
  wishes?: Wish[];
  initialWishes?: Wish[];
  onCreateWish?: (wish: Omit<Wish, "id">) => Promise<Wish | null>;
  onRedeemWish?: (wish: Wish) => Promise<Wish | null>;
}

interface Wish {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  redeemed?: boolean;
  redeemedDate?: string;
}

type WishView = "list" | "create" | "detail";

const currencyFormatter = new Intl.NumberFormat("de-CH", {
  style: "currency",
  currency: "CHF",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function WishFlow({
  childName,
  childEmoji,
  saveBalance,
  onBack,
  wishes: wishesProp,
  initialWishes,
  onCreateWish,
  onRedeemWish,
}: WishFlowProps) {
  const [view, setView] = useState<WishView>("list");
  const [localWishes, setLocalWishes] = useState<Wish[]>(
    initialWishes ?? []
  );
  const [selectedWish, setSelectedWish] = useState<Wish | null>(null);
  const [newWishName, setNewWishName] = useState("");
  const [newWishPrice, setNewWishPrice] = useState("");
  const [newWishImage, setNewWishImage] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (initialWishes && localWishes.length === 0) {
      setLocalWishes(initialWishes);
    }
  }, [initialWishes, localWishes.length]);

  const formattedSaveBalance = useMemo(
    () => currencyFormatter.format(saveBalance),
    [saveBalance]
  );

  const handleBack = () => {
    if (view !== "list") {
      setView("list");
      return;
    }
    onBack();
  };

  const wishes = useMemo(() => wishesProp ?? localWishes, [localWishes, wishesProp]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  };

  const handleCreateWish = async () => {
    setFormError(null);
    const parsedPrice = Number(newWishPrice.replace(",", "."));
    if (!newWishName.trim() || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      setFormError("Bitte gib einen Namen und einen Preis ein.");
      showToast("Bitte gib einen Namen und einen Preis ein.");
      return;
    }

    const baseWish = {
      name: newWishName.trim(),
      price: parsedPrice,
      imageUrl: newWishImage || undefined,
    };

    let createdWish: Wish | null = null;
    if (onCreateWish) {
      createdWish = await onCreateWish(baseWish);
      if (!createdWish) {
        setFormError("Wunsch konnte nicht erstellt werden.");
        showToast("Wunsch konnte nicht erstellt werden.");
        return;
      }
    } else {
      createdWish = {
        id: `${Date.now()}`,
        ...baseWish,
      };
    }

    if (!wishesProp) {
      setLocalWishes((prev) => [createdWish as Wish, ...prev]);
    }
    setNewWishName("");
    setNewWishPrice("");
    setNewWishImage("");
    setView("list");
  };

  const handleRedeemWish = async (wishId: string) => {
    setFormError(null);
    const current = wishes.find((wish) => wish.id === wishId);
    if (!current) return;

    let updatedWish: Wish | null = null;
    if (onRedeemWish) {
      updatedWish = await onRedeemWish(current);
      if (!updatedWish) {
        setFormError("Wunsch konnte nicht eingelöst werden.");
        showToast("Wunsch konnte nicht eingelöst werden.");
        return;
      }
    } else {
      updatedWish = {
        ...current,
        redeemed: true,
        redeemedDate: new Date().toLocaleDateString("de-CH"),
      };
    }

    if (!wishesProp) {
      setLocalWishes((prev) =>
        prev.map((wish) => (wish.id === wishId ? (updatedWish as Wish) : wish))
      );
    }
    setSelectedWish(null);
    setView("list");
  };

  const handleViewDetail = (wish: Wish) => {
    setSelectedWish(wish);
    setView("detail");
  };

  const canAfford = (price: number) => saveBalance >= price;

  const renderWishImage = (wish: Wish) => {
    if (wish.imageUrl) {
      return (
        <img
          src={wish.imageUrl}
          alt={wish.name}
          className={`h-16 w-16 rounded-2xl object-cover ${
            wish.redeemed ? "grayscale" : ""
          }`}
        />
      );
    }

    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFE5DD] to-[#D4E9F7] text-3xl">
        {wish.redeemed ? "✅" : "🎁"}
      </div>
    );
  };

  const renderProgress = (wish: Wish, index: number) => {
    if (wish.redeemed) return null;
    const progress = wish.price > 0 ? Math.min((saveBalance / wish.price) * 100, 100) : 0;
    return (
      <div className="mt-4">
        <div className="h-3 rounded-full bg-[#F0E8F8]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, delay: 0.3 + index * 0.1 }}
            className="h-full rounded-full bg-gradient-to-r from-[#7EC8E3] to-[#A8D5E2]"
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-[#9B8BAB]">{formattedSaveBalance} gespart</span>
          <span className="font-semibold text-[#5A4A6A]">{Math.round(progress)}%</span>
        </div>
      </div>
    );
  };

  const renderListView = () => (
    <motion.div
      key="wish-list"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="mx-auto max-w-2xl rounded-3xl bg-gradient-to-br from-[#D4E9F7] to-[#C4E0F0] p-6 text-center shadow-lg">
        <div className="text-4xl">🏦</div>
        <div className="mt-2 text-sm text-[#3B6D9B]">Spar-Topf</div>
        <div className="mt-1 text-4xl font-bold text-[#2A5580]">
          {formattedSaveBalance}
        </div>
        <div className="mt-2 text-xs text-[#3B6D9B]">
          Bereit für deine Wünsche
        </div>
      </div>

      {wishes.length === 0 ? (
        <div className="rounded-3xl bg-white/90 p-12 text-center shadow-lg backdrop-blur">
          <div className="text-6xl">🎁</div>
          <div className="mt-4 text-2xl font-semibold text-[#5A4A6A]">
            Noch keine Wünsche
          </div>
          <p className="mt-2 text-sm text-[#9B8BAB]">
            Erstelle deinen ersten Wunsch und fang an zu sparen!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {wishes.map((wish, index) => {
            const affordable = canAfford(wish.price);
            return (
              <motion.button
                key={wish.id}
                type="button"
                onClick={() => handleViewDetail(wish)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileTap={{ scale: 0.97 }}
                className={`w-full rounded-3xl bg-white/90 p-6 text-left shadow-lg backdrop-blur transition ${
                  wish.redeemed ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  {renderWishImage(wish)}
                  <div className="flex-1">
                    <div
                      className={`text-lg font-bold text-[#5A4A6A] ${
                        wish.redeemed ? "line-through" : ""
                      }`}
                    >
                      {wish.name}
                    </div>
                    <div className="text-2xl font-bold text-[#2A5580]">
                      {currencyFormatter.format(wish.price)}
                    </div>
                  </div>
                  {!wish.redeemed && affordable && (
                    <span className="rounded-full bg-gradient-to-br from-[#B8E6B8] to-[#A8D5E2] px-3 py-1 text-xs font-semibold text-[#2A5A5A]">
                      Fertig! ✨
                    </span>
                  )}
                </div>
                {wish.redeemed ? (
                  <div className="mt-4 text-xs text-[#9B8BAB]">
                    Eingelöst am {wish.redeemedDate ?? "–"}
                  </div>
                ) : (
                  renderProgress(wish, index)
                )}
              </motion.button>
            );
          })}
        </div>
      )}

        <button
          type="button"
          onClick={() => setView("create")}
          className="mx-auto flex w-full max-w-2xl items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#A8D5E2] to-[#B8E6B8] px-4 py-5 text-lg font-semibold text-[#2A5A5A] shadow-lg transition active:scale-[0.98]"
        >
        <Plus className="h-5 w-5" />
        Neuen Wunsch erstellen
      </button>
    </motion.div>
  );

  const renderCreateView = () => {
    const parsedPrice = Number(newWishPrice.replace(",", "."));
    const isValid =
      newWishName.trim().length > 0 &&
      Number.isFinite(parsedPrice) &&
      parsedPrice > 0;

    return (
      <motion.div
        key="wish-create"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        <div className="rounded-3xl bg-white/90 p-8 text-center shadow-lg backdrop-blur">
          <div className="text-6xl">✨</div>
          <div className="mt-4 text-2xl font-semibold text-[#5A4A6A]">
            Was wünschst du dir?
          </div>
          <p className="mt-2 text-sm text-[#9B8BAB]">
            Lass uns für etwas Besonderes sparen
          </p>
        </div>

        <label
          htmlFor="wish-image"
          className="relative flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-[#D0C0E0] bg-gradient-to-r from-[#F8F4FC] to-[#F4F8FC] text-sm font-medium text-[#7B6B8F] transition hover:border-[#B8D5E8]"
        >
          <input
            id="wish-image"
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onloadend = () => {
                setNewWishImage(reader.result as string);
              };
              reader.readAsDataURL(file);
            }}
            className="hidden"
          />
          {newWishImage ? (
            <>
              <img
                src={newWishImage}
                alt="Wunschbild"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  setNewWishImage("");
                }}
                className="relative text-xs font-medium text-[#C65D3B] underline"
              >
                Bild entfernen
              </button>
            </>
          ) : (
            <>
              <Camera className="h-12 w-12 text-[#9B8BAB]" />
              <span>Bild hinzufügen (optional)</span>
            </>
          )}
        </label>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#5A4A6A]">
            Was ist es?
          </label>
          <input
            value={newWishName}
            onChange={(event) => setNewWishName(event.target.value)}
            placeholder="z.B. LEGO Weltraumstation"
            className="w-full rounded-2xl bg-gradient-to-r from-[#F8F4FC] to-[#F4F8FC] px-5 py-4 text-lg text-[#5A4A6A] placeholder:text-[#D0C0E0] focus:outline-none focus:ring-4 focus:ring-[#B8D5E8]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#5A4A6A]">
            Wie viel kostet es?
          </label>
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-bold text-[#7B6B8F]">
              CHF
            </span>
            <input
              type="number"
              min={0}
              step="0.10"
              value={newWishPrice}
              onChange={(event) => setNewWishPrice(event.target.value)}
              placeholder="0.00"
              className="w-full rounded-2xl bg-gradient-to-r from-[#F8F4FC] to-[#F4F8FC] py-4 pl-20 pr-5 text-lg text-[#5A4A6A] placeholder:text-[#D0C0E0] focus:outline-none focus:ring-4 focus:ring-[#B8D5E8]"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreateWish}
          disabled={!isValid}
          className="w-full rounded-2xl bg-gradient-to-r from-[#A8D5E2] to-[#B8E6B8] px-4 py-5 text-lg font-semibold text-[#2A5A5A] shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Wunsch erstellen
        </button>
        {formError ? (
          <div className="rounded-2xl border border-red-200 bg-white/90 px-4 py-3 text-sm text-red-700 shadow-sm">
            ❌ {formError}
          </div>
        ) : null}
      </motion.div>
    );
  };

  const renderDetailView = () => {
    if (!selectedWish) return null;
    const progress =
      selectedWish.price > 0
        ? Math.min((saveBalance / selectedWish.price) * 100, 100)
        : 0;
    const remaining = Math.max(selectedWish.price - saveBalance, 0);
    const affordable = canAfford(selectedWish.price);

    return (
      <motion.div
        key="wish-detail"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        <div className="mx-auto max-w-2xl rounded-3xl bg-white/90 p-8 shadow-lg backdrop-blur">
          {selectedWish.imageUrl ? (
            <img
              src={selectedWish.imageUrl}
              alt={selectedWish.name}
              className="aspect-video w-full rounded-2xl object-cover"
            />
          ) : (
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[#FFE5DD] via-[#D4E9F7] to-[#D8F3D8] text-5xl shadow-lg">
              🎁
            </div>
          )}

          <div className="mt-6 text-center">
            <div className="text-3xl font-bold text-[#5A4A6A]">
              {selectedWish.name}
            </div>
            <div className="mt-2 text-4xl font-bold text-[#2A5580]">
              {currencyFormatter.format(selectedWish.price)}
            </div>
          </div>

          <div className="mt-6">
            <div className="h-4 rounded-full bg-[#F0E8F8]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.5, delay: 0.3 }}
                className="h-full rounded-full bg-gradient-to-r from-[#7EC8E3] to-[#A8D5E8]"
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-[#9B8BAB]">{formattedSaveBalance} gespart</span>
              <span className="font-semibold text-[#5A4A6A]">
                {Math.round(progress)}%
              </span>
            </div>
          </div>

          {affordable ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 rounded-2xl bg-gradient-to-br from-[#B8E6B8] to-[#A8D5E2] p-6 text-center"
            >
              <div className="text-4xl">🎉</div>
              <div className="mt-3 text-2xl font-bold text-[#2A5A5A]">
                Du hast es geschafft!
              </div>
              <p className="mt-2 text-sm text-[#3A5A5A]">
                Du hast genug für diesen Wunsch gespart.
              </p>
            </motion.div>
          ) : (
            <div className="mt-6 rounded-2xl bg-gradient-to-r from-[#FFF5F0] to-[#F5FFF5] p-4 text-center text-sm text-[#5A4A6A]">
              Noch{" "}
              <strong>{currencyFormatter.format(remaining)}</strong> bis zum
              Ziel!
            </div>
          )}
        </div>

        {selectedWish.redeemed ? (
          <div className="mx-auto max-w-2xl rounded-2xl bg-gradient-to-r from-[#B8E6B8] to-[#A8D5E2] px-4 py-5 text-center text-lg font-semibold text-[#2A5A5A] shadow-lg">
            ✅ Wunsch eingelöst am {selectedWish.redeemedDate ?? "–"}
          </div>
        ) : (
          <button
            type="button"
            onClick={() =>
              affordable
                ? handleRedeemWish(selectedWish.id)
                : setView("list")
            }
            className="mx-auto flex w-full max-w-2xl items-center justify-center rounded-2xl bg-gradient-to-r from-[#A8D5E2] to-[#B8E6B8] px-4 py-5 text-lg font-semibold text-[#2A5A5A] shadow-lg transition active:scale-[0.98]"
          >
            {affordable ? "🎁 Wunsch einlösen" : "🏦 Weiter sparen"}
          </button>
        )}
      </motion.div>
    );
  };

  const headerTitle = view === "create" ? "Neuer Wunsch" : "Meine Wünsche";
  const headerEmoji = view === "create" ? "✨" : "⭐";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF9F0] via-[#F5F0FF] to-[#F0F9FF] text-[#5A4A6A]">
      <div className="sticky top-0 z-50 bg-white/80 shadow-sm backdrop-blur">
        <div className="relative mx-auto flex min-h-[72px] max-w-5xl items-center px-6">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F0E8F8] text-[#7B6B8F] transition active:scale-95"
            aria-label="Zurück"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
            <span className="text-2xl">{headerEmoji}</span>
            <span className="text-xl font-semibold text-[#5A4A6A]">
              {headerTitle}
            </span>
          </div>
          <div className="ml-auto text-sm text-[#9B8BAB]">{childEmoji}</div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl p-6">
        <AnimatePresence mode="wait">
          {view === "list" && renderListView()}
          {view === "create" && renderCreateView()}
          {view === "detail" && renderDetailView()}
        </AnimatePresence>
      </div>
      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 w-[90%] max-w-md -translate-x-1/2 rounded-2xl bg-white/90 px-4 py-3 text-sm text-[#5A4A6A] shadow-lg backdrop-blur">
          ⚠️ {toast}
        </div>
      ) : null}
    </div>
  );
}
