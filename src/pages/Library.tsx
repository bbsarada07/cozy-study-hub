import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Trophy, X, Star } from "lucide-react";
import { usePomodoroContext } from "@/contexts/PomodoroContext";

import libraryBg from "@/assets/library-room.png";
import bookshelfImg from "@/assets/features/bookshelf.png";
import aiLibrarianImg from "@/assets/features/ai-librarian.png";
import braindumpImg from "@/assets/features/braindump.png";
import groupStudyImg from "@/assets/features/group-study.png";
import storeImg from "@/assets/features/store.png";
import studyDeskImg from "@/assets/features/study-desk.png";

const FONT = "'Times New Roman', Times, serif";

const featureItems = [
  {
    id: "bookshelf",
    label: "Book Shelf",
    img: bookshelfImg,
    gridArea: "shelf1",
  },
  {
    id: "ai-assistant",
    label: "Ask the Librarian",
    img: aiLibrarianImg,
    gridArea: "shelf2",
  },
  {
    id: "braindump",
    label: "Brain Dump",
    img: braindumpImg,
    gridArea: "braindump",
  },
  {
    id: "study-desk",
    label: "Start Studying",
    img: studyDeskImg,
    gridArea: "studydesk",
  },
  {
    id: "group-study",
    label: "Group Study",
    img: groupStudyImg,
    gridArea: "groupstudy",
  },
  {
    id: "store",
    label: "Test Yourself",
    img: storeImg,
    gridArea: "store",
  },
];

const Library = () => {
  const navigate = useNavigate();
  const { startFocus } = usePomodoroContext();
  const [showCongrats, setShowCongrats] = useState(() => {
    return !localStorage.getItem("congrats_shown");
  });
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <img
        src={libraryBg}
        alt="Library"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Blur + warm overlay */}
      <div
        className="absolute inset-0"
        style={{
          backdropFilter: "blur(12px)",
          backgroundColor: "hsla(35, 30%, 85%, 0.55)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between px-5 py-4">
          {/* Profile */}
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-full px-4 py-2 transition-all"
            style={{
              backgroundColor: "hsla(36, 70%, 50%, 0.85)",
              fontFamily: FONT,
            }}
          >
            <User className="h-5 w-5 text-primary-foreground" />
            <span className="text-sm font-semibold text-primary-foreground">
              Profile
            </span>
          </button>

          {/* Leaderboard */}
          <button
            className="flex items-center gap-2 rounded-full px-4 py-2 transition-all"
            style={{
              backgroundColor: "hsla(36, 70%, 50%, 0.85)",
              fontFamily: FONT,
            }}
          >
            <Trophy className="h-5 w-5 text-primary-foreground" />
            <span className="text-sm font-semibold text-primary-foreground">
              Leaderboard
            </span>
          </button>
        </header>

        {/* Profile dropdown */}
        {profileOpen && (
          <div
            className="absolute left-5 top-16 z-50 w-56 rounded-2xl border border-secondary p-4 shadow-xl"
            style={{
              backgroundColor: "hsla(40, 25%, 94%, 0.95)",
              fontFamily: FONT,
            }}
          >
            <p className="mb-2 text-sm font-bold text-warm-brown">My Profile</p>
            <button
              onClick={() => navigate("/profile")}
              className="mb-1 w-full rounded-lg px-3 py-2 text-left text-sm text-warm-brown-light transition-colors hover:bg-secondary"
            >
              Edit Profile
            </button>
            <button className="mb-1 w-full rounded-lg px-3 py-2 text-left text-sm text-warm-brown-light transition-colors hover:bg-secondary">
              Settings
            </button>
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-warm-brown-light transition-colors hover:bg-secondary">
              Log Out
            </button>
          </div>
        )}

        {/* Feature grid */}
        <div className="flex flex-1 items-center justify-center px-4 py-6">
          <div
            className="grid w-full max-w-2xl gap-4"
            style={{
              gridTemplateColumns: "1fr 1fr 1fr",
              gridTemplateRows: "auto auto",
              gridTemplateAreas: `
                "shelf1 shelf2 studydesk"
                "braindump groupstudy store"
              `,
            }}
          >
            {featureItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === "braindump") navigate("/braindump");
                  if (item.id === "ai-assistant") navigate("/ask-librarian");
                  if (item.id === "study-desk") { startFocus(); navigate("/focus"); }
                }}
                className="group flex flex-col items-center gap-2 rounded-2xl p-3 transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95"
                style={{
                  gridArea: item.gridArea,
                  backgroundColor: "hsla(40, 30%, 96%, 0.85)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid hsla(36, 70%, 50%, 0.25)",
                }}
              >
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl sm:h-32 sm:w-32">
                  <img
                    src={item.img}
                    alt={item.label}
                    loading="lazy"
                    width={512}
                    height={512}
                    className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-110"
                  />
                </div>
                <span
                  className="text-center text-sm font-bold text-warm-brown sm:text-base"
                  style={{ fontFamily: FONT }}
                >
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Congratulations popup */}
      {showCongrats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            className="relative mx-4 w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl"
            style={{
              backgroundColor: "hsla(40, 30%, 96%, 0.97)",
              fontFamily: FONT,
            }}
          >
            <button
              onClick={() => { localStorage.setItem("congrats_shown", "true"); setShowCongrats(false); }}
              className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4 flex justify-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: "hsla(36, 70%, 50%, 0.2)" }}
              >
                <Star className="h-8 w-8" style={{ color: "hsl(36, 70%, 50%)" }} />
              </div>
            </div>

            <h2 className="mb-2 text-2xl font-bold text-warm-brown">
              🎉 Congratulations!
            </h2>
            <p className="mb-1 text-lg text-warm-brown-light">
              You've earned
            </p>
            <p
              className="mb-6 text-4xl font-bold"
              style={{ color: "hsl(36, 70%, 50%)" }}
            >
              250 Points
            </p>

            <button
              onClick={() => { localStorage.setItem("congrats_shown", "true"); setShowCongrats(false); }}
              className="w-full rounded-full bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-95"
            >
              OK, Let's Go!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;
