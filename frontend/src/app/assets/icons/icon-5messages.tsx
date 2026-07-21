export const Icon5Messages = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="gold5m" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF3B0" />
          <stop offset="50%" stopColor="#FFD54A" />
          <stop offset="100%" stopColor="#E09A00" />
        </linearGradient>
        <linearGradient id="msg5m" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#64B5F6" />
          <stop offset="100%" stopColor="#1565C0" />
        </linearGradient>
      </defs>

      <circle
        cx="32"
        cy="32"
        r="29"
        fill="url(#gold5m)"
        stroke="#B97A00"
        strokeWidth="3"
      />

      <circle
        cx="32"
        cy="32"
        r="24"
        fill="none"
        stroke="#FFF6D5"
        strokeWidth="1.5"
      />

      <text
        x="32"
        y="28"
        textAnchor="middle"
        fontFamily="Inter, Arial, sans-serif"
        fontSize="20"
        fontWeight="700"
        fill="#6B4300"
      >
        5
      </text>

      {/* Chat bubble */}
      <path
        d="M22 34h16c2.2 0 4 1.8 4 4v6c0 2.2-1.8 4-4 4H30l-4.5 3.5V48H22c-2.2 0-4-1.8-4-4v-6c0-2.2 1.8-4 4-4z"
        fill="url(#msg5m)"
      />
      <circle cx="27" cy="41" r="1.4" fill="#FFF6D5" />
      <circle cx="32" cy="41" r="1.4" fill="#FFF6D5" />
      <circle cx="37" cy="41" r="1.4" fill="#FFF6D5" />
    </svg>
  );
};
