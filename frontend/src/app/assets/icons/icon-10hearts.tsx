export const Icon10Hearts = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="gold10h" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF3B0" />
          <stop offset="50%" stopColor="#FFD54A" />
          <stop offset="100%" stopColor="#E09A00" />
        </linearGradient>
        <linearGradient id="heart10h" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF8A9B" />
          <stop offset="100%" stopColor="#E53935" />
        </linearGradient>
      </defs>

      <circle
        cx="32"
        cy="32"
        r="29"
        fill="url(#gold10h)"
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
        y="30"
        textAnchor="middle"
        fontFamily="Inter, Arial, sans-serif"
        fontSize="18"
        fontWeight="700"
        fill="#6B4300"
      >
        10
      </text>

      <path
        d="M18 40.5c0-2.2 1.7-3.8 3.6-3.8 1.1 0 2.1.5 2.7 1.3.6-.8 1.6-1.3 2.7-1.3 1.9 0 3.6 1.6 3.6 3.8 0 3.2-4.1 5.8-6.3 7.1-2.2-1.3-6.3-3.9-6.3-7.1z"
        fill="url(#heart10h)"
      />
      <path
        d="M27.5 40.5c0-2.2 1.7-3.8 3.6-3.8 1.1 0 2.1.5 2.7 1.3.6-.8 1.6-1.3 2.7-1.3 1.9 0 3.6 1.6 3.6 3.8 0 3.2-4.1 5.8-6.3 7.1-2.2-1.3-6.3-3.9-6.3-7.1z"
        fill="url(#heart10h)"
      />
      <path
        d="M37 40.5c0-2.2 1.7-3.8 3.6-3.8 1.1 0 2.1.5 2.7 1.3.6-.8 1.6-1.3 2.7-1.3 1.9 0 3.6 1.6 3.6 3.8 0 3.2-4.1 5.8-6.3 7.1-2.2-1.3-6.3-3.9-6.3-7.1z"
        fill="url(#heart10h)"
      />
    </svg>
  );
};
