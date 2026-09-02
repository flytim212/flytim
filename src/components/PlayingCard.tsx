/** 纯 CSS 扑克牌组件：白底圆角、左上角 rank+花色、♠♣黑 ♥♦红、暗红斜纹牌背 */
import { Card, RANK_CHARS, SUIT_COLORS, SUIT_SYMBOLS } from '../core/cards'

interface PlayingCardProps {
  card: Card | null
  /** 牌面宽度（px），默认 44 */
  size?: number
  /** 空牌位占位符内容（card 为 null 时显示） */
  placeholder?: string
  onClick?: () => void
}

const RANK_DISPLAY: Record<number, string> = {
  14: 'A', 13: 'K', 12: 'Q', 11: 'J', 10: 'T',
}

export default function PlayingCard({ card, size = 44, placeholder = '+', onClick }: PlayingCardProps) {
  if (!card) {
    return (
      <button
        type="button"
        className="poker-slot"
        style={{ ['--pc-size' as string]: `${size}px`, width: size }}
        onClick={onClick}
        aria-label="选择牌"
      >
        {placeholder}
      </button>
    )
  }

  const rankText = RANK_DISPLAY[card.r] ?? RANK_CHARS[card.r - 2]
  const colorCls = SUIT_COLORS[card.s] === 'red' ? 'pc-red' : 'pc-black'

  return (
    <button
      type="button"
      className={`poker-card ${colorCls}`}
      style={{ ['--pc-size' as string]: `${size}px`, width: size }}
      onClick={onClick}
      aria-label={rankText + SUIT_SYMBOLS[card.s]}
    >
      <span className="pc-corner">
        <span>{rankText}</span>
        <span>{SUIT_SYMBOLS[card.s]}</span>
      </span>
      <span className="pc-center">{SUIT_SYMBOLS[card.s]}</span>
    </button>
  )
}

/** 牌背（装饰用） */
export function CardBack({ size = 44 }: { size?: number }) {
  return <div className="poker-card pc-back" style={{ ['--pc-size' as string]: `${size}px`, width: size }} />
}
