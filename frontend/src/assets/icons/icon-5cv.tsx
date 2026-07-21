export const Icon5cv = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="gold5cv" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF3B0" />
          <stop offset="50%" stopColor="#FFD54A" />
          <stop offset="100%" stopColor="#E09A00" />
        </linearGradient>
      </defs>

      <circle
        cx="32"
        cy="32"
        r="29"
        fill="url(#gold5cv)"
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
        y="29"
        textAnchor="middle"
        fontFamily="Inter, Arial, sans-serif"
        fontSize="16"
        fontWeight="700"
        fill="#6B4300"
      >
        5
      </text>

      <text
        x="32"
        y="43"
        textAnchor="middle"
        fontFamily="Inter, Arial, sans-serif"
        fontSize="10"
        fontWeight="700"
        fill="#6B4300"
      >
        CV!
      </text>
    </svg>
  )
}
