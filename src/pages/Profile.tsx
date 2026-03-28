import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Upload, Check, ArrowLeft } from "lucide-react";

import avatar1 from "@/assets/avatars/avatar-1.png";
import avatar2 from "@/assets/avatars/avatar-2.png";
import avatar3 from "@/assets/avatars/avatar-3.png";
import avatar4 from "@/assets/avatars/avatar-4.png";
import avatar5 from "@/assets/avatars/avatar-5.png";
import avatar6 from "@/assets/avatars/avatar-6.png";
import avatar7 from "@/assets/avatars/avatar-7.png";

const avatarOptions = [
  { id: "av1", src: avatar1, label: "Study Girl" },
  { id: "av2", src: avatar2, label: "Night Reader" },
  { id: "av3", src: avatar3, label: "Gamer" },
  { id: "av4", src: avatar4, label: "City Scholar" },
  { id: "av5", src: avatar5, label: "Focused Boy" },
  { id: "av6", src: avatar6, label: "Cozy Study" },
  { id: "av7", src: avatar7, label: "School Boy" },
];

const Profile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [college, setCollege] = useState("");
  const [userId, setUserId] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomAvatar(reader.result as string);
        setSelectedAvatar("custom");
      };
      reader.readAsDataURL(file);
    }
  };

  const currentAvatarSrc =
    selectedAvatar === "custom"
      ? customAvatar
      : avatarOptions.find((a) => a.id === selectedAvatar)?.src ?? null;

  const isFormValid = name.trim() && college.trim() && userId.trim() && selectedAvatar;

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{ backgroundColor: "hsl(80, 30%, 95%)" }}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      <div className="mx-auto max-w-md">
        {/* Back button */}
        <button
          onClick={() => navigate("/")}
          className="mb-6 flex items-center gap-2 text-warm-brown opacity-70 transition-opacity hover:opacity-100"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>

        {/* Header */}
        <h1
          className="mb-2 text-center text-3xl font-bold text-warm-brown"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          Set Up Your Profile
        </h1>
        <p
          className="mb-8 text-center text-warm-brown-light"
          style={{ fontFamily: "'Times New Roman', Times, serif", fontStyle: "italic" }}
        >
          Tell us a little about yourself
        </p>

        {/* Avatar preview */}
        <div className="mb-8 flex flex-col items-center">
          <div
            className="relative mb-3 h-28 w-28 overflow-hidden rounded-full border-4 shadow-lg"
            style={{ borderColor: "hsl(36, 70%, 50%)" }}
          >
            {currentAvatarSrc ? (
              <img
                src={currentAvatarSrc}
                alt="Selected avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-secondary">
                <Camera className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
          </div>
          <span
            className="text-sm text-warm-brown-light"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            Choose your avatar below
          </span>
        </div>

        {/* Form fields */}
        <div className="mb-8 space-y-5">
          {/* Name */}
          <div>
            <label
              className="mb-1.5 block text-sm font-semibold text-warm-brown"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full rounded-xl border-2 border-secondary bg-card px-4 py-3 text-foreground shadow-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            />
          </div>

          {/* College */}
          <div>
            <label
              className="mb-1.5 block text-sm font-semibold text-warm-brown"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              College
            </label>
            <input
              type="text"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              placeholder="Enter your college name"
              className="w-full rounded-xl border-2 border-secondary bg-card px-4 py-3 text-foreground shadow-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            />
          </div>

          {/* User ID */}
          <div>
            <label
              className="mb-1.5 block text-sm font-semibold text-warm-brown"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              User ID
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Choose a unique user ID"
              className="w-full rounded-xl border-2 border-secondary bg-card px-4 py-3 text-foreground shadow-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            />
          </div>
        </div>

        {/* Avatar selection */}
        <div className="mb-8">
          <label
            className="mb-3 block text-sm font-semibold text-warm-brown"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            Pick an Avatar
          </label>

          <div className="grid grid-cols-4 gap-3">
            {avatarOptions.map((av) => (
              <button
                key={av.id}
                onClick={() => {
                  setSelectedAvatar(av.id);
                  setCustomAvatar(null);
                }}
                className={`group relative overflow-hidden rounded-2xl border-3 transition-all duration-200 ${
                  selectedAvatar === av.id
                    ? "scale-105 border-primary shadow-lg ring-2 ring-primary/30"
                    : "border-secondary hover:border-primary/50 hover:shadow-md"
                }`}
              >
                <img
                  src={av.src}
                  alt={av.label}
                  className="aspect-square w-full object-cover"
                />
                {selectedAvatar === av.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/30">
                    <Check className="h-6 w-6 text-primary-foreground drop-shadow" />
                  </div>
                )}
              </button>
            ))}

            {/* Upload custom avatar */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`group relative flex aspect-square items-center justify-center rounded-2xl border-3 border-dashed transition-all duration-200 ${
                selectedAvatar === "custom"
                  ? "scale-105 border-primary shadow-lg ring-2 ring-primary/30"
                  : "border-secondary hover:border-primary/50 hover:shadow-md"
              }`}
              style={{ backgroundColor: "hsl(var(--card))" }}
            >
              {customAvatar ? (
                <>
                  <img
                    src={customAvatar}
                    alt="Custom avatar"
                    className="h-full w-full rounded-2xl object-cover"
                  />
                  {selectedAvatar === "custom" && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-primary/30">
                      <Check className="h-6 w-6 text-primary-foreground drop-shadow" />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary" />
                  <span
                    className="text-[10px] text-muted-foreground"
                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
                  >
                    Upload
                  </span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Save button */}
        <button
          disabled={!isFormValid}
          className="w-full rounded-full bg-primary px-10 py-3.5 text-lg font-semibold text-primary-foreground shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
          onClick={() => {
            // TODO: save profile data
          }}
        >
          Save Profile
        </button>
      </div>
    </div>
  );
};

export default Profile;
