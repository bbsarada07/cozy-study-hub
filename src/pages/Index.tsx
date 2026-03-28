import libraryBg from "@/assets/library-bg.png";
import logo from "@/assets/funtaskit-logo.png";

const Index = () => {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background image */}
      <img
        src={libraryBg}
        alt="Cozy library"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Warm overlay at 65% opacity */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "hsla(35, 30%, 95%, 0.65)" }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
        {/* Logo blended with background */}
        <img
          src={logo}
          alt="FunTaskIt Logo"
          className="w-44 mix-blend-multiply drop-shadow-sm"
        />

        {/* Welcome text */}
        <h1
          className="text-warm-brown text-4xl font-bold leading-tight sm:text-5xl"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          Welcome to FunTaskIt
        </h1>

        {/* Tagline */}
        <p
          className="text-warm-brown-light text-lg tracking-wide sm:text-xl"
          style={{ fontFamily: "'Times New Roman', Times, serif", fontStyle: "italic" }}
        >
          Load Light, Life Bright!
        </p>

        {/* CTA Button */}
        <button
          className="mt-4 rounded-full bg-primary px-10 py-3 text-lg font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105 hover:shadow-xl active:scale-95"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
          onClick={() => {}}
        >
          Get Started
        </button>
      </div>
    </div>
  );
};

export default Index;
